#!/bin/bash
# Rutina de dimineață: pornește aplicația dacă nu merge, apoi triază inboxul.
#
# Pornită de launchd (com.emailguru.gmail-triage). Nu mută niciun mesaj —
# produce doar propuneri, pe care le aprobi din http://localhost:3101/triaj
#
# Log: logs/gmail-triage.log

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

PORT="${GMAIL_TRIAGE_PORT:-3101}"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/gmail-triage.log"

# PATH-ul unui job launchd e minimal — node nu se găsește singur.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"

say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

say "--- pornire rutină triaj ---"

if ! command -v node >/dev/null 2>&1; then
  say "EȘEC: node nu e în PATH. Verifică PATH-ul din scriptul acesta."
  exit 1
fi

# Pagina de aprobare trebuie să fie deschisă când apeși linkul din Telegram.
# Dacă aplicația nu rulează, o pornim detașat și îi dăm timp să se ridice.
if ! curl -sf -o /dev/null --max-time 3 "http://localhost:$PORT/api/triage/latest"; then
  say "aplicația nu răspunde pe :$PORT — o pornesc"
  nohup npm run dev -- -p "$PORT" >> "$LOG_DIR/app.log" 2>&1 &
  for _ in $(seq 1 30); do
    sleep 2
    curl -sf -o /dev/null --max-time 3 "http://localhost:$PORT/api/triage/latest" && break
  done
  if curl -sf -o /dev/null --max-time 3 "http://localhost:$PORT/api/triage/latest"; then
    say "aplicația a pornit"
  else
    # Nu oprim triajul: raportul se salvează oricum, iar Telegram tot ajunge.
    say "AVERTISMENT: aplicația nu a pornit — raportul se salvează, dar linkul din Telegram nu va merge până o pornești manual"
  fi
fi

node scripts/gmail-triage.mjs --days "${GMAIL_TRIAGE_DAYS:-1}" >> "$LOG" 2>&1
code=$?

case $code in
  0)  say "gata: nimic de aprobat" ;;
  10) say "gata: există propuneri de aprobat (http://localhost:$PORT/triaj)" ;;
  *)  say "EȘEC (cod $code) — vezi mesajul de mai sus în acest log" ;;
esac

# 10 înseamnă „am treabă pentru tine", nu eroare — launchd n-ar trebui s-o
# raporteze ca eșec.
[ $code -eq 10 ] && exit 0
exit $code
