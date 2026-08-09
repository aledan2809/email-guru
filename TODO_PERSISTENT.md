
## 🔍 Introspection Audit 2026-06-20
> Audit complet (gap strategie↔cod · ghid per-pagină · deep research · funcțional + cyber).
> 4 acțiuni deschise · fără critice (librărie/local — fără scor extern).
> Rapoarte: `Reports/INTROSPECTION-2026-06-20/` (00-SUMMARY.md, 01-gap-strategy-vs-code.md, 02-pages-guide-RO.md, 03-deep-research-optimization.md, 04b-security-audit.md)
> Checklist Alex centralizat: `Master/reports/Alex_TODO_2026-06-20.md` + tab „Introspection Audit" în UI Master.

## E-mail Guru (local, nedeployat) — ACTIVE (fix-urile așteaptă review)
Sursă: `E-mail Guru/Reports/INTROSPECTION-2026-06-20/`

- [ ] 🟡 **`npm audit fix`** — 9 vulns (5 high: `next`, `undici` via googleapis, `ws` via imapflow).
  - 🗣️ *Pe înțelesul tău:* Sunt 9 vulnerabilități în biblioteci. După fix, aplicația de email e sigură.
- [ ] 🟡 **Zero auth proprie** (no `middleware.ts`) — OK local, BLOCANT la deploy public (→ auth + HTTPS). Decide local-only vs expus.
  - 🗣️ *Pe înțelesul tău:* Aplicația n-are sistem de login — bine local, dar periculos dacă o pui online. Trebuie decis: rămâne locală sau adăugăm autentificare înainte de a o expune.
- [ ] 🟡 **Lipsă `state` anti-CSRF pe OAuth** Google+Outlook + conținut email integral (PII facturi) la AI fără mascare (atenuant: prin Claude CLI/sesiune, nu provider terț) — decide regim privacy.
  - 🗣️ *Pe înțelesul tău:* Conectarea la Google/Outlook nu are protecția contra unui tip de atac, iar emailurile întregi (cu date personale) merg la procesare fără mascare. După fix, conectarea e mai sigură și decizi cum tratezi datele private.
- [ ] 🟢 **Doc + persistență** — README zice SQLite/3101 vs cod JSON/3000; `@supabase/supabase-js` instalat dar 0 importuri; confirmă `ENCRYPTION_KEY` unic.
  - 🗣️ *Pe înțelesul tău:* Documentația nu se potrivește cu codul (port și mod de stocare diferite) și e o bibliotecă instalată degeaba. După curățare, descrierea e corectă și nu ai cod inutil.
- _Solid: parole IMAP AES-256-CBC (scrypt), OAuth HttpOnly, webhook HMAC timingSafeEqual, DOMPurify, `.env` netracked. 4 P1 deja reparate._

---
