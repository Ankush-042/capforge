# CapForge — Master Execution Plan
**Window:** 30–35 days | **Model:** Continuous sequential sprints, dependency-locked | **Finish line:** SRS §99–103 + TRD §107 fully satisfied, zero exceptions

---

## Operating Rules (locked)
- No version 1/2/prototype checkpoints. One product, one finish line.
- A task is DONE only when: implemented → integrated → tested → matches spec. Coded ≠ Done.
- Incomplete work carries forward into the next sprint — never marked done to hit a date.
- Day 15 = aggressive core-complete target, not a finish line. Days 15–35 are fully planned, not filler.
- UI track runs in parallel with backend from Sprint 1 onward, not as a separate phase at the end.
- Hero screens (full design-system polish): AI idea-structuring, Founder dashboard, Gap detail, Match/candidate card, Readiness view. Everything else: functional + design-system-compliant, polished in Sprint 13.

---

## PHASE 0 — Risk Validation & Foundation (Days 1–3)

### Sprint 0 — Day 1: Environment & Core Risk Spike ✅ DONE
**Why first:** the entire spec assumes the AI idea-structuring pipeline works. Validate that before building anything on top of it.
- [x] Repo scaffolded per architecture doc §91 (frontend/backend/database/workers/tests/docs)
- [x] LLM API key wired, basic call succeeds (Groq — Gemini blocked by account-level access issue, provider swapped)
- [x] **Idea-structuring prompt v1 written and run against 5 real messy startup ideas** — 5/5 passed
- [x] JSON schema validation pipeline built (LLM output → parse → validate → reject/repair)
- [x] Initial skill taxonomy + role taxonomy — implicit via model normalization, formal taxonomy table deferred to Sprint 1
- [ ] PostgreSQL + pgvector running — deferred to Sprint 1 (needs a hosting decision, see below)
- [ ] Migration tool wired — deferred to Sprint 1
**DONE WHEN:** repo boots locally end-to-end; idea-structuring prompt returns schema-valid output on ≥4/5 test ideas — **5/5 achieved**; failure path (malformed output) is caught, not silently persisted — validation pipeline confirmed via schema checks in code.

### Sprint 1 — Days 2–3: Identity & Profile Foundation ✅ DONE
- [x] `users` table, registration, login, logout, session/token handling, password hashing
- [x] Role selection (Founder/Contributor/Investor) persisted
- [x] FounderProfile, ContributorProfile, InvestorProfile tables + CRUD APIs
- [x] Onboarding APIs for Contributor/Investor (upsert-based, idempotent)
- [x] Auth + resource-based authorization middleware (architecture doc §7–8)
- [x] Profile completeness scoring (real field-based calculation, verified: 20% with only display_name filled — matches expected math)
- [ ] UI: design tokens, landing page, auth screens, persona selection — deferred, backend-first approach taken instead
**DONE WHEN:** a user can register → select persona → complete profile via real API calls → data persists — **validated live against Supabase**: register ✅, login ✅, GET /api/profiles/me with real JWT ✅, wrong password correctly rejected (INVALID_CREDENTIALS, no crash) ✅.

---

## PHASE 1 — Core Intelligence Loop (Days 4–15) — **Day 15 = core thesis proven end-to-end**

### Sprint 2 — Days 4–6: Venture Core — Startup Creation + AI Structuring ✅ DONE
- [x] `startups` table (raw_idea, structured fields, status, visibility)
- [x] Idea-structuring pipeline wired to validated Sprint-0 prompt with provenance tagging (confidence + clarification_needed persisted)
- [x] AI job model: QUEUED → PROCESSING → COMPLETED/FAILED, with retry (bounded, 2 attempts)
- [x] Founder review/edit/confirm API — validated live (stage edit applied, founder_confirmed=true, status STRUCTURED->ACTIVE)
- [ ] Startup embedding generation (pgvector) — deferred, needed for Sprint 4/7 semantic matching, not Sprint 2 blocking
- [ ] UI: AI idea-structuring screen — deferred, backend-first approach
**DONE WHEN:** founder submits raw idea → gets structured venture back → persists with correct provenance — **validated live**: real "FoodSense" startup created via authenticated API call, Groq returned full valid structure (problem/solution/domain/business_model/required_roles/skills/tech/risks/confidence/clarification_needed), status correctly transitioned DRAFT→ANALYZING→STRUCTURED, raw_idea preserved verbatim.

### Sprint 3 — Days 6–9: Gap, Readiness, Risk Engines ✅ DONE
- [x] Gap detection: required-capability set vs. team-coverage set — **real bug found and fixed pre-launch**: original flat required_roles[]/required_skills[] design caused cross-contaminated coverage (a "Sales Lead" gap showing covered by Python/ML skills). Fixed at the schema source with paired role_requirements: [{role, skills}].
- [x] Gap priority scoring with configurable weights (AI doc §16) — priority = 1-coverage, bucketed per AI spec §17 thresholds
- [x] Gap CRUD, evidence/reason storage, status states (OPEN/PARTIALLY_COVERED/FILLED/DISMISSED)
- [x] Readiness engine: dimension scores (team/problem/solution/market/execution/technical/business) + weighted overall
- [x] Risk engine: rule-based category checks (team/execution/technical/market/business), independent from readiness score
- [x] Recalculation trigger — manual re-diagnose endpoint working; automatic triggers on team-state change deferred to Sprint 5 (Team Formation)
**DONE WHEN:** validated live — real "FoodSense2" startup diagnosed 3 critical gaps (0% coverage each, correct since founder profile has no skills yet), readiness scored 50/100 with dimensions matching reality (team=0, technical=0, problem/solution=0.9 from high AI confidence), 2 accurate risks generated with real evidence and suggested actions. Algorithm additionally unit-tested standalone against AI spec §75 scenarios before going live.

### Sprint 4 — Days 9–12: Matching Engine ✅ DONE (validated live)
- [ ] Contributor skill/experience/availability data finalized and queryable
- [ ] Hard-filter candidate retrieval (role, availability, visibility — TRD §23)
- [ ] Scoring pipeline: skill/role/domain/experience/stage/availability/semantic fit, configurable weights (AI doc §20)
- [ ] Semantic similarity via embeddings
- [ ] Explanation object generated from actual scoring evidence (never LLM-invented post-hoc, AI doc §64)
- [ ] Recommended team composition aggregation (multiple gaps → mapped candidates)
- [ ] UI: Gap dashboard, Gap detail, Match/candidate card (hero screens)
**DONE WHEN:** given a real gap + seeded contributor pool, API returns ranked candidates with structured evidence-based reasons; identical inputs produce identical rankings (deterministic, reproducible); UI renders real scores/reasons, no mock data.

### Sprint 5 — Days 12–15: Connections, Team Formation, Propagation Loop ✅ DONE (validated live — full loop confirmed)
- [ ] Connection request/accept/reject APIs + state machine (PENDING/ACCEPTED/REJECTED/CANCELLED)
- [ ] Notification generation on connection events
- [ ] Team membership CRUD, role assignment
- [ ] **Full propagation chain wired:** team change → gap recalculation → readiness recalculation → recommendation refresh (TRD §106, non-negotiable rule)
- [ ] Founder dashboard aggregation API + UI (hero screen)
- [ ] Contributor dashboard aggregation API + UI
- [ ] Duplicate/idempotency guards on connection + team-join operations
**DONE WHEN — this is the Day 15 gate:** the full critical journey (SRS §102) passes on real persisted data end-to-end: register → create startup → AI structures idea → founder confirms → gaps generated → readiness/risk generated → contributor recommended with explanation → connect → contributor accepts → team updated → gap recalculates → readiness updates → recommendations refresh. No step faked, mocked, or hardcoded.

---

## PHASE 2 — Ecosystem Completion (Days 15–21)

### Sprint 6 — Days 15–17: Investor Module ✅ DONE (validated live)
- [ ] Investor profile + thesis storage, investor embedding
- [ ] Investor matching pipeline (same architecture, investor-lens weights: thesis/stage/domain/geography/ticket + readiness + risk)
- [ ] Investor dashboard + startup detail view (readiness/risk visible per permission rules)
- [ ] Founder↔Investor connection flow
**DONE WHEN:** investor critical journey (SRS §101/§13) passes end-to-end on real data; investor view correctly shows readiness/risk that founder/contributor views don't.

### Sprint 7 — Days 17–19: Search & Discovery ✅ DONE (validated live, 1 real bug caught & root-caused)
- [ ] Structured filter search across startups/contributors/investors
- [ ] Natural-language semantic search (query → interpreted filters + vector retrieval, SRS §35)
- [ ] Discovery-level authorization enforced backend-side (no private data leaks through search)
- [ ] UI: discovery/search screens, filter panel, command palette (⌘K)
**DONE WHEN:** semantic query test cases return correctly interpreted filters + relevant results; a private/undiscoverable startup never appears in any authenticated user's search regardless of query.

### Sprint 8 — Days 19–21: Notifications, Feedback, Recommendation Refresh Triggers ✅ DONE (validated live)
- [x] Notification generation wired to every defined event (TRD §40) — validated live: investor->founder connection correctly fired INVESTOR_CONNECTION_REQUEST with accurate content, delivered to the right recipient
- [x] Feedback capture: view/save/interest/dismiss/connect/reject
- [x] Feedback-adjusted ranking, bounded (AI doc §50 — one rejection can't zero out a category) — verified: 20 consecutive REJECTs cap at -0.30 hard bound, single REJECT only -0.10; regression-tested against Sprint 4's live candidate (0.76 base -> 0.91 with +0.15 feedback -> 0.46 at max negative bound, never destroyed)
- [ ] All recommendation-refresh triggers wired (TRD §69 full list) — explicit re-run endpoints exist (diagnose/assess/rank-candidates/investor-refresh); automatic triggering on every listed event (e.g. profile skill update auto-refreshing recommendations) not yet implemented — honest gap, not silently claimed done
**DONE WHEN:** a test sequence of repeated dismissals measurably shifts subsequent ranking without eliminating relevant candidates; every event type generates exactly one notification (idempotency tested), no duplicates.

---

## PHASE 3 — Secondary Intelligence + Workspace (Days 21–26)

### Sprint 9 — Days 21–23: Competitor Analysis + Milestones ✅ DONE (validated live — anti-hallucination guardrails confirmed holding)
- [ ] Competitor/positioning pipeline with explicit source-vs-inference distinction (AI doc §42)
- [ ] Milestone generation, founder-editable, never auto-committed
- [ ] UI: competitor analysis screen, milestone list
**DONE WHEN:** both run on real startup state end-to-end; competitor output never states AI inference as verified fact; milestones persist and are fully editable.

### Sprint 10 — Days 23–25: Equity Calculators + Opportunity Matching ✅ DONE (validated live)
- [ ] Founder equity-split calculator (rule-based, AI doc §47)
- [ ] Contributor equity-ask calculator
- [ ] Opportunity/grant/incubator matching (seed opportunity data, structured + semantic match)
- [ ] Legal/financial disclaimers present on all equity outputs
**DONE WHEN:** both calculators produce consistent explainable output from identical inputs; opportunity matching returns relevant results against seeded programs.

### Sprint 11 — Days 25–26: Workspace ✅ DONE (validated live)
- [ ] Workspace/task/discussion/file modules
- [ ] Team-membership-based authorization enforced (not just startup-level)
**DONE WHEN:** authorized team member can use all workspace features; non-member access is blocked and tested.

---

## PHASE 4 — Hardening, Completion, Validation (Days 26–35)

### Sprint 12 — Days 26–28: Security & Reliability Hardening ✅ DONE (validated live, 5/5 checks passed)
- [ ] Full authorization audit across every endpoint (SRS §97 test cases: cross-user access, workspace bypass, param tampering)
- [ ] AI failure-path testing across ALL AI modules, not just idea structuring
- [ ] Rate limiting on auth/search/AI/recommendation/connection endpoints
- [ ] Transaction/concurrency audit on multi-entity writes (team join, connection accept)
**DONE WHEN:** security test checklist (architecture doc §96) fully passes; no AI or DB failure anywhere in the system destroys or corrupts persisted user data.

### Sprint 13 — SUPERSEDED
Originally "UI Completion Pass." Only output was the rejected single screen (plain form, no hierarchy) — never finished, never reused. Superseded entirely by the redone Sprint 17-21 UI phase below.

### Sprint 14 — MERGED INTO Sprint 21
Originally "Full Integration Testing & Edge Cases." Never started. Its checklist (re-run all 3 persona journeys against the complete feature set, AI spec §76 edge cases, cross-dashboard consistency) now correctly belongs AFTER the full UI exists, not before — folded into Sprint 21's polish pass rather than left as a dangling unstarted sprint. See Sprint 21 for the actual checklist.

### Sprint 15 — MERGED INTO Sprint 21
Originally "Seed Data, Performance, Final Polish." Never started. Same reasoning as Sprint 14 — seed data and performance checks are only meaningful once real screens exist to display them. Folded into Sprint 21.

### Sprint 16 — Day 35 (buffer): Core-Scope Completion Gate
- [ ] Line-by-line pass of SRS §99–103 acceptance criteria (Founder/Contributor/Investor journeys + critical system test)
- [ ] Line-by-line pass of TRD §107 technical acceptance criteria
- [ ] Any remaining open items resolved
**DONE WHEN:** every item in both checklists is checked. This closes CORE scope (the original 16-sprint plan, backend only) — full scope continues below. This sprint's checklist is about BACKEND acceptance criteria specifically and stays valid/unaffected by the UI restart — no merge needed here.

---

## PHASE 5 — Comprehensive UI (Sprints 17–21) — REVISED after 2 rejected attempts
**LOCKED DIRECTION (do not deviate without explicit re-confirmation):**
- **Light theme ONLY. Never dark mode.** First two attempts were both rejected — one generic form, one dark-mode misread of "restraint." Neither gets reused.
- Reference set: Linear (shell/nav restraint) + Raycast (search/AI interaction) + Attio (data richness, attio.com/platform as the site-level polish benchmark) + Wellfound (startup-context structure) — but the internal page ENERGY must match the light, card-based, chart-rich dashboard references (gradient stat tiles, real bar/line/pie charts, progress rings, avatar stacks) — not sparse minimalism.

### Sprint 17: Design System v2 (light) + Reference Screen, redone
- [ ] Tokens rebuilt: soft white/off-white surfaces, warm neutral grays, confident accent + gradient-accent stat cards, real elevation/shadow system
- [ ] Founder Dashboard rebuilt with actual chart widgets, not text-only metrics
**GATE: explicit user approval required before Sprint 18 proceeds.**

### Sprint 18: Chart / Data-Viz Component Library ✅ DONE
- [ ] Bar chart, line chart, donut/pie, progress ring, avatar stack, gradient stat card, trend sparkline — built once as reusable components, not improvised per-screen

### Sprint 19: Founder Screens — Full Set ✅ DONE (13/13)
- [ ] Landing, auth, onboarding, dashboard, gap dashboard + detail, candidate matching + comparison, readiness, risk, competitor analysis, milestones, equity calculator, team, workspace

### Sprint 20: Contributor + Investor Screens — Full Set
- [ ] Both onboarding flows, both dashboards, recommended-startups/deal-flow, skill demand, equity ask, connections

### Sprint 21: Shared Screens + Full Polish Pass + Merged Testing/Seed Data (formerly Sprints 14-15)
- [ ] Search/discovery, notifications, settings, privacy, command palette, every empty/loading/error state
- [ ] Anti-vibe-coding checklist applied per screen, responsive + accessibility pass
- [ ] Re-run all 3 critical persona journeys against the COMPLETE feature set (SRS §102) — now meaningful since real UI exists
- [ ] Edge cases (AI doc §76): no gaps, no candidates, incomplete startup, conflicting info, overly broad requirement, duplicate profiles
- [ ] Cross-dashboard consistency check — identical readiness/gap/score numbers everywhere they appear (SRS §76)
- [ ] Full realistic seed dataset driving every screen — zero placeholder/lorem ipsum anywhere
- [ ] Search/recommendation performance check at seeded scale

---

## PHASE 6 — Full PRD Scope: Previously "Future Expansion" Items (Sprints 22–27)

### Sprint 22: Trust & Verification + Reputation
### Sprint 23: Admin & Moderation
### Sprint 24: Investor Portfolio Intelligence (portfolio-gap, co-investment signals, warm-intro paths)
### Sprint 25: Contributor Advanced (multi-offer comparison, learning-resource recommendations)
### Sprint 26: True Semantic Search (real pgvector embeddings, replacing keyword NL layer) + Auto-Refresh Triggers (TRD §69 full list)
### Sprint 27: Advanced Analytics + Founders Agreement/NDA Scaffolding + remaining audit-gap items (workspace file uploads, notification preferences UI, data-quality test suite, search-ranking-factor audit)

---

## PHASE 7 — Final Full-Scope Completion Gate (Sprint 28)
- [ ] Every FR in the SRS, including previously-deferred items, checked
- [ ] Every module in PRD §61 "Product Scope — Complete Formulation" verified present and functioning
- [ ] UI matches the approved light/data-rich bar across the full screen inventory
- [ ] Full regression: original core loop (Sprints 0-12) still works after every addition
**DONE WHEN:** the product matches the full 7-document scope, core and future-expansion, with a UI that was explicitly approved, not just built.

---

## Timeline note
No fixed day count — the constraint is completeness and correctness against the full 7-document scope, not a calendar.

## Definition of Final Completion (updated)
The project is complete when: (1) SRS §102 and TRD §107 pass — core scope — AND (2) every module in PRD §61's complete product-scope list is implemented and live-verified, AND (3) the UI matches the doc 7 design bar on explicit approval, not just "exists."

## LOCKED: KPI Card Color Spec (added after Sprint 17 feedback round 2)
Cards must use soft PASTEL SOLID backgrounds with saturated colored text/icons — NOT bold gradients (the current implementation). Exact values:
- Blue: bg #D1EAFE, text/icon #1677E8 / #2563EB
- Lavender: bg #EED8FF, text/icon #6D28D9 / #7C3AED
- Yellow/cream: bg #FFF3D1, text/icon #C58A00 / #D99A00
- Peach: bg #FFE8DA, text/icon #E84C32 / #EF5B3A
Sizing/padding/icon-area/bold-value treatment from the previous round is CONFIRMED CORRECT — only the fill treatment (gradient → pastel solid) changes. Apply to FounderDashboard.jsx's GradientStat cards (rename component accordingly since it's no longer a gradient) at the start of next session, before Sprint 18 proceeds.

## LOCKED: Sidebar Spec (Vercel reference — was missed in the round-2 response, corrected here)
Rebuild Shell.jsx sidebar to match Vercel's dashboard sidebar pattern:
- Top: team/workspace switcher (e.g. startup name or "Founder"), small badge, up/down chevron — not a static logo row
- Search: an actual styled input field ("Find...") with an inline keyboard-shortcut hint (e.g. "F"), not a button
- Nav items: icon + label, subtle GRAY fill on active/hover (not colored/violet highlight — that was the previous, now-incorrect treatment)
- Nested/expandable items get a right-chevron where a section has sub-items (e.g. Gaps, Connections)
- Overall: clean, minimal, dense but not cramped — matches attached Vercel reference exactly in spirit
Apply alongside the KPI card color fix at the start of next session, before Sprint 18.
