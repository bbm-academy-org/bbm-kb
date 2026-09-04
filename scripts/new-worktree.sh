#!/usr/bin/env bash
#
# Создаёт изолированный worktree под одну задачу: своя рабочая директория,
# своя ветка от origin/main, свободный порт дев-сервера, готовые зависимости.
#
# Зачем это нужно и какие правила действуют — docs/parallel-work.md.
#
#   scripts/new-worktree.sh <slug> [слот]
#
# Примеры:
#   scripts/new-worktree.sh bbmp-241-strategy-pages
#   scripts/new-worktree.sh bbmp-241-strategy-pages 3     # слот вручную
#
# Переменные окружения:
#   KB_WORKTREE_ROOT  Каталог, где создаются worktree. По умолчанию — рядом
#                     с репозиторием. Если репо лежит в iCloud/Dropbox, задайте
#                     путь вне синхронизируемой папки, иначе node_modules
#                     (десятки тысяч файлов) уедет в синхронизацию:
#                       export KB_WORKTREE_ROOT="$HOME/bbm-kb-worktrees"
#   KB_PORT_BASE      База нумерации портов (по умолчанию 3000).
#   KB_PORT_STEP      Шаг между слотами (по умолчанию 10).
#
set -euo pipefail

PORT_BASE="${KB_PORT_BASE:-3000}"
PORT_STEP="${KB_PORT_STEP:-10}"
MAX_SLOT=9

die() { printf 'new-worktree: %s\n' "$*" >&2; exit 1; }

# Справка = шапка этого файла: один текст, который не разъедется с кодом.
usage() {
  awk 'NR>2 && /^#/ { sub(/^# ?/, ""); print; next } NR>2 { exit }' "$0" >&2
  exit 2
}

[ $# -ge 1 ] || usage
case "$1" in -h|--help|'') usage ;; esac

SLUG="$1"
printf '%s' "$SLUG" | grep -Eq '^[a-z0-9][a-z0-9-]*$' \
  || die "slug «$SLUG» — допустимы строчные латинские буквы, цифры и дефис (например bbmp-241-strategy-pages)"

command -v git >/dev/null || die "git не найден"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" \
  || die "запускать из клона bbm-kb"
cd "$REPO_ROOT"

WORKTREE_ROOT="${KB_WORKTREE_ROOT:-$(dirname "$REPO_ROOT")}"
DIR="$WORKTREE_ROOT/bbm-kb-$SLUG"
BRANCH="feat/$SLUG"

# Порт слота свободен? lsof есть не везде (репо правится и с Windows) —
# без него проверку пропускаем, конфликт вылезет при запуске дев-сервера.
port_free() {
  command -v lsof >/dev/null || return 0
  ! lsof -nP -iTCP:"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Порты, уже розданные существующим worktree. Читаем из их .env.local, а не
# из списка слушающих сокетов: worktree может существовать с погашенным
# дев-сервером — его слот всё равно занят.
ports_taken() {
  git worktree list --porcelain \
    | sed -n 's/^worktree //p' \
    | while IFS= read -r wt; do
        [ -f "$wt/.env.local" ] || continue
        sed -n 's/^PORT=\([0-9]\{1,\}\).*/\1/p' "$wt/.env.local"
      done
}

# Слот 0 занят основным клоном, поэтому нумерация с 1.
pick_slot() {
  local slot port taken
  taken="$(ports_taken)"
  for slot in $(seq 1 "$MAX_SLOT"); do
    port=$(( PORT_BASE + slot * PORT_STEP ))
    printf '%s\n' "$taken" | grep -qx "$port" && continue
    if port_free "$port"; then
      printf '%s' "$slot"
      return 0
    fi
  done
  return 1
}

if [ $# -ge 2 ]; then
  SLOT="$2"
  printf '%s' "$SLOT" | grep -Eq '^[1-9]$' || die "слот должен быть числом 1..$MAX_SLOT"
  # Явно заданный слот проверяем так же строго, как выбранный автоматически.
  ports_taken | grep -qx "$(( PORT_BASE + SLOT * PORT_STEP ))" \
    && die "слот $SLOT (порт $(( PORT_BASE + SLOT * PORT_STEP ))) уже занят другим worktree — см. git worktree list"
else
  SLOT="$(pick_slot)" || die "все слоты 1..$MAX_SLOT заняты; освободите порты (docs/parallel-work.md, «Осиротевшие процессы»)"
fi

PORT=$(( PORT_BASE + SLOT * PORT_STEP ))

port_free "$PORT" || die "порт $PORT занят. Кто держит: lsof -nP -iTCP:$PORT -sTCP:LISTEN"
[ -e "$DIR" ] && die "каталог уже существует: $DIR"
git show-ref --verify --quiet "refs/heads/$BRANCH" \
  && die "ветка $BRANCH уже существует (git worktree list / git branch)"

echo "→ git fetch origin main"
git fetch --quiet origin main

echo "→ worktree $DIR (ветка $BRANCH от origin/main)"
mkdir -p "$WORKTREE_ROOT"
git worktree add --quiet "$DIR" -b "$BRANCH" origin/main

# .env.local в .gitignore — в репозиторий не попадёт.
printf 'PORT=%s\n' "$PORT" > "$DIR/.env.local"

echo "→ npm ci (postinstall прогонит fumadocs-mdx)"
( cd "$DIR" && npm ci )

cat <<INFO

Готово.

  Каталог   $DIR
  Ветка     $BRANCH
  Порт      $PORT   (PORT в .env.local, next dev подхватит сам)

  cd "$DIR" && npm run dev

Первым сообщением оркестратору этой задачи передайте:
  «Работаешь только в $DIR, ветка $BRANCH, дев-сервер на порту $PORT.
   Соседние каталоги bbm-kb-* и их порты не трогаешь.
   Правила параллельной работы — docs/parallel-work.md.»

После мёржа PR прибрать:
  git worktree remove "$DIR" && git branch -d "$BRANCH"
INFO
