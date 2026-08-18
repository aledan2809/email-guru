#!/bin/bash
# Rutina zilnică: culege semnalele LinkedIn din mailurile de notificare și le trimite în
# MarketingAutomation. Read-only pe cutie. Pornită de launchd (com.emailguru.linkedin-signals),
# la 07:40 — după triajul de la 07:23, ca să nu bată amândouă Gmail-ul deodată.
#
# Log: logs/linkedin-signals.log
set -uo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1
LOG_DIR="$PROJECT_DIR/logs"; mkdir -p "$LOG_DIR"; LOG="$LOG_DIR/linkedin-signals.log"
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$HOME/.npm-global/bin:$PATH"
say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }
say "--- pornire culegător LinkedIn ---"
if ! command -v node >/dev/null 2>&1; then say "EȘEC: node nu e în PATH."; exit 1; fi
# 2 zile, nu 1: dacă o rulare pică, următoarea acoperă golul; MA dedupează, deci nu dublează.
if node scripts/linkedin-signals.mjs --days 2 >> "$LOG" 2>&1; then say "OK"; else say "EȘEC (exit $?)"; fi
