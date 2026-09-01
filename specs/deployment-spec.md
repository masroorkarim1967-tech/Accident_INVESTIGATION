# Deployment Specification

Operational runbook for taking the Aviation Incident Investigation Assistant from the GitHub
repository to a live, public URL. This document is the step-by-step procedure; the architectural
reasoning behind each choice (why Vercel, why Neon, why the pooled/direct connection split, why no
Docker) already lives in [`technical-architecture.md`](technical-architecture.md) §5, §9–§11 and is
not repeated here — this spec only operationalizes it into concrete steps, exact commands, and a
checklist. Where the two ever appear to disagree, `technical-architecture.md` is authoritative on
*why*; this document is authoritative on *how*, in order.

No step below invents a credential, secret, or URL. Every placeholder is written as `<angle
brackets>` and is filled in only by you, in the Vercel/Neon dashboards or your own terminal — never
committed to Git.

## 1. Scope and Target Architecture

| Concern | Choice | Why (full detail in `technical-architecture.md`) |
|---|---|---|
| Hosting | **Vercel**, Hobby (free) tier | §10 — zero-config Next.js deploys, automatic HTTPS, Git-triggered |
| Database | **Neon** Postgres, Free tier | §5.1 — serverless, scales to zero when idle, native Vercel integration, free branching |
| Source control | **GitHub** | §10 — Vercel's native deployment trigger |
| ORM | **Prisma 7**, `@prisma/adapter-pg` | §5.2 addendum — provider-portable, works against any standard Postgres connection string |
| External AI / paid APIs | **None** | §2, §11 — confirmed below in Step 4; the Investigation Support engine (`product-spec.md` §11) is local rule-based code, not a network call |

This procedure assumes the state of the repository as of the commits already pushed to
`origin/main` (Phases 1–5 of `implementation-plan.md`). Later phases add routes and env-var-free
functionality but do not change any step below.

## 2. Prerequisites

Before starting, confirm locally:

- [ ] `git remote -v` shows `origin` pointing at your GitHub repository, and `git log` shows the
      commits you intend to deploy are already pushed (`git status` clean, nothing ahead of
      `origin/main`).
- [ ] `npm run build` succeeds locally (catches TypeScript/build errors before they surface as a
      failed cloud build).
- [ ] `npm run test` passes locally against a database you control (catches regressions before
      deploy — see `testing-spec.md`).
- [ ] You have (or are willing to create) a free GitHub account with access to this repository, and
      are prepared to create free Vercel and Neon accounts using it.

## 3. Step 1 — GitHub Repository

Already satisfied by this project's git history (see `git log --oneline`). For a from-scratch
reader, the requirement is simply: the project's `main` branch is pushed to a GitHub repository
Vercel can be granted access to. Nothing further is needed here — do **not** re-run `git init` or
force-push over existing history (see the note at the end of this document on avoiding destructive
git operations at deploy time).

Recommended (optional) hardening before the first production deploy, per
`technical-architecture.md` §10:

- In the GitHub repository's Settings → Branches, add a branch protection rule on `main` requiring
  a pull request before merge. This is a repository-configuration recommendation, not something
  enforced by any code in this project.

## 4. Step 2 — Hosting Account (Vercel)

1. Go to `vercel.com` and sign up (or sign in) using **"Continue with GitHub"** — this is the
   simplest path since it automatically grants Vercel the ability to list your repositories in the
   next step, and keeps a single identity provider rather than a separate password to manage.
2. Choose the **Hobby** plan (free). This project's scale — `non-functional-requirements.md`
   NFR-3.1's "tens to low hundreds of records" — stays well inside Hobby's serverless
   function-execution-time and bandwidth limits.
3. No credit card is required for the Hobby plan or for a Neon free-tier database (Step 5).

## 5. Step 3 — Importing the Repository

1. From the Vercel dashboard, click **Add New → Project**.
2. Under "Import Git Repository," select this project's GitHub repository. If it isn't listed,
   use **Adjust GitHub App Permissions** to grant Vercel access to it specifically (Vercel does not
   require blanket access to every repository in your account).
3. Vercel auto-detects the **Next.js** framework preset from `package.json` — leave the Framework
   Preset as **Next.js** and the Root Directory as the repository root (this project is not a
   monorepo).
4. **Do not click Deploy yet.** The build will fail without the environment variables from Step 6
   and a migrated database from Step 8 — configure those first, in the "Environment Variables"
   section of this same import screen or immediately after, before the first deploy attempt.

## 6. Step 4 — Environment Variables

Every variable the application needs is listed in the committed [`.env.example`](../.env.example)
— nothing beyond it is required, which is itself the checkable confirmation of the "no external AI
API, no paid API" constraint (`technical-architecture.md` §11). Set each of the following in
Vercel's **Project → Settings → Environment Variables**, scoped to the **Production** environment
(and separately to **Preview**/**Development** if you want per-environment values later):

| Variable | Value source | Notes |
|---|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (Step 7) | Used by the running application for all runtime queries |
| `DIRECT_URL` | Neon **unpooled** connection string (Step 7) | Used only by Prisma Migrate (Step 9) — schema-changing operations need a direct connection |
| `NEXTAUTH_SECRET` | Generate locally: `npx auth secret` (or `openssl rand -base64 32`) | A session-signing secret — generate a fresh value for production, never reuse your local `.env.local` value |
| `NEXTAUTH_URL` | Your production URL once known (Step 11), e.g. `https://<your-project-name>.vercel.app` | Can be set after the first deploy reveals the assigned URL, then redeployed — see Step 11 |
| `NODE_ENV` | Not set manually | Vercel and Next.js set this automatically; do not override it |

Paste each value directly into the Vercel dashboard's environment variable form — never into a
file that gets committed. `.env.local` (git-ignored) is for local development only and is never
read by Vercel's build.

**Verification that no secret is exposed publicly**: `.gitignore` excludes every `.env*` file
except `.env.example`, and `.env.example` itself contains only variable names and comments, never
a value (confirm with `git show origin/main:.env.example` — every line right of `=` is empty).

## 7. Step 5 — PostgreSQL Database (Neon)

1. Go to `neon.tech` and sign up (GitHub sign-in works here too). The **Free** tier is sufficient
   at this project's scale (`technical-architecture.md` §5.1).
2. Create a new Neon **project**. Choose a region close to where Vercel will run your functions
   (Vercel's default region is `iad1`/US East — pick the nearest Neon region to minimize
   latency; this is a performance choice, not a correctness requirement).
3. Neon provisions a default database and gives you **two** connection strings on the project's
   Connection Details panel:
   - The **pooled** connection string (PgBouncer, transaction-mode compatible) — copy this into
     Vercel's `DATABASE_URL`.
   - The **direct/unpooled** connection string — copy this into Vercel's `DIRECT_URL`.
     (Neon's dashboard usually shows the pooled string by default with a toggle or a separate
     "Direct connection" tab for the unpooled one — if only one string is shown, add
     `?pgbouncer=true` for the pooled variant per Neon's own documentation, or use the toggle if
     present.)
4. **Optional, recommended for later PR review workflows**: Neon's branching feature
   (`technical-architecture.md` §10) lets each pull request get its own isolated database branch
   automatically via the Vercel–Neon integration, installable from the Vercel Integrations
   marketplace. Not required for the first production deploy — skip this on a first pass and add
   it later if you start reviewing PRs against live preview deployments.
5. Copy both connection strings somewhere safe (a password manager) — you'll paste them into
   Vercel in Step 6 and use the direct one locally in Step 9 to run the first migration.

## 8. Step 6 — Prisma Configuration

No new configuration is needed here — this step is a **verification**, not a change, since
`prisma.config.ts` and `prisma/schema.prisma` were already built to be deployment-target-agnostic
(`technical-architecture.md` §5.2 addendum). Confirm before proceeding:

- [ ] `prisma.config.ts` at the repository root reads its connection from `process.env.DIRECT_URL`
      — the CLI (`migrate`, `db seed`) always uses the unpooled connection.
- [ ] `lib/db.ts` instantiates `PrismaClient` with a `@prisma/adapter-pg` driver adapter reading
      `process.env.DATABASE_URL` (the pooled connection) — this is the application's own runtime
      connection, separate from the CLI's.
- [ ] `package.json`'s `postinstall` script runs `prisma generate`, so every `npm install`
      (including Vercel's build step) regenerates the Prisma Client from the current
      `prisma/schema.prisma` — the generated client itself is git-ignored
      (`prisma/generated/`) and is never committed.
- [ ] `prisma/schema.prisma`'s generator block has an explicit `output` path
      (`prisma/generated/prisma`) rather than the old default `node_modules/@prisma/client` — this
      is what makes the `@/prisma/generated/prisma/client` import path used throughout the app
      resolve correctly in Vercel's build environment exactly as it does locally.

If all four are already true (they are, as committed), there is nothing to change in this step —
proceed to Step 9.

## 9. Step 7 — Database Migration

Run this **once, before the first production deploy is promoted**, from your local machine, using
the **direct** (unpooled) connection string from Step 7:

```bash
# In the repository root, using the production DIRECT_URL — do not commit this value anywhere
DIRECT_URL="<paste-neon-direct-connection-string>" npx prisma migrate deploy
```

`prisma migrate deploy` applies every migration already committed under `prisma/migrations/` in
sequence, in a single non-interactive pass — it does **not** generate new migrations (that only
ever happens locally via `prisma migrate dev`, reviewed in a PR before merge, per
`technical-architecture.md` §5.3). Running it manually and explicitly, before the deploy is
promoted, avoids two concurrent deployments racing to migrate the same database.

**Note on the connection string in this command**: passing it inline on the command line (rather
than via a committed file) means it exists only in your local shell's process list and history for
that one invocation — clear your shell history afterward if you're on a shared machine, or prefer
setting it as a temporary exported variable in a fresh shell session instead:

```bash
export DIRECT_URL="<paste-neon-direct-connection-string>"
npx prisma migrate deploy
unset DIRECT_URL
```

Confirm success: the command prints each applied migration by name and ends with
`"All migrations have been successfully applied."` with no errors.

## 10. Step 8 — Seed Data

Seed the production database with the fictional demo dataset (`demo-data.md`) — appropriate here
specifically because this is a portfolio deployment meant to be explored by visitors, never a real
operational system (`implementation-plan.md` Phase 16, "Database Changes"):

```bash
export DIRECT_URL="<paste-neon-direct-connection-string>"
npx prisma db seed
unset DIRECT_URL
```

This populates the five demo user accounts (one per role — Administrator, Investigation Manager,
Investigator, Reviewer, Viewer — documented with their fictional `@investigations.example`
addresses in `README.md`'s Database Setup section), the seeded `RiskBandConfiguration` rows, and
the full `OccurrenceSubcategoryOption` taxonomy. `prisma/seed.ts` is idempotent (it checks for
existing rows before inserting), so re-running this command against an already-seeded database is
safe and will not create duplicates.

**Passwords for the demo accounts are documented in `README.md`, not repeated here** — this keeps
credential information in exactly one place in the repository. Since there is no self-registration
in this application (`product-spec.md` §13), publishing demo credentials on the login screen and in
the README is a deliberate, documented trade-off that lets any visitor explore the full role-based
workflow — never do this for an application handling real user data.

## 11. Step 9 — Production Build

This step happens automatically inside Vercel (triggered in Step 12) — there is nothing to run
manually beyond the local verification already done in the Prerequisites (§2). For reference, the
exact build Vercel runs is:

```bash
npm install        # triggers postinstall -> prisma generate
npm run build       # next build
```

`next build` performs a full production compile and type-check (`tsc` runs as part of the Next.js
build pipeline) — a build that fails locally will fail identically on Vercel, which is why running
it locally first (§2) catches problems before they cost a wasted deploy cycle.

## 12. Step 10 — Deployment

1. Back in the Vercel project (from Step 5), with the environment variables from Step 6 already
   saved, click **Deploy**.
2. Vercel clones the repository, runs the build from Step 11, and — if it succeeds — promotes the
   result to your project's production URL automatically.
3. From this point forward, **every push to `main` triggers a new production deployment**
   automatically (`technical-architecture.md` §10) — there is no separate manual "deploy" step for
   future changes beyond pushing to GitHub. A schema change still requires re-running Step 9
   (`prisma migrate deploy`) manually against production **before** the corresponding code push, so
   the deployed code and the deployed schema are never mismatched.
4. If the build fails, Vercel's dashboard shows the build log with the exact error — the most
   common first-deploy failures are a missing/misspelled environment variable (re-check Step 6) or
   `prisma migrate deploy` not yet having been run (re-check Step 9) before the app tries to query
   a table that doesn't exist yet.

## 13. Step 11 — Domain / URL

1. Vercel assigns a default URL automatically on first deploy, of the shape
   `https://<your-project-name>-<random-suffix>.vercel.app` (or simply
   `https://<your-project-name>.vercel.app` if that exact name is available) — this document does
   not invent or predict that URL; it is shown in the Vercel dashboard immediately after the first
   successful deploy, under **Project → Domains**.
2. Copy that assigned URL and set it as the `NEXTAUTH_URL` environment variable (Step 6), then
   trigger a redeploy (Vercel's dashboard has a **Redeploy** button, or push any small commit) —
   Auth.js requires this value to match the canonical URL the app is actually served from.
3. **Optional — custom domain**: if you own a domain, add it under **Project → Domains → Add**.
   Vercel provides step-by-step DNS instructions specific to your registrar at that point (a `CNAME`
   or `A` record you add in your own DNS provider's dashboard). This is optional and free (Vercel
   does not charge for custom domains on the Hobby tier); the default `.vercel.app` URL is
   fully sufficient for a portfolio deployment. If you do add one, update `NEXTAUTH_URL` again to
   the new custom domain and redeploy.
4. HTTPS is automatic and free on both the default `.vercel.app` URL and any custom domain added —
   no certificate configuration is needed.

## 14. Step 12 — Post-Deployment Testing

Run through this checklist against the live production URL (not `localhost`) immediately after the
first deploy, and after any deploy that changed authentication, the database schema, or security
headers. This is a manual smoke test, not a replacement for the automated suite in
`testing-spec.md` — it exists specifically to catch the class of defect that only surfaces under
real production conditions (`next start`/Vercel's runtime), the same class this project's own
history has already produced twice: a CSP header that blocked hydration under production but not
`next dev`, and an Auth.js `UntrustedHost` error that likewise only appeared in production mode.

- [ ] **Health check**: `GET https://<your-url>/api/health` returns `200` with a body confirming a
      successful `SELECT 1` against the database.
- [ ] **Login page loads**: `https://<your-url>/login` renders without a client-side error (open
      the browser console — no red errors, particularly none mentioning Content-Security-Policy or
      `eval`).
- [ ] **Login succeeds**: sign in with one of the five seeded demo accounts (credentials in
      `README.md`). A production-mode `UntrustedHost` error here means `NEXTAUTH_URL` (Step 6) does
      not exactly match the URL you're visiting — re-check Step 13.
- [ ] **Dashboard loads** with data (confirms the seed from Step 10 actually ran against the
      database this deployment is pointed at).
- [ ] **Create a test investigation**, fill in its Occurrence Details (Narrative, Classification —
      including the "Suggest Classification" affordance, Persons Involved, Immediate Actions) and
      Aircraft & Flight tabs, and confirm each save persists after a full page reload — this
      exercises the Server Action → database round trip end-to-end, not just static rendering.
      Delete or leave this test record; it is fictional data on a fictional demo dataset either way.
- [ ] **`robots.txt`** is reachable at `https://<your-url>/robots.txt` without requiring a login
      redirect (a regression here previously broke crawler access — `proxy.ts`'s matcher explicitly
      excludes it for this reason).
- [ ] **Security headers present**: inspect the response headers on the production URL (browser
      DevTools → Network tab, or `curl -I`) and confirm `Content-Security-Policy`,
      `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` are all present.
- [ ] **No secrets in client-visible output**: view page source and confirm no environment variable
      value (a connection string, the `NEXTAUTH_SECRET`) appears anywhere in the HTML, inline
      scripts, or a network response — Server Components and Server Actions never send these to the
      client by construction, but this is a cheap, worthwhile final check.

## 15. Rollback and Troubleshooting

- **Rolling back a bad deploy**: Vercel keeps every previous successful deployment and lets you
  **Promote to Production** an earlier one from the dashboard's Deployments list, instantly — no
  git revert or force-push required for a code-only rollback.
- **Rolling back a bad migration**: Prisma Migrate does not auto-generate a "down" migration.
  Recovering from a bad schema change means writing and applying a new, corrective migration (via
  `prisma migrate dev` locally, reviewed in a PR, then `prisma migrate deploy` again) — never
  editing or deleting an already-applied migration file, and never running a destructive command
  like `prisma migrate reset` against the production database.
- **Build succeeds locally but fails on Vercel**: almost always an environment variable difference
  — re-check Step 6 for typos or a variable scoped to the wrong environment (Production vs.
  Preview vs. Development).

## 16. Free-Tier Suitability Summary

Every service named in this document has a free tier sufficient for this project's documented
scale, with no credit card required to start:

| Service | Free tier limit relevant here | This project's actual usage |
|---|---|---|
| Vercel Hobby | Serverless function execution time/bandwidth generous for low-traffic apps | A portfolio demo with intermittent visitor traffic, no scheduled background jobs |
| Neon Free | Storage and compute-hour caps well above "tens to low hundreds of records" (NFR-3.1) | The seeded demo dataset (`demo-data.md`) |

No step in this document requires a paid tier of anything, and no step requires an API key for any
service beyond the two named above — directly satisfying `technical-architecture.md` §2's "no
external API keys, no paid APIs" founding constraints.

## 17. Cross-References

- [`technical-architecture.md`](technical-architecture.md) §5 (Database Architecture), §9 (Evidence
  Storage — Vercel-Specific Adaptation), §10 (Deployment Architecture), §11 (Environment
  Configuration) — the architectural reasoning this runbook operationalizes.
- [`security-spec.md`](security-spec.md) — secret handling, security headers, rate limiting.
- [`testing-spec.md`](testing-spec.md) — the automated test suite this manual smoke test (§14
  above) supplements, not replaces.
- [`implementation-plan.md`](implementation-plan.md) Phase 16 — the original phase-plan entry this
  document fulfills in full detail.
- [`README.md`](../README.md) — demo account credentials, local installation, and the
  project's public-facing description of this same deployment.
