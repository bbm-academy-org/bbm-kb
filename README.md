# bbm-kb — база знаний BBM

Командная база знаний холдинга BBM: мастер куррированных знаний и SSOT-ядро.
Рендер — [Fumadocs](https://fumadocs.dev) (Next.js, статический экспорт), публикация — kb.bbm.academy.
Дизайн: `bbm/docs/superpowers/specs/2026-07-10-bbm-kb-design.md`. Рабочий язык — русский.

## Структура

```
ssot/                  # КАНОН (authority: canonical, machine-readable)
├── facts/             #   team.yaml, mission.md, company.yaml, services.yaml
├── glossary/          #   канонические термины, файл = термин
└── abbreviations.yaml #   реестр аббревиатур
content/               # НАРРАТИВ (authority: narrative) — страницы сайта
├── company/  strategy/  models/  projects/
├── ecosystem/  processes/  white-papers/
app/, lib/, …          # Fumadocs-приложение
```

## Правила SSOT (обязательны для людей и AI-агентов)

1. **Один факт — один дом.** Канонические факты (команда, миссия, сущности,
   сервисы, термины, аббревиатуры) живут только в `ssot/`.
2. **Нарратив ссылается, не копирует.** Страницы `content/` ссылаются на
   `ssot/`; переопределять или дублировать канонические факты в нарративе нельзя.
3. **Конфликт → канон перевешивает.** При расхождении `content/` и `ssot/`
   истинна версия из `ssot/`; нарратив исправляется.
4. **Raw-транскрипты в KB не попадают никогда.** Они остаются в рабочем репо
   `bbm` (gitignored). Сюда — только куррированные знания.
5. **Правки — только через PR.** Серверной branch protection нет (тарифное
   ограничение: приватный репо на GitHub Free; включим при переходе орги на
   Team). Защита = конвенция «только PR» + локальный pre-push hook
   (`.githooks/`) + CI-guard (job `pr-guard` краснеет на прямом пуше в main).
   И люди, и AI-агенты вносят изменения через pull request. Ревью не
   обязательно (команда из 2 человек).
6. **Секреты в репо не попадают** — ни в файлы, ни в CI.

## Клонирование и настройка

```bash
git clone https://github.com/bbm-academy-org/bbm-kb.git
cd bbm-kb
git config core.hooksPath .githooks   # pre-push hook: блок прямого пуша в main
npm install                           # postinstall прогоняет fumadocs-mdx
```

Аварийный обход хука (только для bootstrap/инцидентов):
`KB_ALLOW_MAIN_PUSH=1 git push …`

## Разработка

```bash
npm run dev        # локальный дев-сервер
npm run build      # статический экспорт в out/
```

CI (GitHub Actions) собирает статический экспорт на каждый PR и push в `main`.
