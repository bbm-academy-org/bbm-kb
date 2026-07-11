---
name: bbm-ssot
description: "Канонические факты BBM (команда, миссия, сущности, сервисы, глоссарий, аббревиатуры): отвечать ТОЛЬКО из bbm-kb/ssot/ с указанием источника."
version: 1.0.0
author: BBM (BBMP-102)
license: UNLICENSED
platforms: [linux]
metadata:
  hermes:
    tags: [BBM, SSOT, Knowledge-Base, Team, Glossary]
    related_skills: [github-auth]
---

# BBM SSOT — канонические факты

Единственный источник истины (SSOT) о команде, миссии, сущностях холдинга,
сервисах/инфраструктуре, терминах и аббревиатурах BBM — каталог `ssot/`
приватного репо `bbm-academy-org/bbm-kb` (спека bbm-kb-design §4, репо `bbm`:
`docs/superpowers/specs/2026-07-10-bbm-kb-design.md`).

## Правило (обязательное)

Когда вопрос касается:
- **команды** («кто у нас в команде», роли, кто за что отвечает) → `ssot/facts/team.yaml`
- **миссии / эволюционной цели** → `ssot/facts/mission.md`
- **сущностей холдинга** (BBM, Doctor.School, OrthoBioSchool, BBM Energy) → `ssot/facts/company.yaml`
- **сервисов, хостов, доменов, репо** → `ssot/facts/services.yaml`
- **терминов бирюзовой модели** (Circle, Role, Contribution, …) → `ssot/glossary/<term>.md`
- **аббревиатур и chain-notation** → `ssot/abbreviations.yaml`

то:

1. **Сначала обнови локальную копию**: выполни `scripts/kb-pull.sh` (из этого скилла).
2. **Отвечай только из файлов `ssot/`** — не из памяти модели, не из чата,
   не из других документов. Если файл и память расходятся — прав файл.
3. **Всегда указывай источник** в ответе, в формате:
   `Источник: bbm-kb/ssot/facts/team.yaml @ <короткий commit-hash>`
   (hash: `git -C "$KB_DIR" rev-parse --short HEAD`).
4. Если клон недоступен (нет токена, нет сети, скрипт упал) — **явно скажи,
   что канон недоступен, и не отвечай по памяти**. Не выдумывай факты.
5. В `team.yaml` записи имеют `status: active|inactive` — в ответ о текущей
   команде включай только `active`.
6. Поля с пометкой `TODO(Антон)` передавай как «не подтверждено».

## Правки канона

Сам канон бот НЕ правит напрямую. Если пользователь просит изменить факт
(новый член команды, смена роли): создай ветку в клоне, внеси правку в
соответствующий `ssot/`-файл, открой PR в `bbm-academy-org/bbm-kb` и дай
ссылку в чат — мержит человек (Phase 3 KB, спека hermes-team-agent-design
§4.4: markdown в git, правки бота через PR; core-доки — только через PR).

## Механика

- Локальный клон: `$KB_DIR` (по умолчанию `$HOME/bbm-kb`, на volume `/data`).
- Доступ: репо приватное; нужен `GITHUB_TOKEN` в env бота (`~/.hermes/.env`)
  с правом `contents:read` (для PR — `contents:write, pull_requests:write`)
  на `bbm-academy-org/bbm-kb`. Скрипт не сохраняет токен в `.git/config`.
- Пропагация тех же фактов в Payload (cms.bbm.academy) — CI-джоб
  `propagate-payload` в этом же репо; расхождение KB↔сайт = баг, репортить.

## Пример

Вопрос: «кто у нас в команде?» → `scripts/kb-pull.sh` → прочитать
`$KB_DIR/ssot/facts/team.yaml` → перечислить `members` со `status: active`
(имя, роль) → строка «Источник: bbm-kb/ssot/facts/team.yaml @ abc1234».
