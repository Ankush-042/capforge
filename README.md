# CapForge

A reciprocal recommendation engine for early-stage venture formation, serving
founders, contributors and investors from one deterministic scoring core.

The design constraint that shapes everything below: **an unsupported
recommendation must be structurally impossible, not merely unlikely.** A
language model can produce a fluent justification for any pairing, and in this
domain people act on those justifications. So the architecture is built to make
the system unable to assert what it cannot support.

---

## Architecture

A modular monolith. One Node/Express process serves the JSON API and the
compiled React bundle, organised into **35 bounded modules** mounted as **34
route groups**, backed by PostgreSQL with pgvector.

```
React SPA ──► Express API ──┬──► Deterministic scoring layer ──► PostgreSQL
                            │    matching · readiness · equity      + pgvector
   JWT → requireAuth        │    schemes · venture ranking
   → requireRole            │
   → ownership check        └──► LLM augmentation layer ──► 3 keys → fallback
                                 structuring · judgement
                                 alignment · assistant
                            
                                 Embedding process (child_process.fork)
                                 all-MiniLM-L6-v2 · 384-d
```

### The deterministic/probabilistic boundary

This is the load-bearing decision. **Every number a user sees is a pure
function of database state.** Match percentage, readiness score, equity band,
scheme verdict — none of them calls a model.

The LLM is confined to three upstream roles: converting free text to structured
records, producing *one bounded signal among several*, and generating prose
that is never itself a score.

Two consequences follow. A total provider outage cannot alter a single ranking
— it can only block the creation of *new* structured ventures. And a
miscalibrated model judgement can move a score by at most its blend weight of
0.55, and cannot manufacture a recommendation at all, because the evidence rule
is evaluated independently of it.

---

## The matching engine

### Venture-first, not role-first

The engine originally emitted one row per *(person, open role)*. A venture
whose roles didn't fit you therefore did not exist for you. A full-stack
builder selecting healthtech saw **one** result, because the other healthtech
venture needed a Clinical Advisor, a Mobile Developer and a Designer.

That was a correct judgement about the roles and a wrong conclusion about the
venture. **Absence carries no information; order does.** The unit of
recommendation is now the venture, and role fit became an *attribute* of each
result rather than a *filter* on it:

| State | Meaning |
|---|---|
| `ROLE_FITS` | best-fitting role, with percentage |
| `NO_ROLE_FITS` | nothing fits, closest role named |
| `NO_OPEN_ROLES` | every role is filled |

Messaging the founder is available in all three. The role-first path survives
for the founder's genuinely different question — *rank candidates for this
specific gap*.

### Renormalisation over missing signals

A missing signal is excluded from the weighted sum and the remaining weights
are renormalised:

```
S = Σ(w_k · x_k) / Σ(w_k)    for k ∈ available components
```

Scoring an unscored venture as zero would penalise it for a gap in **our**
data rather than a deficiency in the venture. Contributor-side weights are
domain `0.35`, alignment `0.30`, capability `0.25`, stage `0.10` — stated
in-product as judgement, not measurement.

### The evidence rule

A candidate recommendation is emitted only if at least one holds:

```
literal skill overlap ≠ ∅   ∨   roleFit ≥ 0.8
    ∨   matchJudgement ≥ 0.6   ∨   cosine ≥ 0.5
```

Enforced as a system-wide invariant by a quality rule, not as a convention. A
confident-sounding explanation with nothing behind it is the failure mode that
makes matching products useless.

### Role fit is tiered

```
1.00  exact match after normalisation and synonym resolution
0.85  guarded containment (both strings ≥ 8 chars) or same synonym group
0.50  same adjacency group — deliberately BELOW the 0.8 evidence threshold
0.00  otherwise
```

That 0.50 is load-bearing. When it sat higher, adjacency acted as evidence and
admitted a Data Scientist to a Backend Engineer role.

### Weights vary by what the founder is seeking

| Component | Co-founder | Contractor | Advisor | Core hire |
|---|---|---|---|---|
| skillFit | 0.20 | **0.48** | 0.32 | 0.32 |
| roleFit | 0.12 | 0.20 | 0.14 | 0.17 |
| experienceFit | 0.08 | 0.10 | 0.18 | 0.08 |
| compatibilityFit | 0.15 | 0.02 | 0.05 | 0.04 |
| alignmentFit | **0.25** | 0.03 | 0.12 | 0.15 |

The contrast between the first two columns is the design claim. Choosing a
co-founder is mostly about conviction, so alignment dominates. A contract is
defined scope and defined deliverable — whether they love the mission barely
matters, and weighting it as though it did would be dishonest.

### Capability is a ceiling, not a gate

```
capable = roleFit ≥ 0.5  ∨  skillFit ≥ 0.30
S_final = capable ? S : min(S, 0.39)
```

A candidate without demonstrated capability is capped and ranked low, **not
removed** — hiding an item is a stronger claim than ranking it last.

### Semantic layer

`all-MiniLM-L6-v2` via Transformers.js, 384 dimensions, stored in pgvector on
`startups`, `profiles` and `gaps`. Inference runs in a **separate OS process**
via `child_process.fork` — not a worker thread, which shares the parent's heap
and V8 isolate, so a native-module fault would take down the process answering
HTTP. The child is persistent (model loading dominates per-call cost) and
supervised.

Four earlier approaches each failed unreproducibly. The response was to stop
guessing at a root cause and adopt an architecture whose correctness doesn't
depend on having diagnosed one.

---

## Grounded scoring

Where a constant could be sourced, it is. Where it couldn't, the product says
so in the interface.

**Readiness** — weights from CB Insights' analysis of 431 VC-backed failures:
team `0.38`, funding `0.32`, product `0.20`, idea_clarity `0.10`. Critical
issues rank by *points recoverable*, `(1−x)·(w/W)·100`, not an arbitrary
threshold. Team coverage is `NULL`, not `0.5`, when no roles are diagnosed, and
weights renormalise around it.

The page states plainly that **product-market fit (43% of failures) and timing
(29%) are not measured** — they can't be assessed from an idea-stage profile,
so the system reports the gap rather than inventing a proxy.

One dimension was renamed after an audit found it awarding 0.7 for AI-autofilled
fields. The system was rewarding its own output as founder evidence.

**Equity** — Carta hire-order medians with published bands:

| Hire | Median | Band | Provenance |
|---|---|---|---|
| 1 | 1.49% | 0.50–4.00 | observed |
| 2 | 0.85% | 0.30–2.00 | observed |
| 5 | 0.34% | 0.13–0.80 | observed |
| 10 | 0.18% | 0.07–0.42 | median observed, band scaled |

Validated across **22,680 input combinations** — every output inside the
published band. The previous invented-constant model recommended 7.3–13.5% for
a critical first hire; grounded, it recommends 1.56–3.13%.

**Schemes** — 5 Indian schemes, 18 dated criteria, three-state output:
`MET` / `NOT_MET` / `CANNOT_CHECK`. The engine never outputs "eligible".

---

## Resilience

| Layer | Behaviour |
|---|---|
| Scoring | Deterministic. Unaffected by any outage. |
| LLM access | 3 keys rotated, then an OpenAI-compatible fallback |
| Launch assistant | Degrades: all comments, no summary, says so |
| Market signal | Degrades: real cached headlines, no personalised read |
| Idea structuring | Refuses cleanly — the only operation an outage blocks |
| Render crash | Error boundary with a route out, never a white screen |
| Failed fetch | A distinct screen from "nothing matches" |

The fallback evaluates exactly one predicate — *did any key answer?* There is
deliberately no failure-type classification, because the remedial action is
identical for a 429, a 500 and a timeout, and a classifier is a source of
misinterpretation.

That last row matters more than it looks. A skill-demand page once told a
contributor there was nothing to measure when 108 roles were open and the
request had simply failed. Showing "empty" when the truth is "broken" is a
falsehood the user acts on.

---

## Verification

```bash
node scripts/verify-schema.js          # alias-resolving column checker
node scripts/check-frontend-refs.js    # undefined component references
node scripts/check-tailwind-opacity.js # opacity classes that compile to nothing
node scripts/check-connectivity.js     # every link resolves to a real route
node scripts/test-matching-quality.js  # 17 engine invariants
node scripts/test-ai-outage.mjs        # every AI surface, model unavailable
node scripts/test-ai-fallback.mjs      # fallback cannot touch a working path
```

Every one exists because of a specific failure that reached a user, and each
closes a class the build cannot catch:

- The schema guard checked only columns qualified by a literal table name and
  skipped aliases — meaning nearly every query went unchecked. It passed
  `cp.mission` against a table with no such column.
- Vite compiles an undefined identifier without complaint, so a passing build
  says nothing about it. An unimported component took down sign-up three times.
- Tailwind opacity runs in multiples of 5. `text-white/92` matches no class and
  compiles to **nothing**, so text fell back to black on a near-black surface —
  invisible while typing, visible once posted.

### Measured

| | Naive | CapForge |
|---|---|---|
| Wrong-in-list | 7.6% | **4.6%** |
| Precision@5 | 85.5% | **95.8%** |

17/17 invariants hold on the live instance (27 ventures, 108 open roles, 41
contributors). Repeated LLM role diagnosis moves readiness by 0.0–1.3 points,
establishing that AI-diagnosed team coverage is not noise.

### A recall defect precision could not see

A reachability audit found **5 of 26 ventures discoverable from no field in the
picker**. The LLM labels a solar venture "solar energy" and a crop-insurance
venture "agriculture, remote sensing" — neither says "climate". Generated item
vocabulary, human-curated query vocabulary.

19% of the catalogue had zero exposure, and every accuracy metric stayed
healthy throughout, because precision@k only scores what is shown. Where item
representations are model-generated, reachability auditing belongs alongside
accuracy measurement.

---

## Schema

42 migrations. Scoring outputs are persisted as JSONB so every displayed number
is traceable to its components:

- `recommendations` — `score_breakdown` JSONB, `explanation` JSONB, `rank`, `algorithm_version`
- `readiness_assessments` — `breakdown` JSONB, `critical_issues`, `generated_at`
- `alignment_scores` — `mission_hash`, `vision_hash` to detect staleness when either text changes
- `gaps` — `required_skills`, `priority_score`, `embedding vector(384)`
- `investor_watchlist` — `readiness_at_watch`, enabling movement tracking
- `launch_comments` — `tried_it`, which changes how every comment reads

---

## Stack

**Backend** — Node, Express `^4.19.2`, pg `^8.12.0`, PostgreSQL + pgvector,
`@xenova/transformers`, bcryptjs, JWT (`7d`).
**Frontend** — React `^18.3.1`, Vite `^5.4.1`, Tailwind, Recharts, Motion.
**Deployment** — single Render service, Supabase PostgreSQL.

Rate limiting is a custom in-memory token bucket, tiered by cost: 10/min on AI
endpoints, 20/min on auth, 100/min general. Body limits are tiered too — 4 MB
on launches, 2 MB on profiles, 100 kB everywhere else — because a single
permissive limit exposes every endpoint to the memory profile of the most
demanding one.

**Security** — bcrypt hashing, signed JWTs on every protected route, role
gates, and per-object ownership checks beyond authentication: a valid token for
one person cannot read or modify another's venture, deal flow or feedback. Only
email and password are collected.

---

## Running it

```bash
npm install && npm --prefix frontend install
cp .env.example .env
npm --prefix frontend run build
node backend/server.js
```

Apply `database/migrations/*.sql` in order first.

**[RUNBOOK.md](RUNBOOK.md)** — operations, failure modes and recovery.
`node scripts/doctor.js` diagnoses and repairs derived data.
