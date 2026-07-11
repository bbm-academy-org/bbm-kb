# Пропагация SSOT: CI → Payload (bbm.academy) + Hermes-skill (BBMP-102)

Реализация §4 спеки `bbm/docs/superpowers/specs/2026-07-10-bbm-kb-design.md`:
канон живёт в `ssot/`, потребители получают его автоматически. Провал
пропагации = алёрт (тихое расхождение недопустимо, §7).

## Схема

| Потребитель | Механизм | Статус |
|---|---|---|
| KB-сайт | страницы генерируются на билде из `ssot/` (`lib/ssot.ts`, BBMP-99) | работает |
| Публичный сайт (Payload, `cms.bbm.academy`) | `.github/workflows/propagate-payload.yml` → `scripts/propagate-payload.mjs`: push в main с изменением `ssot/facts/*` → upsert канонических полей через REST | ждёт секрет `PAYLOAD_API_KEY` (до этого — DRY_RUN) |
| Hermes (@bbmka) | скилл `hermes-skills/bbm-ssot/` — ответы о команде/миссии/терминах только из `ssot/` с источником | ждёт `GITHUB_TOKEN` на хосте + установку скилла |

## Payload (факт на 2026-07-11)

- Payload 3.85.1 задеплоен: `https://cms.bbm.academy` (хост portal-prod-tw, репо `bbm-academy-org/bbm-portal`). Read REST публичный, write — `Authorization: users API-Key <key>`.
- Канонические поля (перезаписываются из SSOT): `team.{name,role}`, `publicProjects.{name,description}`, `globals/philosophy.mission`. Editorial-поля (bio, photo, tagline, metrics, …) не трогаются.
- Идемпотентность: upsert по SSOT id; alias-map расхождений (`igor-pirogov`→`igor`, `bbm`→`bbm-academy`) — в начале `scripts/propagate-payload.mjs`.
- Пишем черновик (`?draft=true`); публикация — за editorial-flow (`/admin` → publish → `POST /api/publish-site`). TODO(Антон): решить про авто-публикацию.
- Записи Payload вне SSOT (`team/maksim-a`, `publicProjects/otcy-i-deti`, `publicProjects/byt-dobru`) не удаляются, репортятся drift-warning'ом. TODO(Антон): канонизировать в SSOT или пометить editorial-only.
- SSOT-факт без записи в Payload = красный джоб + алёрт (не warning): непропагированный канон — то самое тихое расхождение из §7.
- TODO(Антон) из ревью PR#2: (1) подтвердить каноничность `publicProjects.description` — в Payload там сейчас editorial-текст «проблемы» проекта, SSOT перезапишет его определением сущности из `company.yaml`; (2) `team.role` в SSOT на EN («Tech Lead / System Architect»), на RU-сайте роли были по-русски — решить язык канона ролей.

### Включение записи (TODO-хост / TODO(Антон))

1. `https://cms.bbm.academy/admin` → Users → создать `ssot-sync@bbm.academy` (или взять существующего) → «Enable API Key» → скопировать ключ.
2. `gh secret set PAYLOAD_API_KEY -R bbm-academy-org/bbm-kb` (значение — из буфера, не в чат/файлы).
3. `gh secret set MM_WEBHOOK_BBM -R bbm-academy-org/bbm-kb` — incoming webhook `chat.bbm.academy` канала BBM (мастер — `bbm/infra/plane/notes.md` §Mattermost; тот же, что `MM_WEBHOOK_BBM` в `bbm/infra/monitoring`).
4. Проверка: Actions → `propagate-payload` → Run workflow (сначала с `dry_run=true`).

Пока секрета нет, джоб работает в DRY_RUN (diff в лог, exit 0) — расхождение видно, но не чинится.

## Hermes (факт на 2026-07-11)

- Хост `hermes-prod-tw` (94.198.221.20, Timeweb kz-1), деплой-канон — `bbm/infra/hermes/`. Скиллы ставятся в рантайме на volume: `hermes skills install <owner>/<repo>/<path>`.
- GitHub-токена в env бота нет → приватный `bbm-kb` ему пока недоступен.

### Включение скилла (TODO-хост, выполняет Антон)

1. TODO(Антон): создать fine-grained PAT «hermes-bbm-kb», доступ только к `bbm-academy-org/bbm-kb`, права `Contents: read` (для Phase-3 PR-правок: `Contents: read/write` + `Pull requests: read/write`).
2. На хосте (значение токена вводится на хосте, не в чат). Канон путей —
   `bbm/infra/hermes/README.md`; `.env` лежит рядом с `compose.yml` в
   каталоге деплоя:
   ```bash
   ssh hermes-prod-tw
   cd <каталог деплоя hermes>   # см. README; там compose.yml и .env
   nano .env                    # добавить строку GITHUB_TOKEN=<PAT>
   docker compose up -d         # перечитать env
   ```
3. Установить скилл:
   ```bash
   docker exec -e HOME=/opt/data hermes /command/s6-setuidgid hermes \
     hermes skills install bbm-academy-org/bbm-kb/hermes-skills/bbm-ssot --force
   ```
4. Smoke: в Mattermost спросить `@bbmka кто у нас в команде?` — ответ должен совпадать с `ssot/facts/team.yaml` (active-члены) и содержать строку «Источник: bbm-kb/ssot/facts/team.yaml @ <hash>».

## Demo-тест пропагации (end-to-end)

1. Ветка от main: правка `ssot/facts/team.yaml` (например, уточнить `role` у одного члена). PR → merge.
2. **KB**: job `build` зелёный; в артефакте `kb-static-export` страница «Команда» содержит новую роль (после деплоя kb.bbm.academy — проверять по URL).
3. **Payload**: job `propagate-payload` зелёный, в логе `UPDATED team/<id>`; проверка: `curl -s "https://cms.bbm.academy/api/team/<id>?draft=true&depth=0" -H "Authorization: users API-Key <key>"` → поле `role` новое. (Без ключа и до публикации черновик снаружи не виден.)
4. **Hermes**: `@bbmka кто у нас в команде?` → роль новая, источник указан.
5. Негативный тест алёрта: Run workflow с заведомо сломанным `PAYLOAD_URL`? Нет — проще: временно отозвать API-ключ → джоб красный → в канале BBM сообщение «SSOT-пропагация в Payload упала».

Прогнано 2026-07-11 (без секретов): шаг 3 в DRY_RUN против живого cms — diff корректный, идемпотентность подтверждена (`ok … канон совпадает` для philosophy); шаги с ключом/Hermes — после TODO-хост выше.
