#!/usr/bin/env node
// Пропагация SSOT → Payload CMS (cms.bbm.academy), BBMP-102, спека
// docs/superpowers/specs/2026-07-10-bbm-kb-design.md §4 (репо bbm):
// канонические поля живут в ssot/facts/*, Payload — editorial-обёртка
// (реализация canonical_term_ref из D-017). Скрипт идемпотентен:
// upsert по стабильному ключу (SSOT id + alias-map), запись только при diff.
//
// Канонические поля (перезаписываются из SSOT, конфликт → канон перевешивает):
//   team.<id>:            name, role
//   publicProjects.<id>:  name, description
//   globals/philosophy:   mission (из ssot/facts/mission.md → frontmatter.short)
// Остальные поля Payload (bio, photo, tagline, metrics, …) — editorial,
// скрипт их не трогает.
//
// Env:
//   PAYLOAD_URL      — база Payload (default https://cms.bbm.academy)
//   PAYLOAD_API_KEY  — API-ключ auth-коллекции users (header
//                      `Authorization: users API-Key <key>`); без него — только DRY_RUN
//   DRY_RUN=1        — читать и показывать diff, ничего не писать
//   PAYLOAD_CREATE_MISSING=1 — создавать отсутствующие записи (по умолчанию
//                      выключено: голая запись без editorial-полей может
//                      сломать вёрстку; отсутствие записи = провал джоба)
//
// Payload: 3.x, drafts включены. Пишем с ?draft=true (обновляем черновик,
// публикация остаётся за editorial-flow: /admin → publish → POST /api/publish-site).
// TODO(Антон): решить, должна ли пропагация авто-публиковать (сейчас — нет).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SSOT = (p) => path.join(ROOT, 'ssot', p);

const BASE = (process.env.PAYLOAD_URL ?? 'https://cms.bbm.academy').replace(/\/+$/, '');
const API_KEY = process.env.PAYLOAD_API_KEY ?? '';
const DRY_RUN = process.env.DRY_RUN === '1' || !API_KEY;
const CREATE_MISSING = process.env.PAYLOAD_CREATE_MISSING === '1';

if (!API_KEY) {
  console.log('::notice::PAYLOAD_API_KEY не задан — принудительный DRY_RUN (только diff, без записи).');
}

// Alias-map: SSOT id → id записи в Payload, когда они исторически разошлись.
// TODO(Антон): привести id в Payload к SSOT-slug'ам (igor → igor-pirogov,
// bbm-academy → bbm) и убрать алиасы; до тех пор — маппинг здесь.
const TEAM_ID_ALIASES = { 'igor-pirogov': 'igor' };
const PROJECT_ID_ALIASES = { bbm: 'bbm-academy' };

let failures = 0;
let writes = 0;

// Auth и на GET тоже: drafts анонимно не читаются, а сравнивать надо
// именно draft-версию (иначе write-режим будет писать «изменения»
// на каждый прогон, сравнивая канон с published) — ревью PR#2, major #1.
function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (API_KEY) h.Authorization = `users API-Key ${API_KEY}`;
  return h;
}

async function api(method, pathname, body) {
  const url = `${BASE}${pathname}`;
  const res = await fetch(url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000), // не висеть на недоступном cms
  });
  return res;
}

// diff только по каноническим полям; null/undefined в SSOT поле не перезаписывает
function canonicalDiff(current, desired) {
  const patch = {};
  for (const [k, v] of Object.entries(desired)) {
    if (v == null) continue;
    if ((current?.[k] ?? '') !== v) patch[k] = v;
  }
  return patch;
}

async function upsertDoc(collection, ssotId, payloadId, desired) {
  const label = `${collection}/${payloadId}` + (payloadId !== ssotId ? ` (ssot: ${ssotId})` : '');
  const got = await api('GET', `/api/${collection}/${payloadId}?depth=0&draft=true&locale=ru`);
  if (got.status === 404) {
    if (!CREATE_MISSING) {
      // SSOT-факт без записи в Payload = непропагированный канон → провал
      // джоба и алёрт (спека §7: тихое расхождение недопустимо), не warning.
      failures++;
      console.log(`::error::${label}: записи нет в Payload — SSOT-канон не пропагирован. Создать запись в /admin (с editorial-полями) или включить PAYLOAD_CREATE_MISSING=1.`);
      return;
    }
    if (DRY_RUN) { console.log(`[dry-run] CREATE ${label}: ${JSON.stringify(desired)}`); return; }
    const res = await api('POST', `/api/${collection}?draft=true&locale=ru`, { id: payloadId, ...desired });
    if (!res.ok) { failures++; console.log(`::error::${label}: create failed ${res.status}: ${(await res.text()).slice(0, 300)}`); return; }
    writes++; console.log(`CREATED ${label}`);
    return;
  }
  if (!got.ok) { failures++; console.log(`::error::${label}: read failed ${got.status}`); return; }
  const current = await got.json();
  const patch = canonicalDiff(current, desired);
  if (Object.keys(patch).length === 0) { console.log(`ok ${label}: канон совпадает, изменений нет`); return; }
  if (DRY_RUN) { console.log(`[dry-run] PATCH ${label}: ${JSON.stringify(patch)}`); return; }
  const res = await api('PATCH', `/api/${collection}/${payloadId}?draft=true&locale=ru`, patch);
  if (!res.ok) { failures++; console.log(`::error::${label}: update failed ${res.status}: ${(await res.text()).slice(0, 300)}`); return; }
  writes++; console.log(`UPDATED ${label}: ${JSON.stringify(patch)}`);
}

// Payload-записи, которых нет в SSOT, — не удаляем (editorial-обёртка может
// содержать презентационные записи), но репортим drift.
async function reportDrift(collection, ssotPayloadIds) {
  // Без draft=true: list с draft=true отдаёт ТОЛЬКО документы, у которых есть
  // draft-версия, — записи без черновика (published-only) выпадали из выборки
  // и drift по ним молчал (тихое расхождение, запрещено спекой §7; фикс
  // 2026-07-12). Обычный list видит все записи коллекции (published и
  // never-published), а drift'у нужны только id — сравнение канонических
  // полей живёт в upsertDoc и по-прежнему идёт по draft-версии.
  for (let page = 1, more = true; more; page++) {
    const res = await api('GET', `/api/${collection}?limit=100&page=${page}&depth=0&locale=ru`);
    if (!res.ok) { console.log(`::warning::${collection}: не смог прочитать список для drift-репорта (${res.status})`); return; }
    const data = await res.json();
    for (const d of data.docs ?? []) {
      if (!ssotPayloadIds.has(d.id)) {
        console.log(`::warning::drift: ${collection}/${d.id} есть в Payload, но отсутствует в ssot/ — источник этой записи не канонизирован (TODO(Антон): завести в SSOT или пометить как editorial-only).`);
      }
    }
    more = Boolean(data.hasNextPage);
  }
}

function readMission() {
  const raw = fs.readFileSync(SSOT('facts/mission.md'), 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? parseYaml(m[1]) : null;
  if (!fm || typeof fm.short !== 'string' || !fm.short.trim()) {
    // битый/пустой frontmatter не должен маскироваться под «миссия совпадает»
    throw new Error('ssot/facts/mission.md: frontmatter не распарсен или поле short пустое — канон миссии нечитаем.');
  }
  return fm;
}

async function main() {
  console.log(`Payload: ${BASE} · режим: ${DRY_RUN ? 'DRY_RUN' : 'write'}`);

  // --- team.yaml → collection team ---
  const team = parseYaml(fs.readFileSync(SSOT('facts/team.yaml'), 'utf8')).members ?? [];
  const teamIds = new Set();
  for (const m of team) {
    const pid = TEAM_ID_ALIASES[m.id] ?? m.id;
    teamIds.add(pid);
    await upsertDoc('team', m.id, pid, { name: m.name, role: m.role });
  }
  await reportDrift('team', teamIds);

  // --- company.yaml → collection publicProjects ---
  const entities = parseYaml(fs.readFileSync(SSOT('facts/company.yaml'), 'utf8')).entities ?? [];
  const projIds = new Set();
  for (const e of entities) {
    const pid = PROJECT_ID_ALIASES[e.id] ?? e.id;
    projIds.add(pid);
    await upsertDoc('publicProjects', e.id, pid, { name: e.name, description: e.description });
  }
  await reportDrift('publicProjects', projIds);

  // --- mission.md → global philosophy.mission ---
  const mission = readMission();
  const got = await api('GET', '/api/globals/philosophy?depth=0&draft=true&locale=ru');
  if (!got.ok) { failures++; console.log(`::error::globals/philosophy: read failed ${got.status}`); }
  else {
    const cur = await got.json();
    const patch = canonicalDiff(cur, { mission: mission.short.trim() });
    if (Object.keys(patch).length === 0) console.log('ok globals/philosophy: миссия совпадает');
    else if (DRY_RUN) console.log(`[dry-run] PATCH globals/philosophy: ${JSON.stringify(patch)}`);
    else {
      const res = await api('POST', '/api/globals/philosophy?draft=true&locale=ru', patch);
      if (!res.ok) { failures++; console.log(`::error::globals/philosophy: update failed ${res.status}`); }
      else { writes++; console.log(`UPDATED globals/philosophy: ${JSON.stringify(patch)}`); }
    }
  }

  console.log(`Итог: writes=${writes}, failures=${failures}${DRY_RUN ? ' (dry-run, записи не выполнялись)' : ''}`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => { console.log(`::error::${e?.stack ?? e}`); process.exit(1); });
