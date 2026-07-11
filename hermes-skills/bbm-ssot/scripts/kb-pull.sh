#!/bin/sh
# bbm-ssot skill: клон/обновление приватного репо bbm-academy-org/bbm-kb (BBMP-102).
# Требует GITHUB_TOKEN (fine-grained PAT, contents:read на bbm-kb) в env бота.
# Токен передаётся через одноразовый credential.helper и НЕ сохраняется
# в .git/config / credential store.
set -eu

KB_DIR="${KB_DIR:-$HOME/bbm-kb}"
REPO_URL="https://github.com/bbm-academy-org/bbm-kb.git"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN не задан — приватный bbm-kb недоступен. Канон SSOT прочитать нельзя." >&2
  echo "Хост-процедура: добавить GITHUB_TOKEN в compose .env деплоя Hermes (канон bbm/infra/hermes/; см. bbm-kb/docs/ssot-propagation.md)." >&2
  exit 2
fi

# helper отдаёт креды из env на время одной команды
CRED_HELPER='!f() { echo "username=x-access-token"; echo "password=${GITHUB_TOKEN}"; }; f'

if [ -d "$KB_DIR/.git" ]; then
  git -C "$KB_DIR" -c credential.helper= -c "credential.helper=$CRED_HELPER" pull --ff-only origin main
else
  git -c credential.helper= -c "credential.helper=$CRED_HELPER" clone --depth 1 "$REPO_URL" "$KB_DIR"
fi

echo "bbm-kb @ $(git -C "$KB_DIR" rev-parse --short HEAD) ($(git -C "$KB_DIR" log -1 --format=%cI))"
