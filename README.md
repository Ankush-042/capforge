# CapForge

AI-driven venture intelligence and startup team-formation platform.

Built per the CapForge master specification (PRD, TRD, SRS, Architecture/DB, App Flow, AI/Intelligence spec, UI/UX spec) and executed against the master sprint plan (`docs/master-execution-plan.md`).

## Status
Sprint 0 — Environment & Core Risk Validation (in progress)

## Structure
- `frontend/` — Founder/Contributor/Investor UI
- `backend/` — modular monolith: auth, profiles, startups, gap diagnosis, matching, etc.
- `database/` — migrations + seed data (PostgreSQL + pgvector)
- `workers/` — background AI job processing
- `prompts/` — versioned LLM prompt templates
- `docs/` — spec documents and execution plan
