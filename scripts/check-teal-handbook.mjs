/** Acceptance checks against the exported Fumadocs index and actual static search client. */
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHandbookSearchClient } from '../lib/handbook-search.ts';
import { oramaStaticClient } from 'fumadocs-core/search/client/orama-static';

const root = process.cwd();
const directory = path.join(root, 'content/teal-practices');
const pages = (await readdir(directory)).filter((name) => name.endsWith('.mdx'));
const nav = JSON.parse(await readFile(path.join(directory, 'meta.json'), 'utf8'));
for (const entry of nav.pages.filter((name) => !name.startsWith('---'))) {
  assert(pages.includes(`${entry}.mdx`), `Navigation target missing: ${entry}`);
}
assert.equal(new Set(nav.pages.filter((name) => !name.startsWith('---'))).size, pages.length,
  'Every handbook page must be reachable in the sidebar');

let links = 0;
for (const file of pages) {
  const text = await readFile(path.join(directory, file), 'utf8');
  assert(/^---\r?\ntitle: /.test(text), `Missing title: ${file}`);
  if (text.includes('<Steps>')) {
    for (const heading of ['Когда использовать', 'Основа и происхождение', 'Шаблон для копирования',
      'Пример применения', 'Проверка результата', 'Ограничения и частые ошибки', 'Искать также', 'Источник']) {
      assert(text.includes(`## ${heading}`), `${file}: missing ${heading}`);
    }
  }
  const destinations = [...text.matchAll(/\]\((\/[^)\s]+)\)|href="(\/[^"\s]+)"/g)]
    .map((match) => (match[1] ?? match[2]).split('#')[0]);
  for (const destination of destinations) {
    const relative = destination.replace(/^\//, '');
    const candidates = [path.join(root, 'content', `${relative}.mdx`),
      path.join(root, 'content', relative, 'index.mdx')];
    const found = await Promise.all(candidates.map((candidate) => stat(candidate).then(() => true, () => false)));
    assert(found.some(Boolean), `${file}: broken link ${destination}`);
    const exported = [path.join(root, 'out', `${relative}.html`),
      path.join(root, 'out', relative, 'index.html')];
    const built = await Promise.all(exported.map((candidate) => stat(candidate).then(() => true, () => false)));
    assert(built.some(Boolean), `${file}: target not exported ${destination}; run npm run build first`);
    links++;
  }
}

const indexCandidates = ['out/api/search', 'out/api/search.json'];
let raw;
for (const candidate of indexCandidates) {
  try { raw = await readFile(path.join(root, candidate), 'utf8'); break; } catch { /* next candidate */ }
}
assert(raw, 'Search export missing; run npm run build first');
JSON.parse(raw);
// Same client and options as components/providers.tsx. Replace only transport.
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(raw, { headers: { 'Content-Type': 'application/json' } });
const client = createHandbookSearchClient({ from: 'handbook-acceptance-export' });
const cases = [
  ['деньги', 'compensation'], ['оплата', 'compensation'], ['з/п', 'compensation'],
  ['зп', 'compensation'], ['з.п.', 'compensation'], ['зарплата', 'compensation'],
  ['зарплаты', 'compensation'], ['оклад', 'compensation'], ['повышение', 'compensation'],
  ['получка', 'compensation'], ['salary', 'compensation'], [' З / П ', 'compensation'],
  ['сколько платить', 'compensation'], ['премия', 'profit-sharing'],
  ['закупка', 'purchases'], ['бюджет', 'budgeting'], ['конфликт', 'conflicts'],
  ['медиация', 'conflicts'], ['CLOU', 'roles'], ['перегрузка', 'role-market'],
  ['три вопроса', 'feedback'], ['Intervisie', 'peer-coaching'], ['онбординг', 'onboarding'],
  ['найм', 'hiring'], ['отпуск', 'flexible-work'], ['увольнение', 'exit'],
  ['фасилитация', 'meetings'], ['пустой стул', 'purpose'], ['S3', 's3-consent'],
  ['Cobudget', 'cobudget'], ['Patagonia', 'stewardship'],
];
try {
  for (const [query, slug] of cases) {
    const results = await client.search(query);
    const urls = [...new Set(results.filter((result) => result.type === 'page').map((result) => result.url.split('#')[0]))];
    assert(urls.slice(0, 10).includes(`/teal-practices/${slug}`),
      `${JSON.stringify(query)} should find ${slug} in the first 10 pages; got ${urls.join(', ')}`);
    console.log(`${query} → ${slug} (page rank ${urls.indexOf(`/teal-practices/${slug}`) + 1})`);
  }
  for (const query of ['вебинар', 'BBM']) {
    const results = await client.search(query);
    assert(results.some((result) => !result.url.startsWith('/teal-practices')),
      `Existing KB search regressed: ${query}`);
  }
  const standard = oramaStaticClient({ from: 'handbook-acceptance-export' });
  for (const query of ['деньги в бюджете', 'ошибка в тексте', 'з/п ведомость']) {
    assert.deepEqual(await client.search(query), await standard.search(query),
      `A longer query must keep normal full-text search: ${query}`);
  }
  const scoped = createHandbookSearchClient({ from: 'handbook-acceptance-export', tag: 'teal-practices' });
  for (const query of ['деньги', 'з/п', 'конфликт', 'S3']) {
    const results = await scoped.search(query);
    assert(results.length > 0, `Handbook filter returned nothing: ${query}`);
    assert(results.every((result) => result.url.startsWith('/teal-practices')),
      `Handbook filter leaked another section: ${query}`);
  }
  const absentTag = createHandbookSearchClient({ from: 'handbook-acceptance-export', tag: 'not-a-real-tag' });
  assert.deepEqual(await absentTag.search('з/п'), [], 'Shortcut must not fabricate a filtered result');
} finally {
  globalThis.fetch = originalFetch;
}
console.log(`OK: ${pages.length} handbook pages, ${links} internal links, ${cases.length} real search queries; index ${(Buffer.byteLength(raw) / 1024 / 1024).toFixed(2)} MiB.`);
