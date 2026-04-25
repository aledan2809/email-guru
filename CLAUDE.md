# CLAUDE.md - Autonomous Development Template
# Copy this to your project root as CLAUDE.md

## Project Setup

### Database
- **Type**: [neon/supabase/prisma]
- **Connection**: See `.env` for DATABASE_URL

### Stack
- **Frontend**: [Next.js/React/Angular/Vue]
- **Backend**: [NestJS/Fastify/Express/.NET]
- **Port**: [port number]

---

## MANDATORY RULES (ALWAYS FOLLOW)

### 1. PROJECT LOCATION
- ALL projects MUST be created in `C:\Projects\` only
- Structure: `C:\Projects\ProjectName\` with subfolders inside
- NEVER create projects elsewhere

### 2. TODO LIST - ALWAYS START WITH THIS
- Every session MUST begin by reading or creating a TODO list
- Use TodoWrite tool to track all tasks
- Update TODO with every new instruction or completed work
- Mark tasks complete immediately when done
- Add new tasks as they are discovered

### 3. STATUS BACKUP (Prevent Data Loss)
Commands:
- `backup status` → Save current session state to DEVELOPMENT_STATUS.md
- `update status` or `status update` → Restore from DEVELOPMENT_STATUS.md

**AUTO-BACKUP TRIGGERS** (Do automatically, no user request needed):
- After EVERY completed TODO item
- After any file creation/major edit
- After successful build/test
- Before any risky operation
- Minimum: every 30 minutes of active work

**LOGGING** (For monitoring):
After each backup, append to `C:\Projects\backup-log.md`:
```
[2026-02-06 14:30] | ProjectName | TODO completed | ✅ OK
```

DEVELOPMENT_STATUS.md format:
```markdown
# Project Status - [Project Name]
Last Updated: [timestamp]

## Current State
- [what's working]
- [what's in progress]

## TODO
- [ ] Task 1
- [ ] Task 2

## Recent Changes
- [date]: [change description]

## Technical Notes
- [important decisions, gotchas, etc.]
```

### 4. GLOBAL MEMORY ACCESS
- Global instructions: `~/.claude/projects/*/memory/MEMORY.md`
- When improving something applicable to ALL projects, update global memory
- Check global memory for reusable patterns before implementing

### 5. MASTER CREDENTIAL REPOSITORY
**Path**: `C:\Projects\Master`
**Purpose**: Central storage for ALL credentials across ALL projects

**SYNC RULES** (MANDATORY):
1. **At project start**: Request common API keys from Master:
   - OpenAI, Anthropic, Google Cloud, Azure keys
   - Check `C:\Projects\Master\credentials\` for existing .env files

2. **During development**: When obtaining NEW credentials:
   - Database URLs (Neon, Supabase, etc.)
   - API keys, tokens, secrets
   - Service URLs
   → Immediately sync to Master: `C:\Projects\Master\credentials\[project-name].env`

3. **Format for Master credentials**:
   ```env
   # Project: [ProjectName]
   # Last Updated: [date]
   DATABASE_URL=...
   API_KEY=...
   ```

4. **Master backup responsibility**:
   - Master creates regular backups of all projects
   - Log: `C:\Projects\master-backup-log.md`

### 6. KNOWLEDGE BASE AUTO-UPDATE (MANDATORY)
**Path**: `knowledge/` folder in project root
**Purpose**: Living documentation that stays current with project evolution

**AUTO-UPDATE TRIGGERS** (Do automatically, NO user request needed):
1. **After adding new features**: Update `project-overview.md` with new capabilities
2. **After changing architecture**: Update technical stack, ports, integrations
3. **After API changes**: Document new endpoints, modified contracts
4. **After business logic changes**: Update business rules, workflows
5. **After fixing significant bugs**: Document root cause and solution
6. **After changing dependencies**: Update stack information

**VERSIONING** (Track all changes):
- Add changelog entry at top of each updated file:
  ```markdown
  ## Changelog
  - [2026-02-07] v1.1: Added payment integration
  - [2026-02-06] v1.0: Initial version
  ```
- Increment version with each update (v1.0 → v1.1 → v1.2)

**KNOWLEDGE FILES** (Minimum required):
1. `knowledge/project-overview.md` - Business + Technical overview:
   - **Purpose**: Why this project exists
   - **Target Users**: Who uses it
   - **Problem Solved**: What pain point it addresses
   - **Business Goals**: Success metrics
   - **Architecture**: Stack, ports, integrations
   - **Key Features**: What it does

2. Additional files as needed:
   - `api-contracts.md` - API documentation
   - `database-schema.md` - Data models
   - `workflows.md` - Business processes
   - `integrations.md` - External services

**IMPORTANT**: This is LIVING documentation. Update it as part of every significant change, not as a separate task. The knowledge base should always reflect the CURRENT state of the project.

### 7. ECOSYSTEM REGISTRY (MANDATORY - AVOID DUPLICATION)
**Path**: `C:\Projects\Master\ECOSYSTEM_REGISTRY.md`
**Purpose**: Central registry of ALL projects and reusable modules

**BEFORE IMPLEMENTING ANYTHING**:
1. **READ** the Ecosystem Registry first
2. **CHECK** if the module/function already exists
3. **IF EXISTS** → Import/copy from source project
4. **IF NOT** → Implement AND add to registry

**RULE**: Nu reinventa roata! Dacă există deja, folosește-l.

**REUSABLE MODULES** (always check these first):
- **OCR**: `C:\Projects\ocr-model` - All OCR functionality
- **Feedback Widget**: `C:\Projects\Feedback-Hub` - User feedback collection
- **Auth Pattern**: `C:\Projects\eProfit\apps\api\src\auth` - JWT + Guards
- **Tax Engine**: `C:\Projects\eProfit\apps\api\src\tax` - Romania taxes
- **Multi-tenant**: `C:\Projects\eCabinet\server\src` - Organization-scoped data
- **AI Integration**: `C:\Projects\SEAP\src\lib\claude.ts` - Claude API patterns
- **Credential Loader**: `C:\Projects\Master\loaders` - Load .env from Master

**AFTER CREATING NEW MODULE**:
1. Add to `C:\Projects\Master\ECOSYSTEM_REGISTRY.md`
2. Document: path, usage example, capabilities
3. List which projects use it

**ECOSYSTEM AWARENESS**:
- Every project is part of a larger ecosystem
- Projects can and should share code
- Check other projects for inspiration
- Parametrize code for reusability

---

## Claude Code Autonomy Rules

### REGULA SUPREMĂ: AUTONOMIE MAXIMĂ

**NU CERE UTILIZATORULUI SĂ FACĂ CEVA CE POȚI FACE TU!**

Exemple de ce să NU ceri:
- ❌ "Please run this command..." → ✅ Rulează-l tu
- ❌ "Please set this environment variable..." → ✅ Scrie în .env tu
- ❌ "Please create this file..." → ✅ Creează-l tu
- ❌ "Please go to browser and..." → ✅ Folosește CLI/API
- ❌ "Please copy this to..." → ✅ Copiază tu cu tools
- ❌ "Please install..." → ✅ Rulează npm install tu

**CERE UTILIZATORULUI DOAR CÂND:**
1. Ai nevoie de o decizie de business (ce vrea, nu cum)
2. Ai nevoie de credențiale pe care nu le ai
3. Ceva necesită acces fizic (ex: telefon, hardware)
4. Ai încercat de 3 ori și tot nu merge - atunci cere ajutor

**EXEMPLU CORECT:**
```
User: "Adaugă autentificare"
Claude: [Nu întreabă nimic, verifică ecosystem, implementează JWT,
         creează .env cu variabile, rulează migrări, testează]
Claude: "Am implementat autentificare JWT. Funcționează."
```

**EXEMPLU GREȘIT:**
```
User: "Adaugă autentificare"
Claude: "Please add these to your .env file..."  ← NU!
Claude: "Please run npm install..."  ← NU!
Claude: "Please go to Supabase dashboard..."  ← NU!
```

---

### ALWAYS DO (No Permission Needed)
- Read any file in the project
- Run `npm install`, `npm run dev`, `npm run build`
- Run tests: `npm test`, `npx jest`, `npx vitest`
- Git operations: `status`, `diff`, `log`, `add`, `commit`
- Run linters: `npm run lint`, `npx eslint`, `npx prettier`
- Database migrations: `npx prisma migrate dev`, `npx prisma generate`
- Type checking: `npx tsc --noEmit`
- Update TODO list
- Backup status when requested

### EXECUTE SQL DIRECTLY
Use CLI instead of copy/paste to browser:

```bash
# Neon - execute SQL directly
neonctl sql --project-id $NEON_PROJECT_ID -- "CREATE TABLE users (...)"
neonctl sql --project-id $NEON_PROJECT_ID -f migrations/001_init.sql

# Supabase - execute SQL directly
npx supabase db execute --db-url $DATABASE_URL -f migrations/001_init.sql
npx supabase db push
```

### ENVIRONMENT VARIABLES
Claude can create/update `.env` files. Required vars:
```
DATABASE_URL=
NEON_PROJECT_ID=
# Add project-specific vars below
```

### ERROR HANDLING
When errors occur:
1. Read full error message
2. Check relevant files
3. Fix and retry automatically (max 3 attempts)
4. If still failing, ask user

### TESTING WORKFLOW
Before marking task complete:
1. Run `npm run build` - must pass
2. Run `npm test` - must pass (or skip if no tests)
3. Run `npm run lint` - fix any issues

---

## CLI Quick Reference

### Neon CLI
```bash
# Login (one-time)
neonctl auth

# List projects
neonctl projects list

# Execute SQL
neonctl sql --project-id <id> -- "SELECT * FROM users"
neonctl sql --project-id <id> -f script.sql

# Get connection string
neonctl connection-string --project-id <id>
```

### Supabase CLI
```bash
# Login (one-time)
npx supabase login

# Link to project
npx supabase link --project-ref <ref>

# Execute SQL
npx supabase db execute -f script.sql

# Push migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --linked > types/supabase.ts
```

---


## Project-Specific Instructions

### Project: E-mail Guru
**Created**: 2026-03-07
**Template**: nextjs-ai

### Description
Selectarea informatiilor relevante din toate email-urile, decizia si actiunile asupra acestor emailuri.
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



### Development Notes
- Follow the project description above as the main guide
- Keep code clean, modular, and well-documented
- Write tests for critical functionality
- Sync any new credentials to Master: `C:\Projects\Master\credentials\e-mail_guru.env`
