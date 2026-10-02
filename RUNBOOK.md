# If something breaks

Written for one situation: you are alone, something is wrong, and there is
nobody to ask. Every entry here is a fault that has actually happened in this
project, not a hypothetical.

**Start here, always:**

```
node scripts/doctor.js
```

It checks everything and tells you what is wrong, what it means, and the
command that repairs it. If it names a fix, run:

```
node scripts/doctor.js --fix
```

That repairs only things that can be computed again — embeddings, rankings,
readiness, alignment. It will never delete anything, never run a migration,
and never touch anything a person wrote.

**The night before anything important:**

```
node scripts/doctor.js --rehearse
```

---

## Running it at all

```
node backend/server.js              backend, port 3000
npm --prefix frontend run dev       frontend, port 5173
```

Both need to be running. The backend also serves the built frontend on port
3000, so for a demonstration you can run only the backend after building:

```
npm --prefix frontend run build
node backend/server.js
```

That is one process instead of two, and one fewer thing to go wrong.

---

## A page is blank or white

**You will see:** nothing, or a panel saying "This page stopped working."

The error boundary catches crashes and offers a reload, so a true white screen
means the crash happened before React mounted.

1. Open the browser console. The error is there and names the file.
2. If it says *X is not defined*, that is a missing import:
   ```
   node scripts/check-frontend-refs.js
   ```
   It names the file and the component. Add the import, rebuild.
3. If it mentions a network or 500 error, the backend is down or throwing.
   Look at the terminal running `node backend/server.js`.

This exact class of fault has happened three times. The checker above catches
it before it ships.

---

## A page loads but is empty when it should not be

**First:** is it empty, or did it fail to load? The product distinguishes
these. "Nothing on the platform is about that" is an answer; "could not be
loaded" is a fault. If you see the first and do not believe it, check the
console for a failed request.

**If recommendations are genuinely missing:**
```
node scripts/rerank-everything.js
```

**If a contributor sees no ventures in their fields**, that may be correct —
open the Opportunities page and read the count it states. If it says two
ventures are in your fields, two is the truth.

---

## Nothing matches anybody

```
node scripts/doctor.js --fix
```

If it persists:
```
node scripts/backfill-gap-embeddings.js
node scripts/score-alignment.js
node scripts/rerank-everything.js
node scripts/test-matching-quality.js
```

In that order. Each depends on the one before it.

---

## "Groq key exhausted" in the terminal

**This is not a failure.** Keys rotate automatically and every AI surface
degrades to real content without the model:

- The assistant shows the facts without the prose.
- Market signal shows the cached search results.
- Launch feedback shows every comment, without the summary.
- Matching, readiness, equity and schemes **do not use the model at all** and
  are completely unaffected.

**The one thing that genuinely fails:** creating a NEW venture, because
structuring needs the model. Everything that already exists is fine.

Per-minute limits reset in a minute. Daily limits reset at midnight UTC.

Do not run seeding scripts on a day that matters — they make hundreds of calls
in minutes and that is what exhausts a daily quota. Normal use makes a handful.

---

## Login fails for an account you know is right

Almost always whitespace from autofill. Email is trimmed on both register and
login, so this should not happen, but to check an account:

```
node scripts/account-tool.js find <email>
```

Seeded accounts all use `SeedPass123!`. The full list, generated from the
database rather than maintained by hand:

```
node scripts/write-credentials.js
```

Then read `SEED-ACCOUNTS.md`.

---

## The database is unreachable

A free Supabase project **pauses after a week of inactivity.** It is resumed
from the Supabase dashboard and takes about a minute. This is the single most
likely cause of everything being broken at once after not touching the project
for a while.

Otherwise check `DATABASE_URL` in `.env`.

---

## A migration was missed

The doctor names the file. Apply it in the Supabase SQL editor, in filename
order. They are in `database/migrations/`.

Symptom of a missed one: newer features throw while everything older works.
Error messages say *column X does not exist*.

---

## Scores changed and you do not know why

Readiness is recomputed when a venture changes — a role filled, a team member
joining. That is correct behaviour, and the trajectory on the venture page
shows what caused each move.

To see the whole history:
```
node scripts/check-domains.js        what each venture is reachable from
node scripts/doctor.js               everything else
```

---

## Before you show it to anybody

```
git pull
npm --prefix frontend install
npm --prefix frontend run build
node scripts/doctor.js --rehearse
```

If the rehearsal says READY, it is ready.

**And have a fallback:** if the internet is unreliable where you are
presenting, run it locally. Everything except Groq works without a connection,
and Groq only affects AI surfaces, all of which degrade.

---

## What cannot break

Worth knowing, because it narrows where to look:

- **Every score is rules, not AI.** Matching, readiness, equity, government
  schemes and the venture ranking never call a model. They cannot be affected
  by an API outage or a rate limit.
- **Passwords are hashed with bcrypt.** They are not stored and cannot be read.
- **The error boundary catches render crashes** and always offers a route out.
- **Nothing the doctor repairs is irreversible.** Everything it touches is
  derived data that is computed from something else.
