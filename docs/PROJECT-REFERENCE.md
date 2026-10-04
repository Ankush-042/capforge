# CapForge — Complete Project Reference

Everything about the system in one place: what it is, why it is built the way
it is, how every part works, what was measured, and what was learned. Written
as the single source for a project report, a blackbook, a viva, or a
presentation.

**Live:** `https://capforge-b5cz.onrender.com`
**Repository:** `github.com/Ankush-042/capforge`

| | |
|---|---|
| Source files | 187 |
| Backend modules | 35, mounted as 34 route groups |
| Frontend pages | 56, with 25 shared components, 59 routes |
| Database migrations | 42 |
| Operational scripts | 79 |
| Commits | 436 |
| Live data | 27 ventures, 108 open roles, 41 contributors, 8 investors, 621+ recommendations |

---

# PART 1 — THE PROBLEM

## 1.1 What this is for

Forming a founding team is the earliest and least reversible decision a new
company makes, and it is almost entirely unsupported. A person with an idea has
no structured way to find the person who will build it with them. A capable
engineer has no way to find the venture whose problem they actually care about.
An investor looking at idea-stage companies has nothing to go on but a pitch.

CapForge serves three people at that moment:

- **Founders** — post a venture, have its missing roles diagnosed, find the
  people who fit them, and find out how far from fundable it is.
- **Contributors** — prospective co-founders and early team members. Say what
  you can do and what you want to work on, and see every venture in your
  fields ranked by how well it suits you.
- **Investors** — write what you back and what you pass on, and receive deal
  flow ranked against it with the reasoning shown.

## 1.2 Why existing platforms fall short

Every product in this space is a **directory**. A list of people, a list of
startups, and a keyword search over both. You type "full stack engineer" and
get profiles containing those words. The hard question — whether this
particular person should spend three years of their life on this particular
problem — is left entirely to the user.

Three specific failures follow:

**Keyword matching has no notion of fit.** A keyword search cannot distinguish
a backend engineer who would thrive at an early venture from one who would not,
because it has no model of either side beyond the words on the page.

**Nothing is explained.** When a platform does rank, it rarely says why. The
user is given a number with no argument behind it and no way to disagree.

**Everything flatters.** Products in this space are built to make founders feel
good about their idea, because that is what retains users. None of them say
"this is not ready", "nobody here fits this role", or "we cannot measure that".

## 1.3 The design thesis: honesty as an engineering constraint

CapForge takes the opposite position, and this is the single idea the whole
system is built around:

> **An unsupported recommendation must be structurally impossible, not merely
> unlikely.**

A language model can write a persuasive justification for any pairing. In this
domain people act on those justifications — they email strangers, give away
equity, turn down jobs. So the architecture is built so the system *cannot*
assert what it cannot support.

This shows up as four concrete principles, each implemented rather than stated:

| Principle | Implementation |
|---|---|
| Absence carries no information; order does | Missing signals are excluded and weights renormalise. Nothing is hidden; everything is ranked. |
| Say what cannot be known | Three-state assessment: MET / NOT_MET / **CANNOT_CHECK**. Readiness declares what it does not measure. |
| Every claim needs evidence | The evidence rule, enforced as a system-wide invariant. |
| Label judgement | Every constant is sourced or explicitly marked as judgement, in the interface. |

Representative outputs the system actually shows a user:

- *"No open role fits you."*
- *"We do not measure product-market fit."*
- *"Nothing here is a close fit for your thesis."*
- *"This is our judgement, not data."*

---

# PART 2 — SYSTEM ARCHITECTURE

## 2.1 Overall shape

CapForge is a **modular monolith**: one Node.js/Express process serving both
the JSON API and the compiled React bundle, organised internally into 35
bounded modules.

```
┌──────────────────────────────────────────────────────────────────────┐
│  PRESENTATION                                                        │
│  React 18 SPA · Vite · Tailwind · Recharts · Motion                  │
│  56 pages · 25 components · 59 routes · Error boundary               │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ HTTPS / JSON
┌───────────────────────────────▼──────────────────────────────────────┐
│  API LAYER — Express                                                 │
│  tiered body limits → requireAuth → requireRole → ownership check    │
│  → token-bucket rate limiting                                        │
└───────┬──────────────────────────────────────────┬───────────────────┘
        │                                          │
┌───────▼───────────────────────┐   ┌──────────────▼───────────────────┐
│  DETERMINISTIC SCORING        │   │  LLM AUGMENTATION                │
│  (no model call, ever)        │   │  gpt-oss-120b via Groq           │
│                               │   │                                  │
│  • venture ranking            │   │  • idea structuring              │
│  • candidate ranking          │   │  • match judgement               │
│  • evidence rule              │   │  • mission/vision alignment      │
│  • readiness                  │   │  • market signal                 │
│  • equity                     │   │  • competitors · milestones      │
│  • government schemes         │   │  • legal · assistant             │
│  • domain resolution          │   │  • launch feedback reading       │
└───────┬───────────────────────┘   └──────────────┬───────────────────┘
        │                                          │
        │                            ┌─────────────▼────────────────┐
        │                            │  AVAILABILITY WRAPPER        │
        │                            │  key1 → key2 → key3          │
        │                            │  → OpenAI-compatible fallback│
        │                            └──────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────────┐
│  PERSISTENCE — PostgreSQL + pgvector (Supabase)                      │
│  45 tables · JSONB score breakdowns · 384-d embeddings               │
└──────────────────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  EMBEDDING PROCESS (child_process.fork)      │
        │  all-MiniLM-L6-v2 · 384 dimensions           │
        │  persistent · supervised · auto-restart      │
        └──────────────────────────────────────────────┘
```

## 2.2 Why a monolith

At 27 ventures and ~76 accounts, a service-oriented deployment would introduce
network partitions, eventual consistency and multi-service observability into a
system whose dominant risk lies elsewhere — in the correctness of its scoring
and the honesty of its explanations.

The monolith preserves transactional integrity across the matching, readiness
and recommendation tables without distributed coordination. Module boundaries
preserve the option of extraction should any component later warrant
independent scaling.

## 2.3 The deterministic / probabilistic boundary

**This is the most important architectural decision in the project.**

Every number a user sees — match percentage, readiness score, equity band,
scheme verdict — is computed by code whose output is a pure function of
database state. No scoring path calls a language model.

The LLM is confined to three roles:
1. Converting free text into structured records (idea structuring)
2. Producing **one bounded signal among several** (match judgement, alignment)
3. Generating prose that is never itself a score (assistant, summaries)

**Two consequences follow, and both were verified by fault injection:**

*A total provider outage cannot alter a single ranking.* It can only block the
creation of new structured ventures. Every existing score remains computable.

*A miscalibrated model judgement is bounded.* It can move a score by at most
its blend weight of 0.55, and it cannot manufacture a recommendation at all,
because the evidence rule is evaluated independently of it.

The deterministic layer may *read* persisted LLM outputs (stored alignment
scores, stored judgements). It never *invokes* a model during scoring. When a
persisted signal is missing, the scoring functions renormalise around it rather
than blocking or imputing.

## 2.4 Request lifecycle

```
Browser
  │
  ├─► tiered JSON body limit
  │     4 MB  launch create / edit (images)
  │     2 MB  profile update (avatar)
  │     100 kB everything else
  │
  ├─► requireAuth        verify JWT signature, attach req.user
  ├─► requireRole        persona gate (FOUNDER / CONTRIBUTOR / INVESTOR)
  ├─► ownership check    does this row belong to this user?
  ├─► rate limit         10/min AI · 20/min auth · 100/min general
  │
  └─► handler ─► service ─► pool.query (parameterised) ─► PostgreSQL
```

A single permissive body limit would expose every endpoint to the memory
profile of the most demanding one. Rate limits are tiered by cost: an LLM call
is roughly two orders of magnitude more expensive than a database read.

---

# PART 3 — THE MATCHING ENGINE

This is the core of the system and the part worth understanding in detail.

## 3.1 The venture-first decision

**The engine originally matched roles.** It emitted one row per
*(person, open role)* pair into a recommendations table. Every contributor-
facing surface read that table.

The consequence was a class of false negative that took a real user to find:

> A full-stack builder selected **healthtech** and saw **one** result. The
> platform had two healthtech ventures. The second one's open roles were
> Clinical Advisor, Mobile App Developer and UX/UI Designer.

The engine was **right about the roles** — none of those is a full-stack job.
It was **wrong about the venture**. An early-stage company will create a role
for a strong builder who cares about the problem, and the contributor was never
given the chance to ask.

**The fix: the unit of recommendation is the venture.** Role fit became an
*attribute* of each result rather than a *filter* on it.

| State | Meaning | Can message founder? |
|---|---|---|
| `ROLE_FITS` | Best-fitting role named, with percentage | Yes |
| `NO_ROLE_FITS` | Nothing fits; closest role named | Yes |
| `NO_OPEN_ROLES` | Every role filled | Yes |

The role-first path survives for the founder's genuinely different question:
*rank candidates for this specific gap*. Two questions, two answers.

## 3.2 Contributor-side scoring

```
            Σ (w_k · x_k)   for k ∈ available components
    S  =  ─────────────────
            Σ (w_k)
```

| Component | Weight | What it measures |
|---|---|---|
| domain | 0.35 | Does the venture's field match one the contributor chose |
| alignment | 0.30 | LLM judgement of mission against venture vision |
| capability | 0.25 | Best-fitting open role at this venture |
| stage | 0.10 | Distance between preferred and actual stage |

**Domain leads** because selecting a field is the strongest explicit statement
a contributor makes about where they want to spend years. The weights are
stated in the product as judgement, not measurement.

**Alignment enters only if a stored score exists.** When it is absent its
weight is redistributed across the remaining components. Scoring an unscored
venture as zero would penalise it for a gap in *our* data rather than a
deficiency in the venture.

**Stage fit** over ordered stages `[Idea, Prototype, MVP, Early Traction]`:

```
d = |index(preferred) − index(actual)|

d = 0 → 1.0      d = 1 → 0.7      d = 2 → 0.4
d ≥ 3 → 0.2      either unknown → 0.5
```

**Best-role fit within a venture:**

```
F_v = max over gaps g of  ( 0.65 · roleFit + 0.35 · skillOverlap )

F_v < 0.30  →  NO_ROLE_FITS, closest role named
```

Role match is weighted above skill overlap because somebody who *is* a backend
engineer fits a backend role even when the listed skills differ.

## 3.3 Role fit — a tiered function

```
computeRoleFit(headline, gapRole):

  normalise both, apply synonym groups
  extract every role phrase from the headline, plus the whole headline

  1.00   exact match after normalisation
  0.85   guarded containment — BOTH strings ≥ 8 characters
  0.85   same ROLE_SYNONYMS group  (same job, different words)
  0.50   same ROLE_ADJACENCY group (different but neighbouring jobs)
  0.00   otherwise
```

**The 0.50 tier is load-bearing and deliberately below the 0.8 evidence
threshold.** Being *near* a role is not a reason to appear in the list for it.
When this value sat higher, adjacency acted as evidence and admitted a Data
Scientist to a Backend Engineer role.

The 8-character minimum on containment prevents a short fragment matching half
the platform: `aimlengineering` may contain `aimlengineer`, but a three-letter
fragment may not match anything.

## 3.4 Founder-side candidate scoring

Eight components, with weights that **vary by what the founder is seeking**:

| Component | Co-founder | Contractor | Advisor | Core hire |
|---|---|---|---|---|
| skillFit | 0.20 | **0.48** | 0.32 | 0.32 |
| roleFit | 0.12 | 0.20 | 0.14 | 0.17 |
| domainFit | 0.08 | 0.10 | 0.13 | 0.12 |
| stageFit | 0.08 | 0.05 | 0.04 | 0.08 |
| experienceFit | 0.08 | 0.10 | **0.18** | 0.08 |
| availabilityFit | 0.04 | 0.02 | 0.02 | 0.04 |
| compatibilityFit | **0.15** | 0.02 | 0.05 | 0.04 |
| alignmentFit | **0.25** | 0.03 | 0.12 | 0.15 |

**The contrast between the first two columns is the design claim.**

Choosing a co-founder is mostly about conviction, so alignment is the single
heaviest component at 0.25. A contract is defined scope and defined deliverable
— whether they love the mission barely matters, so alignment collapses to 0.03
while skill rises to 0.48. Weighting mission heavily for a contractor would be
dishonest about what the relationship is.

**Component definitions:**

```
skillFit  =  0.5 · literalOverlap + 0.5 · cosineSimilarity   (if embedding exists)
          =  literalOverlap                                   (otherwise — no imputation)

compatibilityFit  =  0.6 · commitmentScore + 0.4 · equityMindedness
```

**Blending the model judgement:**

```
blended  =  0.55 · matchJudgement  +  0.45 · baseScore
```

The LLM never stands alone. It is one signal, bounded by its weight.

**Capability ceiling — not a gate:**

```
capable   =  roleFit ≥ 0.5  ∨  skillFit ≥ 0.30
S_final   =  capable ? S : min(S, 0.39)
```

A candidate without demonstrated capability is **capped and ranked low, not
removed**. Hiding an item is a stronger claim than ranking it last.

**Mismatch damping:**

```
if alignment < 0.35:   damp = 0.45 + 0.55 · (alignment / 0.35)
```

## 3.5 The evidence rule

**The precision mechanism of the whole system.** A candidate recommendation is
emitted only if at least one holds:

```
E  =  literalSkillOverlap ≠ ∅
   ∨  roleFit         ≥ 0.8
   ∨  matchJudgement  ≥ 0.6
   ∨  cosineSimilarity ≥ 0.5
```

Enforced as a **system-wide invariant** by a quality rule, not as a convention
that could drift. The rationale: a confident-sounding explanation with nothing
behind it is the failure mode that makes matching products useless. If the
system cannot name why, it does not say.

## 3.6 Semantic layer

| | |
|---|---|
| Model | `all-MiniLM-L6-v2` via Transformers.js (`@xenova/transformers`) |
| Dimensions | 384 |
| Storage | pgvector on `startups.embedding`, `profiles.embedding`, `gaps.embedding` |
| Index | None. At 27 ventures and 108 gaps exact search is trivially cheap. |
| At scale | IVFFlat or HNSW, when the catalogue warrants it |

**Process isolation.** Inference runs in a separate OS process created by
`child_process.fork` — deliberately **not** a worker thread. A worker thread
shares the parent's heap and V8 isolate, so a native-module fault or an
unbounded allocation inside the inference pipeline degrades the process
answering HTTP requests. A forked child has an independent address space and
can be killed and respawned without touching in-flight requests.

The process is **persistent** (model loading dominates per-call cost, so
one-shot workers are prohibitively expensive) and **supervised** (the parent
restarts it on exit).

Four earlier approaches — a direct blocking call, fire-and-forget, a persistent
`worker_thread`, and one-shot workers — each failed eventually in ways that
could not be reproduced reliably. The response was to stop attributing a root
cause and adopt an architecture whose correctness does not depend on having
diagnosed one.

## 3.7 Domain resolution

Two labels match through four ordered tests:

```
1. exact equality after normalisation
2. shared DOMAIN_EQUIVALENTS group
3. guarded boundary containment
   — shorter string ≥ 4 chars
   — must sit at a separator boundary in the longer
4. shared distinctive token
   — excluding GENERIC_SKILL_TOKENS and GENERIC_DOMAIN_TOKENS
```

`GENERIC_DOMAIN_TOKENS` = tech, technology, software, platform, platforms,
services, solutions, systems, management, automation, analytics, digital,
online, data, tools, application, applications, enterprise.

Both guards exist because of real defects, documented in Part 7.

---

# PART 4 — ASSESSMENT MODULES

## 4.1 Readiness

**Weights derived from CB Insights' analysis of 431 failed VC-backed
companies**, not invented:

| Dimension | Weight |
|---|---|
| team | 0.38 |
| funding | 0.32 |
| product | 0.20 |
| idea_clarity | 0.10 |

```
        Σ (w_d · x_d)                                w_d
R = 100 ─────────────         p_d = (1 − x_d) · ───────── · 100
             W                                       W

W = Σ w_d  over dimensions present
p_d = points recoverable, used to rank critical issues
```

**Three honesty mechanisms:**

*Team coverage is `NULL`, not `0.5`, when no roles are diagnosed.* Weights
renormalise around the missing dimension rather than inventing a midpoint.

*Critical issues rank by points recoverable*, not an arbitrary threshold —
so the issue shown first is genuinely the one worth fixing first.
`CRITICAL_BELOW = 0.6` and `WORTH_SAYING = 3` points, both labelled judgement.

*The page states what is not measured.* Product-market fit (43% of failures)
and timing (29%) cannot be assessed from an idea-stage profile, so the system
reports the gap rather than inventing a proxy.

**A self-reward defect found by audit:** a dimension originally called "market
positioning" was awarding 0.7 for AI-autofilled fields. The system was
rewarding its own output as founder evidence. It was renamed `idea_clarity` and
redefined.

Live distribution: scores range 29–62, mean ≈ 39.

## 4.2 Equity guidance

Three models, each anchored to published benchmarks.

**CORE_HIRE** — Carta medians by hire order, from 8,000+ initial grants:

| Hire | Median | Low | High | Provenance |
|---|---|---|---|---|
| 1 | 1.49% | 0.50 | 4.00 | observed |
| 2 | 0.85% | 0.30 | 2.00 | observed |
| 3 | 0.50% | 0.21 | 1.20 | observed |
| 4 | 0.44% | 0.18 | 1.00 | observed |
| 5 | 0.34% | 0.13 | 0.80 | observed |
| 10 | 0.18% | 0.07 | 0.42 | median observed, band scaled |
| 6–9 | interpolated | | | derived |
| >10 | hire-10 band | | | derived |

`COMMITMENT_FACTOR` = full-time 1.0, part-time 0.5.

**CO_FOUNDER** — equal-split reference. Carta: 45.9% of co-founder teams split
equally in 2024.

**ADVISOR** — Founder Institute FAST agreement v3, a grid of company maturity
against advisor involvement, 0.1%–1%.

**Validation:** an exhaustive sweep over six input dimensions (hireOrder,
stage, commitment, priorityLevel, cashCompensation, experienceYears) covering
**22,680 combinations** confirmed every output stays inside the published band.

**Before and after grounding:** the previous invented-constant model recommended
**7.3–13.5%** for a critical full-time first hire at idea stage. The
benchmark-grounded model recommends **1.56–3.13%** — roughly a 4–5× correction
toward market reality.

## 4.3 Government scheme eligibility (India)

Five schemes, 18 criteria, all sourced and dated (verified 2026-09-25):

| Scheme | What it gives |
|---|---|
| DPIIT Recognition | Free, 2–7 days, unlocks the rest |
| Startup India Seed Fund (SISFS) | Up to ₹20 L grant + ₹50 L convertible debt; ₹945 Cr corpus, 300+ incubators |
| Section 80-IAC | Three-year income tax holiday |
| NIDHI-PRAYAS | Up to ₹10 L for hardware/deeptech prototype |
| BIRAC BIG | Up to ₹50 L for biotech |

**Three-state output per criterion — the engine never says "eligible":**

```
MET            the criterion is satisfied
NOT_MET        the criterion is not satisfied
CANNOT_CHECK   the profile does not contain what this needs
```

This is a general pattern for honest automated assessment under incomplete
information, and arguably the most portable idea in the project.

**A source conflict is surfaced rather than resolved silently:** older guides
state a ₹100 Cr turnover cap, the 2026 notification states ₹200 Cr. The
government source is used and the discrepancy is shown to the user.

---

# PART 5 — DATA MODEL

45 tables across 42 migrations. The ones that matter:

## 5.1 Identity

```
users                  id, email (unique), password_hash, primary_role
profiles               user_id, display_name, headline, skills[], embedding v(384)
contributor_profiles   profile_id, preferred_domains[], preferred_stage,
                       looking_for, availability, commitment_type, equity_preference
investor_profiles      profile_id, thesis, preferred_domains[], preferred_stages[],
                       ticket_min, ticket_max
```

## 5.2 Ventures and roles

```
startups               id, founder_id, name, problem, solution, domain[], stage,
                       founder_vision, verification_status, embedding v(384),
                       entity_type, incorporation_date, prior_govt_funding_lakhs
gaps                   id, startup_id, role, required_skills[], priority_level,
                       priority_score, seeking_type, status, embedding v(384)
startup_team_members   startup_id, user_id, role, skills[], is_founder, joined_at
```

## 5.3 Scoring outputs — all auditable

```
recommendations        startup_id, source_gap_id, target_user_id,
                       recommendation_type, score, rank,
                       score_breakdown JSONB,   ← every component, inspectable
                       explanation JSONB,       ← what was claimed and why
                       status, algorithm_version
readiness_assessments  startup_id, overall_score, dimensions,
                       critical_issues, top_actions, breakdown JSONB,
                       algorithm_version, generated_at
alignment_scores       user_id, startup_id, score, reason,
                       mission_hash, vision_hash   ← staleness detection
match_judgements       the LLM's verdict, persisted so scoring can read it
                       without invoking a model
```

**Storing breakdowns as JSONB is what makes the honesty claims checkable.**
Every displayed number traces to its components, and the quality rules audit
explanations against current profiles.

**The hashes on `alignment_scores`** detect when a mission or vision has
changed, so a stale score can be identified rather than silently trusted.

## 5.4 Collaboration

```
conversations    founder_confirmed, other_confirmed, team_formed_at
                 ← two-sided handshake; a team forms only when both say yes
messages         conversation_id, sender_id, content, read_at
workspaces       UNIQUE(startup_id)   ← the constraint behind a real bug, §7.6
rooms / room_posts / room_presence / member_rooms
launches         startup_id, title, summary, link, images, state, asking_about
launch_comments  body, parent_id, tried_it   ← one boolean that changes
                                                how every comment reads
investor_watchlist  investor_id, startup_id, status, note, readiness_at_watch
                    ← enables "moved since you marked them"
```

---

# PART 6 — RESILIENCE AND OPERATIONS

## 6.1 What survives what

| Failure | Consequence |
|---|---|
| All LLM providers down | Every score still computes. Only *new* venture creation blocked. |
| Groq rate limited | Keys rotate; then fallback provider; then clean refusal |
| Render crash in React | Error boundary shows a page with a route out |
| A fetch fails | A *distinct* screen from "nothing matches" |
| Supabase paused | Resume from dashboard, ~1 minute. Data intact. |
| Database lost | Restore from `pg_dump` backup |

## 6.2 Four-layer AI availability

```
GROQ_API_KEY → GROQ_API_KEY_2 → GROQ_API_KEY_3 → OpenAI-compatible fallback
```

**One predicate is evaluated: did any key answer?** There is deliberately no
failure-type classification — no distinguishing a 429 from a 500 from a
timeout. The remedial action is identical in every case, and a classifier is
itself a source of misinterpretation.

With no fallback configured, the original failure is returned byte-identically,
so configuring resilience never changes the behaviour of an unconfigured
deployment.

## 6.3 Degradation behaviour, verified by fault injection

| Surface | Under total outage |
|---|---|
| All scoring | Unaffected — no model call exists |
| Launch assistant | **Degrades** — all real comments, no summary, says so |
| Market signal | **Degrades** — real cached headlines, no personalised read |
| Idea structuring | **Refuses cleanly** — cannot invent a structured venture |

Idea structuring is the only operation a full outage blocks. It refuses with an
actionable error rather than degrading silently.

## 6.4 Failure is never shown as emptiness

`"Nothing on the platform is about that"` and `"This could not be loaded"` are
**different screens**. Showing the first when the second is true is a falsehood
the user acts on.

A concrete instance: a skill-demand page told a contributor there was nothing
to measure when the platform had 108 open roles and the request had simply
failed.

## 6.5 Operational tooling

```bash
node scripts/doctor.js            # diagnose everything
node scripts/doctor.js --fix      # repair derived data only
node scripts/doctor.js --rehearse # the night before
node scripts/backup.js            # full pg_dump
```

The doctor checks database reachability, migration state, **each API key
tested** (not merely present), build freshness, embedding coverage, ranking
coverage, readiness coverage, JWT secret strength, and the quality suite.

Every fault it reports says three things: **what is wrong, what it means for
somebody using the product, and the exact command that fixes it.** `--fix`
executes only repairs that regenerate derived data — it never deletes, never
migrates, never touches anything a person wrote.

## 6.6 Security

| Concern | Implementation |
|---|---|
| Passwords | bcrypt hashed, never stored |
| Sessions | Signed JWT, 7-day expiry, verified on every protected route |
| Authorisation | `requireAuth` → `requireRole` → per-object ownership check |
| SQL injection | Every user value parameterised; no string interpolation |
| Rate limiting | Token bucket: 10/min AI, 20/min auth, 100/min general |
| Secrets | Production **refuses to start** without a real `JWT_SECRET` |
| Data minimisation | Only email and password collected. No phone, no tracking. |

**Ownership goes beyond authentication.** A valid token for user A cannot read
or modify user B's venture, deal flow, or private launch feedback — each
service verifies the row belongs to the caller.

---

# PART 7 — DEFECTS FOUND, AND WHAT THEY TEACH

This section is the most valuable part of the project for a viva. Each of these
is a real failure with a root cause and a general lesson.

## 7.1 Role-first matching hid entire ventures *(recall)*

Described in §3.1. **Lesson: absence is not a neutral state.** A user reads an
empty result as "nothing exists", so filtering is a stronger claim than
ranking and must be justified more carefully.

## 7.2 Substring collision in domain matching *(precision)*

```javascript
a.includes(b) || b.includes(a)
// 'medtech'.includes('edtech') === true
```

Edtech ventures matched medtech ones. **The same bug existed independently in
the scheme catalogue.** Fixed with boundary-guarded containment, which keeps
legitimate cases like `health` ~ `health tech`.

**Lesson: a convenience that works on examples fails on neighbours.**

## 7.3 Generic token collision *(precision)*

A rule matching any shared token longer than three characters meant **"tech"
is four characters** — so `hr tech` matched `legal tech`. ClauseIQ, a contract
analysis venture, appeared under HR tech; TeamPulse appeared under legal tech.

Fixed with a `GENERIC_DOMAIN_TOKENS` stoplist. Both fields correctly dropped
from 2 ventures to 1.

**Lesson: a length threshold is not a specificity threshold.**

## 7.4 Unreachable ventures — the most important defect *(recall)*

A reachability audit found **5 of 26 ventures discoverable from no field in the
user-facing picker.**

| Venture | LLM-generated labels | Intended field |
|---|---|---|
| AdPilot | advertising technology (adtech), marketing automation, AI | marketing |
| ClimateLens | agriculture, insurance, remote sensing, geospatial | climate |
| EcoCharge | electric vehicles, energy, AI, smart grid | climate |
| GrowthLoop | advertising technology, marketing, AI | marketing |
| SkillBridge | education technology, career development, AI | edtech |

**Root cause: the LLM generates item vocabulary freely while the picker
vocabulary is human-curated.** A solar venture is labelled "solar energy", a
crop-insurance venture "agriculture, remote sensing" — neither says "climate".

**19% of the catalogue had zero exposure, and every accuracy metric stayed
healthy throughout, because precision@k only scores what is shown.**

Fixed by widening equivalence groups against the labels the model actually
produces, and adding a missing picker field.

**Lesson, and the project's most transferable finding: where item
representations are model-generated, reachability auditing belongs alongside
accuracy measurement. The harm is an exposure-fairness failure, not a relevance
failure, and precision metrics are structurally blind to it.**

## 7.5 The readiness dimension that rewarded the system's own output

"Market positioning" awarded 0.7 for AI-autofilled fields. The system was
treating its own generated text as founder evidence. **Lesson: when a system
both generates and evaluates, check for circularity explicitly.**

## 7.6 Check-then-insert race in workspace creation

```javascript
// before — races, because the page issues several concurrent requests
const existing = await query('SELECT * FROM workspaces WHERE startup_id = $1');
if (existing.rows.length) return existing.rows[0];
await query('INSERT INTO workspaces ...');   // two requests both arrive here
```

Produced a duplicate-key violation on **first visit, every time**. Fixed with
`INSERT ... ON CONFLICT DO NOTHING` followed by `SELECT`, which is correct
regardless of concurrency.

**Lesson: let the database arbitrate uniqueness.**

## 7.7 A schema guard that checked almost nothing

The schema verifier only checked columns whose qualifier was a **literal table
name**, skipping anything that looked like an alias. Since nearly every query
uses aliases, the check was close to a no-op — it passed `cp.mission` against a
`contributor_profiles` table with no such column, and the fault surfaced as a
500 in front of a user.

**Lesson: a guard that silently covers nothing is worse than no guard, because
it buys false confidence.**

## 7.8 Tailwind opacity compiling to nothing

Tailwind's opacity scale runs in **multiples of 5**. Anything else matches no
generated class and compiles to **nothing**, silently.

- `bg-white/8` → no background → white input, white text → **invisible typing**
- `text-white/92` → no colour → black text on near-black → **invisible until posted**

Three user-visible bugs of identical shape. **Lesson: a utility framework can
fail silently in a way a compiler cannot catch — a passing build proves
nothing about it.**

## 7.9 Undefined component references

Vite compiles an undefined identifier without complaint. An unimported
component took down the sign-up page **three times** before a checker was
written. **Lesson: build success and runtime correctness are different
properties.**

---

# PART 8 — VERIFICATION

## 8.1 The guard suite

```bash
node scripts/verify-schema.js            # alias-resolving column checker
node scripts/check-frontend-refs.js      # undefined component references
node scripts/check-tailwind-opacity.js   # opacity classes compiling to nothing
node scripts/check-connectivity.js       # every link resolves to a real route
node scripts/test-matching-quality.js    # 17 engine invariants
node scripts/test-ai-outage.mjs          # every AI surface, model unavailable
node scripts/test-ai-fallback.mjs        # fallback cannot touch a working path
node scripts/test-error-boundary.mjs     # the boundary is correctly wired
```

**Every one exists because of a specific failure that reached a user.** Each
closes a class the build cannot catch.

## 8.2 The 17 invariants

Grouped by the property each protects:

**Match plausibility**
1. Backend engineers are not top-matched to design roles (30% threshold)
2. Designers are not top-matched to backend roles
3. Every gap's top candidate has a genuine role match or real skill overlap
11. Every active recommendation satisfies the evidence rule

**Explanation faithfulness**
7. Every shown recommendation has a real explanation
9. No explanation claims a role match the profile no longer supports
10. No explanation claims a skill overlap it cannot name

**Referential integrity**
4. No duplicate role rows for the same venture
5. No recommendations point at filled or dismissed gaps
6. No unverified or system-import ventures leak into recommendations
8. No two ventures share the same name

**Investor-side correctness**
13. Investor deal flow respects thesis domain — no 50%+ match with zero domain fit
14. Readiness still shapes investor deal-flow order

**Data completeness**
12. No contributor with a mission is missing alignment scores
15. No investor with a thesis is missing alignment scores
16. Every real venture has a founder vision
17. Every seeded contributor has a mission

**Invariant testing differs from metric testing.** It asserts that whole
classes of embarrassing error are *absent* from the deployed state, rather than
estimating an average rate.

## 8.3 Measured results

| Metric | Naive baseline | CapForge | Change |
|---|---|---|---|
| Wrong-in-list rate | 7.6% | **4.6%** | −3.0 pp (−39% rel.) |
| Precision@5 | 85.5% | **95.8%** | +10.3 pp |

| Other measurements | Result |
|---|---|
| Quality invariants | 17 / 17 passing |
| Readiness swing across repeated LLM runs | 0.0 – 1.3 points |
| Equity combinations within published band | 22,680 / 22,680 |
| Fallback suite | 4 / 4 passing |

**Role-diagnosis stability** was assessed by repeating LLM structuring on the
same ideas. The 0.0–1.3 point swing establishes that AI-diagnosed team coverage
is not noise. The verdict is based on *score impact*, not string equality of
role names — string equality was tried first and produced a false positive,
because semantically identical roles were named differently.

---

# PART 9 — TECHNOLOGY AND DEPLOYMENT

## 9.1 Stack

**Backend** — Node.js 22, Express ^4.19.2, pg ^8.12.0, PostgreSQL + pgvector,
`@xenova/transformers`, bcryptjs ^2.4.3, jsonwebtoken.

**Frontend** — React ^18.3.1, Vite ^5.4.1, Tailwind CSS, Recharts, Motion,
lucide-react.

**AI** — `openai/gpt-oss-120b` via Groq; `all-MiniLM-L6-v2` locally;
Tavily for competitor web search; Resend for transactional email.

## 9.2 Deployment

```
Browser
   │ HTTPS
   ▼
Render web service  ──────────►  Supabase PostgreSQL + pgvector
  Express API                         (managed, free tier)
  + static React build
  + forked embedding process
   │
   └──────────────────────────►  Groq (3 keys) → fallback provider
```

Single service serving API and frontend — one origin, no CORS, one deployment
target. Uptime monitor pings every 5 minutes, preventing both the free-tier
cold start and Supabase idle-pausing.

## 9.3 Environment

```
DATABASE_URL          PostgreSQL connection string
JWT_SECRET            long random; production refuses to start without it
NODE_ENV              production
GROQ_API_KEY(_2,_3)   rotated in order
FALLBACK_API_KEY      optional last resort
FALLBACK_BASE_URL     any OpenAI-compatible host
TAVILY_API_KEY        competitor research
RESEND_API_KEY        transactional email
EMAIL_FROM            sender identity
APP_URL               for links in emails
```

---

# PART 10 — WHAT THE PROJECT DEMONSTRATES

## 10.1 Claims that are supported

**A recommender can be built so the explanations it shows are the explanations
it can defend.** The evidence rule makes an unsupported recommendation
structurally impossible, and a quality invariant proves it holds across the
whole deployed state.

**Refusing to answer is an implementable design target.** Three-state
assessment, explicit `NO_ROLE_FITS`, and declared unmeasured dimensions are
mechanisms, not slogans.

**Scoring constants can be grounded and the rest labelled.** Equity moved 4–5×
toward market reality when invented constants were replaced with Carta data.

**A deterministic/LLM split makes a system genuinely resilient.** Under total
model outage every score still computes — verified by fault injection, not
assumed.

**Reachability auditing catches harms precision cannot see.** 19% of the
catalogue was invisible while every accuracy metric stayed healthy.

## 10.2 Claims that are not made

- **No claim that CapForge produces better teams.** No longitudinal outcome
  data exists.
- **No user study.** Perceived usefulness, trust and explanation quality are
  unmeasured.
- **No online evaluation.** No A/B test against a baseline on live outcomes.
- **No performance benchmarking.** Latency and throughput are unmeasured.
- **Weights are judgement, not calibration.** Stated as such in the product.
- **Benchmarks are US-derived**, applied to Indian idea-stage ventures. The
  transfer is assumed, not demonstrated.
- **Small dataset.** 27 ventures, partly seeded. Results are indicative.

## 10.3 Likely viva questions, and honest answers

**"Why not use collaborative filtering?"**
There is no interaction history. At 27 ventures and 41 contributors there is
nothing to collaborate on. The system is a content-based weighted hybrid by
necessity, and `recommendation_feedback` exists to make learning possible later.

**"Isn't the LLM doing the real work?"**
No. Every number is deterministic. The LLM structures text and contributes one
bounded signal capped at 0.55 blend weight. Under total model outage every
score still computes — this was tested, not assumed.

**"How do you know the matching is good?"**
Two ways. Seventeen invariants assert that classes of error are absent from the
deployed state. And a comparison against a naive baseline shows precision@5 of
95.8% against 85.5%. Both are offline; there is no user study, and that is
stated as a limitation.

**"Where did the weights come from?"**
Readiness from CB Insights' 431-company failure analysis. Equity from Carta's
8,000+ grants and the FAST agreement. The matching weights are judgement, and
the product says so on the page where they are used.

**"What is the hardest bug you found?"**
The reachability defect. Five ventures were discoverable from no field in the
picker because the LLM labels vocabulary freely and the picker is curated. 19%
of the catalogue was invisible and every accuracy metric stayed healthy,
because precision only scores what is shown.

**"What would you do next?"**
A controlled user study comparing the system with and without the evidence
rule, because the central claim — that refusing beats guessing — is an
empirical claim about users that has not been tested.
