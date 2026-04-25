# CONTEXT — E-mail Guru
# Created: 2026-03-07

## Project State
- Status: Active Development
- Last session: 2026-03-07
- Current priority: Initial setup

## Session Log
<!-- Append per MASTER_SYSTEM.md §9 and §12 -->

## [2026-03-07] — Request Handler Validation Hardening (Follow-up)
Preset: STANDARD (250 linii / 12 fișiere)
Task: Implement request handler cu validare strictă și răspuns consistent

### Fișiere modificate
- `src/app/api/classify-email/route.ts`
- `src/app/api/emails/route.ts`
- `CONTEXT.md`

### Status
- `POST /api/classify-email`: validare explicită pentru payload non-obiect (inclusiv array) cu `422 VALIDATION_ERROR` + detalii ✅
- `POST /api/emails`: validare upfront pentru `provider` și `accountId` înainte de procesarea batch-ului ✅
- Contract de răspuns error/success păstrat consistent prin helper-ele existente ✅

### Validare locală
- `npx tsc --noEmit` ❌ (`typescript` CLI indisponibil local; dependențele nu sunt instalate în mediul curent)

### Next steps
- Instalare dependențe proiect și rulare verificări statice/build

## [2026-03-07] — Request Handler Validation + Response Contract
Preset: STANDARD (250 linii / 12 fișiere)
Task: Implement request handler cu validare și răspuns standardizat reutilizabil

### Fișiere modificate
- `src/lib/api-response.ts`
- `src/app/api/classify-email/route.ts`
- `src/app/api/emails/route.ts`
- `CONTEXT.md`

### Status
- Contract comun de răspuns API introdus (`success/error`, `meta.requestId`, `meta.timestamp`) ✅
- Validare request JSON reutilizabilă (`Content-Type`, parse JSON invalid) ✅
- `POST /api/classify-email` și `POST /api/emails` aliniate la același contract ✅

### Validare locală
- `npm run build` ❌ (setup existent Turbopack root/workspace, independent de patch)

### Next steps
- Adaugă `next.config.ts` cu `turbopack.root` pentru build local stabil

## [2026-03-07] — Request Handler MVP
Preset: STANDARD (250 linii / 12 fișiere)
Task: Implement request handler cu validare și răspuns standardizat

### Fișiere modificate
- `src/lib/email-classifier.ts`
- `src/app/api/classify-email/route.ts`

### Status
- API endpoint nou: `POST /api/classify-email` ✅
- Validare payload + erori explicite ✅
- Clasificare MVP bazată pe reguli keyword ✅

### Validare locală
- `npm run lint` ❌ (lipsește `eslint.config.*` în proiect)
- `npm run build` ❌ (eroare Turbopack root/workspace existentă în setup)

### Next steps
- Configurează `eslint.config.mjs` pentru ESLint v9
- Adaugă `next.config.ts` cu `turbopack.root` dacă workspace-ul rămâne detectat greșit

## [2026-03-07] — Request Handler Hardening
Preset: STANDARD (250 linii / 12 fișiere)
Task: Întărire validare input + contract răspuns pentru `POST /api/classify-email`

### Fișiere modificate
- `src/lib/email-classifier.ts`
- `src/app/api/classify-email/route.ts`

### Status
- Validare extinsă: normalize provider, string-uri goale, email format, ISO date, limite attachment ✅
- Răspunsuri standardizate cu `meta.requestId` + `meta.timestamp` pe success/error ✅
- Validare header `Content-Type: application/json` + HTTP 415 explicit ✅

### Validare locală
- `npm run build` ❌ (eroare existentă setup Turbopack root/workspace, independentă de schimbările endpoint-ului)

### Next steps
- Adaugă `next.config.ts` cu `turbopack.root` pentru fix build

## [2026-03-07] — API Route File
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create API route file for email classification endpoint

### Fișiere modificate
- `src/app/api/classify-email/route.ts`

### Status
- API route disponibilă: `GET /api/classify-email` ✅
- API route clasificare: `POST /api/classify-email` ✅

### Validare locală
- `npm run lint` ❌ (proiectul nu are `eslint.config.*` pentru ESLint v9)

### Next steps
- Adăugare `eslint.config.mjs` pentru rulare lint local

## [2026-03-07] — API Route Delivery Check
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create the API route file

### Fișiere modificate
- `CONTEXT.md`

### Status
- API route file confirmat: `src/app/api/classify-email/route.ts` ✅

### Next steps
- Continuare MVP cu endpoint-uri pentru ingestie email (Gmail/Outlook/IMAP)

## [2026-03-07] — Request Handler Validation/Response Update
Preset: STANDARD (250 linii / 12 fișiere)
Task: Implement request handler cu validare și răspuns corect pentru `POST /api/classify-email`

### Fișiere modificate
- `src/app/api/classify-email/route.ts`
- `CONTEXT.md`

### Status
- Separare explicită erori `INVALID_JSON` (400), `VALIDATION_ERROR` (422), `INTERNAL_ERROR` (500) ✅
- Contract de răspuns consistent pe success/error cu `meta.requestId` + `meta.timestamp` ✅
- Validare `Content-Type` păstrată cu `415 UNSUPPORTED_MEDIA_TYPE` ✅

### Validare locală
- `npm run lint` ❌ (lipsește `eslint.config.*` pentru ESLint v9)
- `npx tsc --noEmit` ❌ (`typescript` CLI indisponibil local; proiectul nu are dependențele instalate)

### Next steps
- Instalare dependențe proiect și rerulare validare statică
- Adăugare config ESLint v9 (`eslint.config.mjs`) dacă dorești lint în pipeline

## [2026-03-07] — API Index Route Creation
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create API route file

### Fișiere modificate
- `src/app/api/route.ts`
- `CONTEXT.md`

### Status
- API index route creată: `GET /api` ✅
- Endpoint-uri documentate în răspuns: `/api`, `/api/classify-email` ✅

## [2026-03-07] — Batch Emails API Route
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create the API route file

### Fișiere modificate
- `src/app/api/emails/route.ts`
- `src/app/api/route.ts`
- `CONTEXT.md`

### Status
- API route nouă: `GET /api/emails` ✅
- Batch classification route nouă: `POST /api/emails` ✅
- Endpoint-ul este adăugat în indexul `GET /api` ✅

### Validare locală
- `npm run build` ❌ (eroare existentă setup Turbopack root/workspace, independentă de endpoint)

### Next steps
- Adăugare `next.config.ts` cu `turbopack.root` pentru build local stabil

## [2026-03-07] — Health API Route
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create the API route file

### Fișiere modificate
- `src/app/api/health/route.ts`
- `src/app/api/route.ts`
- `CONTEXT.md`

### Status
- API route nouă: `GET /api/health` ✅
- Endpoint-ul este adăugat în indexul `GET /api` ✅

## [2026-03-07] — Inbox API Route
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create the API route file

### Fișiere modificate
- `src/app/api/inbox/route.ts`
- `src/app/api/route.ts`
- `CONTEXT.md`

### Status
- API route nouă: `GET /api/inbox` ✅
- Endpoint-ul este adăugat în indexul `GET /api` ✅

### Validare locală
- `npm run lint` ❌ (lipsește `eslint.config.*` pentru ESLint v9)

## [2026-03-07] — Classify Alias API Route
Preset: STANDARD (250 linii / 12 fișiere)
Task: Create the API route file

### Fișiere modificate
- `src/app/api/classify/route.ts`
- `CONTEXT.md`

### Status
- API route nouă: `GET /api/classify` ✅
- API route nouă: `POST /api/classify` ✅
- Ruta reutilizează handler-ele existente din `classify-email` pentru consistență ✅

### Validare locală
- `npm run lint` ❌ (lipsește `eslint.config.*` pentru ESLint v9)
