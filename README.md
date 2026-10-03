# CapForge

Where it stops being an idea and starts being real.

A platform for the earliest part of building a company: finding the person who
will build it with you, working out what the venture is actually missing, and
getting it in front of investors who back that kind of thing — with an engine
that tells you the truth about all three.

---

## The idea

Everything in this space is a directory. A list of people, a list of startups,
a keyword search wearing a nicer coat. You search "full stack engineer", you
get people with those words in their profile, and the hard part — whether this
particular person should spend three years of their life on this particular
problem — is left entirely to you.

CapForge takes that question seriously, and takes a position most products here
will not:

**It tells you things you would rather not hear.** No open role fits you. We
cannot measure product-market fit. Nothing here is a close fit for your thesis.
This number is our judgement, not data.

That honesty is the product. Flattery has never built a company, and a platform
that hides a weak venture until it decides you are ready has made a judgement
that belongs to you.

---

## What it does

### For a founder

Describe the problem you cannot stop thinking about, in your own words. The
platform structures it into a venture, works out which roles it genuinely needs
and how badly, then finds the people who fit them — showing the reasoning, so
you can disagree with it.

Then it tells you where you stand: a readiness score built from what actually
kills companies, what is holding it back, what to do next, what an investor
will ask about, and which government schemes you qualify for.

### For a contributor

Say what you can do and what you want to work on. Every venture in your fields
comes back ranked by how well it suits you — including ones with no open role
for you, which say so plainly, because you may want them anyway and a founder
will talk to somebody who cares about the problem.

You are told why you are or are not being found, what skills the platform is
short of, what to learn next ranked by how many real ventures it opens, and
what an equity offer is worth against published benchmarks.

### For an investor

Write what you back and what you pass on — the second half matters as much as
the first. Deal flow ranks every venture against it with the reasoning shown.
Nothing is hidden: a weak venture sinks and says why. Track anything worth
following and you are told when it moves.

---

## How the matching actually works

This is the part worth reading.

### The unit is the venture, not the role

The engine originally matched roles, which meant a venture with no open role
you fit did not exist to you. A full-stack builder who chose healthtech saw one
result, because the other healthtech venture needed a clinical advisor, a
mobile developer and a designer.

That was a correct judgement about the roles and a wrong conclusion about the
venture. **Absence carries no information. Order does.** Everything in your
fields is ranked, and nothing is dropped.

### Every score is rules, not AI

Matching, readiness, equity, government schemes and the venture ranking never
call a language model. They cannot be affected by an API outage, a rate limit,
or a model having an off day. The AI structures text and makes judgements that
feed the scoring; it never produces a number on its own.

### Nothing is recommended without evidence

A recommendation is only made when something real sits behind it: literal skill
overlap, a genuine role match, a strong model judgement, or real semantic
similarity. Below that bar it is not shown, because a confident-sounding
explanation with nothing behind it is how matching products become useless.

### The numbers are sourced, or labelled as judgement

| What | Where it comes from |
|---|---|
| Equity ranges | Carta, 8,000+ initial grants; Carta Founder Ownership Report 2026; Founder Institute FAST v3 |
| Readiness weights | CB Insights, 431 VC-backed company failures |
| Government schemes | DPIIT, SISFS, Section 80-IAC, NIDHI-PRAYAS, BIRAC BIG — official notifications, dated |
| Everything else | Labelled in the product as our judgement, with the reasoning shown |

Where something cannot be measured, the product says so. Readiness states
plainly that product-market fit (43% of failures) and timing (29%) cannot be
measured from an idea-stage profile, rather than inventing a proxy.

---

## Running it

```bash
npm install
npm --prefix frontend install

cp .env.example .env        # then fill it in

npm --prefix frontend run build
node backend/server.js      # http://localhost:3000
```

For development with hot reload:

```bash
npm --prefix frontend run dev    # http://localhost:5173
```

### Environment

```
DATABASE_URL=         # Postgres; Supabase works
JWT_SECRET=           # any long random string
GROQ_API_KEY=         # console.groq.com
GROQ_API_KEY_2=       # optional, rotated when the first is rate limited
GROQ_API_KEY_3=       # optional

FALLBACK_API_KEY=     # optional, any OpenAI-compatible host
FALLBACK_BASE_URL=    # reached only when every Groq key has failed
```

Apply `database/migrations/*.sql` in filename order before the first run.

---

## If something breaks

```bash
node scripts/doctor.js          # what is wrong, what it means, how to fix it
node scripts/doctor.js --fix    # repair what can safely be repaired
node scripts/doctor.js --rehearse
```

The doctor checks the database, every migration, each API key, the build,
embeddings, rankings and the quality suite. Every fault says what it means for
somebody using the product and names the command that fixes it. `--fix` runs
those commands and only ever regenerates derived data — it will never delete,
never migrate, and never touch anything a person wrote.

**[RUNBOOK.md](RUNBOOK.md)** covers every fault that has actually happened in
this project, with its symptom and its fix.

---

## Built so it does not break

- **Every score is deterministic.** No AI surface can take down a number.
- **Every AI surface degrades.** Proven by a suite that calls each one with the
  model completely unavailable. The launch assistant shows every comment
  without the summary; the market signal shows the real headlines without the
  read.
- **Four layers before anything fails.** Three Groq keys rotate, then an
  OpenAI-compatible fallback. Rotation is unchanged and still first; the
  fallback is reached only when everything else has already failed.
- **An error boundary** turns a render crash into a page with a way out rather
  than a white screen.
- **A failed fetch is never shown as an empty answer.** "Nothing on the platform
  is about that" and "this could not be loaded" are different screens, because
  showing the first when the second is true is a lie somebody acts on.

### Checks that run before anything ships

```bash
node scripts/verify-schema.js          # every column exists, aliases resolved
node scripts/check-frontend-refs.js    # every component is imported
node scripts/check-connectivity.js     # every link resolves to a real route
node scripts/test-matching-quality.js  # 17 rules the engine must not break
node scripts/test-ai-outage.mjs        # every AI surface with the model gone
node scripts/test-ai-fallback.mjs      # the fallback cannot affect a working path
```

Each exists because of a fault that reached a person. The schema guard was
rewritten after it passed `cp.mission` against a table with no such column; the
reference checker was written after an unimported component took down the
sign-up page for the third time.

---

## Stack

**Backend** — Node, Express, Postgres with pgvector for semantic matching, Groq
for language work, JWT auth with bcrypt.

**Frontend** — React, Vite, Tailwind, Recharts, Motion.

187 source files, 77 scripts, 42 migrations.

---

## Security

Passwords are hashed with bcrypt and never stored. Sessions are signed JWTs,
verified on every protected route. Role gates mean an investor cannot reach a
founder endpoint, and ownership is checked beyond authentication — a valid
token for one person cannot read or edit another's venture, deal flow or
feedback.

Only what the product uses is collected: an email and a password. No phone
numbers, no tracking.

---

## Accounts

```bash
node scripts/write-credentials.js    # writes SEED-ACCOUNTS.md
```

Generated from the database rather than maintained by hand, because a list kept
by hand goes stale the first time anything is seeded.
