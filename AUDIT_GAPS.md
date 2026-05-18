# AUDIT_GAPS — E-mail Guru
Last Updated: 2026-05-18

## Eliminated Gaps

| ID | Severitate | Descriere | Status | Commit | Data |
|----|-----------|-----------|--------|--------|------|
| G-EG-001 | P1 | XSS: bodyHtml rendered via dangerouslySetInnerHTML fără sanitizare (EmailView.tsx:223) | Eliminated | dec76df | 2026-05-18 |
| G-EG-002 | P1 | crypto.createCipher/createDecipher deprecate — IV generat dar ignorat; criptare efectiv fără IV explicit (encryption.ts:41,67) | Eliminated | dec76df | 2026-05-18 |
| G-EG-003 | P1 | Lipsă rate limiting pe /api/ai/classify + /api/ai/smart-reply + /api/ai/batch-classify | Eliminated | dec76df | 2026-05-18 |
| G-EG-004 | P2 | Lipsă viewport export pentru Next.js 16 mobile rendering (layout.tsx) | Eliminated | dec76df | 2026-05-18 |

## Open Gaps

| ID | Severitate | Descriere | Status |
|----|-----------|-----------|--------|
| G-EG-005 | P3 | console.error() expus în producție pe toate routes AI | OPEN — cosmetic |
| G-EG-006 | P3 | bodyLen=577 pe Home — aplicația necesită configurare OAuth pentru a vedea inbox real | OPEN — infra/config |

## Journey Audit Results (2026-05-18)
- **Tool**: @aledan007/tester journey-audit
- **Config**: .journey-audit.json (no auth — app requires Gmail/Outlook OAuth)
- **Results**: 1/1 OK
  - Home `/` — OK: h1="E-mail Guru"

## ML2 Wave 5 Verdict
**PASS** — P1 fixes aplicate (dec76df), journey 1/1 OK.
