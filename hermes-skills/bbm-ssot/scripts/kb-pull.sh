#!/bin/sh
# bbm-ssot skill: клон/обновление приватного репо bbm-academy-org/bbm-kb (BBMP-102).
# Требует BBM_KB_GITHUB_TOKEN (fine-grained PAT, contents:read на bbm-kb) в env.
# Имя НЕ GITHUB_TOKEN: то закреплено за кредом провайдера GitHub Copilot и
# вычищается песочницей Hermes без возможности passthrough (GHSA-rhgp-j443-p4rf);
# см. SKILL.md §Механика. Fallback на GITHUB_TOKEN оставлен для ручных прогонов.
# Токен передаётся через одноразовый credential.helper и НЕ сохраняется
# в .git/config / credential store.
set -eu

# HERMES_HOME прокидывается Hermes'ом и в песочницу бота, и в рантайм —
# путь клона одинаков у бота и у ручного прогона. $HOME — только fallback.
KB_DIR="${KB_DIR:-${HERMES_HOME:-$HOME}/bbm-kb}"
REPO_URL="https://github.com/bbm-academy-org/bbm-kb.git"

KB_TOKEN="${BBM_KB_GITHUB_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$KB_TOKEN" ]; then
  echo "ERROR: BBM_KB_GITHUB_TOKEN не задан — приватный bbm-kb недоступен. Канон SSOT прочитать нельзя." >&2
  echo "Хост-процедура: добавить BBM_KB_GITHUB_TOKEN в compose .env деплоя Hermes (канон bbm/infra/hermes/; см. bbm-kb/docs/ssot-propagation.md)." >&2
  exit 2
fi
export KB_TOKEN

# helper отдаёт креды из env на время одной команды
CRED_HELPER='!f() { echo "username=x-access-token"; echo "password=${KB_TOKEN}"; }; f'

if [ -d "$KB_DIR/.git" ]; then
  git -C "$KB_DIR" -c credential.helper= -c "credential.helper=$CRED_HELPER" pull --ff-only origin main
else
  git -c credential.helper= -c "credential.helper=$CRED_HELPER" clone --depth 1 "$REPO_URL" "$KB_DIR"
fi

echo "bbm-kb @ $(git -C "$KB_DIR" rev-parse --short HEAD) ($(git -C "$KB_DIR" log -1 --format=%cI))"
