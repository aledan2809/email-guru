# AGENTS.md — E-mail Guru
# Codex CLI (OpenAI dual-agent — secondary agent)
# Self-contained: toate regulile sunt incluse direct
# v1.0 | 2026-03-07 | Master Ecosystem Dual-Agent Strategy

## Project Identity
- Nume: E-mail Guru
- Stack: Next.js 16 + React 19 + TailwindCSS 4
- Repo: C:\Projects\E-mail Guru
- Scop: Selectarea informatiilor relevante din toate email-urile, decizia si actiunile asupra acestor emailuri.
Fiecare email contine ceva: 
- facturi (care trebuie depozitate in anumite foldere dinamice functie de firma - ca pe urma sa fie date la contabilitate)
- oportunitati de business - rare, dar trebuie citite si validate
- informari de la/catre clienti sau potential clienti
- diverse servicii care nu functioneaza (ex. Supabase dezactivat pe un anumit cont, Vercel care a picat, etc)
- spam/junk care trebuie clasificat/blocat user/domain, etc.
- emails foarte vechi care are foarte multe/mari atasamente si care consuma mult storage, etc. - trebuie decis daca se pastreaza ca atare, se face arhiva, etc
Trebuie filtrate toate email-urile, de pe toate conturile si gasita o solutie foarte inteligenta prin care sa decid o singura data pe tipologia respectiva si AI-ul sa stie pe viitor ce sa faca, ba chiar sa-mi propuna diverse actiuni pe baza mai multor criterii (ex. spatiul stocare computer si Hostico/Hostinger - acolo unde se hosteaza, functie de domeniu si multe altele)
Aplicatia va trebui sa se auto optimizeze cu fiecare interactiune cu userul si sa faca asta atat scheduled cat si pe masura ce apare un nou email.
Ask user questions pentru mai multe detalii

## Rolul Codex (secondary agent)
Folosești Codex pentru: PR review, refactoring mare (50+ fișiere), sesiuni lungi (1h+), test suite generation.
Nu înlocuiește Claude Code pentru: features noi, debugging, UI, quick iterations.

## Governance
Default preset: STANDARD (250 linii / 12 fișiere)
- SAFE: 120 linii / 6 fișiere | STANDARD: 250/12 | EXPLORE: 600/25 | FIX ONLY: 150/10

### Core Rules
1. Nu fabrica requirements, arhitectură sau business logic
2. Propune plan (max 5 bullet points) înainte de orice implementare
3. Aprobare înainte de implementare
4. Citește CONTEXT.md la start sesiune; scrie handoff la final

### Guardrails — NU face fără aprobare:
- Force push la main | Ștergere fișiere | Modificare .env | Deploy producție

## Coding
- TypeScript | TailwindCSS 4 | Conventional commits (feat:, fix:, refactor:)
- Sync credențiale noi la: C:\Projects\Master\credentials\e-mail_guru.env

## After Session
Scrie în CONTEXT.md: Data, Preset, Task, Fișiere modificate, Status, Next steps
