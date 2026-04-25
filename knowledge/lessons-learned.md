# Lessons Learned — E-mail Guru

> Incident root causes and patterns specific to E-mail Guru.
> Master-level lessons: `Master/knowledge/lessons-learned.md`.

## Lessons

#### L01: 45d STALE_WIP from initial scaffold — code grew beyond commit `7d8b7c2` without follow-up commits
- **Date**: 2026-04-25
- **Category**: Git / Recovery / Cross-platform
- **Lesson**: Optimise flagged 26 modified files for 45 days. Reality: 7 real changes (CLAUDE.md added, package.json updated, src/app scaffold edits) + ~10 untracked files (Reports/, knowledge/, API routes, ESLint config, postcss config). The project was scaffolded at `7d8b7c2` and code growth happened locally without git commits. CRLF inflation accounted for ~19 of the 26 reported modifications.
- **Action**: (1) Added `.gitattributes` (`* text=auto eol=lf`) to prevent recurrence. Cross-ref Master L43. (2) Recovered via patch-extract + reset + reapply pattern (Master L43 playbook). (3) For solo dev projects: scaffold-then-grow without commits is a common state — Optimise auditor surfaces it via STALE_WIP, treat as a checkpoint signal rather than a bug.

---

## How to Add New Lessons

1. Identify the lesson from your project work
2. Add it under an appropriate category
3. Follow the format above
4. Cross-reference Master L## if the pattern applies broadly
