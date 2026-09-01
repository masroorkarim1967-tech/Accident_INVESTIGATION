# Security Specification — Aviation Incident Investigation Assistant

This document is the authoritative, consolidated security specification for the application. Most
individual controls were already specified across `non-functional-requirements.md` §4,
`technical-architecture.md` §8–§9/§11, `data-model.md` §6.11, `product-spec.md` §12, and several
entries in `edge-cases.md` — this document organizes all of it under one set of headings, closes the
gaps found while doing that (marked **[New]**), and states the three non-negotiable rules for this
pass as binding, checkable requirements rather than implicit assumptions.

## 0. Binding, Non-Negotiable Rules

These take precedence over any implementation convenience:

1. **No API keys shall be required for the application to run.** Every environment variable this
   application needs (`§8`) authenticates a service the project itself provisions (the database,
   the session secret) — never a third-party API/AI provider. This has been a constraint since
   `product-spec.md` §6.2/§11 and is restated here as a security requirement, not only a product one:
   an API key is a secret with real financial/access consequences if leaked, and the simplest way to
   guarantee it can never leak is to never require one.
2. **Secrets shall never be placed in GitHub** — not in a commit, not in a config file checked into
   the repo, not in a code comment, not in a commit message. `.env.local` is git-ignored; only
   `.env.example` (placeholder values, no real secret) is committed (§8). GitHub's native **secret
   scanning and push protection** (free for this repository) shall be enabled as an automated
   backstop against accidental commits, not a substitute for the discipline above.
3. **Database credentials shall never be hard-coded.** `DATABASE_URL`/`DIRECT_URL` are read only
   from environment variables at runtime (§8) — never a literal connection string anywhere in the
   codebase, never a fallback default pointing at a real database, and never embedded in a test
   fixture or seed script.

## 1. Input Validation

- Every Server Action and Route Handler input is validated by a Zod schema at the server boundary
  before touching any business logic or the database (`technical-architecture.md` §6) — client-side
  validation (immediate inline feedback) uses the identical schema but is never trusted as
  authoritative on its own (NFR-4.7's "server-side authoritative" principle, restated at the
  input-validation layer specifically).
- Shared enums are validated via Zod schemas derived from Prisma's generated enum types
  (`z.nativeEnum(...)`), eliminating drift between what the database will accept and what the
  validation layer checks for.
- Cross-field rules (e.g. "exactly one of `ownerUserId`/`ownerExternalName`," "Potential Outcome ≥
  Actual Outcome") are enforced via Zod `.refine()`/`.superRefine()`, never left to be caught only by
  a database constraint after the fact.
- Whitespace-only input is treated as empty for every text field, not only the one it was first
  specified for (`edge-cases.md` EC-20, generalized as a standing rule).
- Every free-text field has both a minimum (already specified per-field in `data-model.md`) and a
  maximum length (`edge-cases.md` EC-21 — 10,000 characters for narrative/analytical text, 5,000 for
  notes/comments, existing `VARCHAR` caps unchanged elsewhere) — closing a gap where only minimums
  had been defined, leaving `TEXT` columns technically unbounded.
- File uploads are validated by type, size, and sanitized filename before any byte is persisted —
  detailed fully in §13.

## 2. SQL Injection Prevention

- Structurally prevented, not merely disciplined against: every database access goes through
  **Prisma's query builder**, which parameterizes all values — there is no code path that
  concatenates user input into a SQL string (NFR-4.2, `technical-architecture.md` §8).
- If a raw query is ever genuinely required (e.g. a complex aggregate the query builder can't
  express), it **must** use Prisma's tagged-template `$queryRaw` (which still parameterizes
  interpolated values), and `$queryRawUnsafe` with string-concatenated input is **banned outright** —
  there is no legitimate use for it in this codebase, and its presence in a PR should be treated as
  a security review blocker.

## 3. XSS Prevention

- React's default JSX escaping is the primary defense — every dynamic value rendered in the UI is
  escaped by default (NFR-4.3). `dangerouslySetInnerHTML` is banned via an ESLint rule
  (`technical-architecture.md` §8); any exception would require an explicit, reviewed justification,
  which this specification does not anticipate ever being needed.
- **[New] Security headers**: a baseline set of HTTP security headers is set for every response
  (via Next.js middleware or `next.config.js` headers), as defense-in-depth beyond React's escaping:
  - `Content-Security-Policy`: restrictive default (`default-src 'self'`), permitting only the
    application's own origin plus Google Fonts' two required hosts if self-hosted fonts
    (`next/font`, `technical-architecture.md` §3.3) are not used instead — no third-party script or
    style origins are needed, and none are permitted.
  - `X-Content-Type-Options: nosniff` — prevents the browser from MIME-sniffing an uploaded
    attachment into executing as a different content type than declared (directly relevant to §13's
    file upload allowlist).
  - `X-Frame-Options: DENY` (or an equivalent `frame-ancestors 'none'` in the CSP) — the application
    has no legitimate reason to be embedded in another site's frame.
  - `Referrer-Policy: strict-origin-when-cross-origin` — avoids leaking full URLs (which could
    contain investigation reference numbers in query params) to third-party referrer targets.

## 4. CSRF Considerations

- **Server Actions** (the default mutation path, `technical-architecture.md` §4.1) get Next.js's
  built-in same-origin request verification automatically — this is one of the stated reasons
  Server Actions are preferred over hand-written mutation endpoints.
- **Route Handlers that mutate state** (file upload, `technical-architecture.md` §4.2) do **not**
  get that automatic protection and need their own defense. **[New]**: session cookies are set with
  `SameSite=Lax`, which blocks the cross-site form-submission pattern CSRF classically exploits; as
  defense-in-depth beyond cookie attributes alone (which have known edge cases in older browsers),
  every state-changing Route Handler additionally verifies that the request's `Origin` header
  matches the application's own origin before processing, rejecting a mismatch outright. Read-only
  Route Handlers (attachment download, JSON export) need no CSRF protection, since they don't change
  state — session-based authorization (§6) is sufficient for them.

## 5. Authentication Architecture

- **Auth.js (NextAuth.js) with a Credentials provider**, checking email + bcrypt-hashed password
  against `User` (`technical-architecture.md` §4.4). Passwords are never stored or logged in plain
  text (NFR-4.1).
- **JWT sessions**, corrected from this section's original "database sessions" statement —
  `technical-architecture.md` §4.4's addendum explains the discovery: Auth.js does not officially
  support database sessions with the Credentials provider. The deactivation/role-change guarantee
  this section originally hung on the session mechanism is instead delivered by `requireRole`
  (`technical-architecture.md` §4.3), which re-reads `User.isActive`/`User.role` from the database
  on every request regardless of session type — so a deactivated account (`isActive = FALSE`) is
  still locked out on its very next request, and a role change still takes effect on the next
  request, exactly as `edge-cases.md` EC-25 requires. The JWT itself carries only a `userId` claim
  and is never trusted for role/active-status.
- Session cookies are `HttpOnly` (inaccessible to JavaScript, blocking token theft via XSS even if
  one somehow occurred) and `Secure` in production (HTTPS-only transmission) — NFR-4.4.
- The Credentials-provider implementation is deliberately isolated behind Auth.js's provider
  abstraction (`product-spec.md` §8.3) specifically so a stronger mechanism (real OAuth/SSO, MFA)
  can be substituted later as a configuration change, not an authentication rewrite.

## 6. Authorization

- **Server-side, on every mutating operation, with no exception** — a shared `requireRole(session,
  allowedRoles[])` helper is called at the top of every Server Action and Route Handler before any
  other logic runs (`technical-architecture.md` §4.3, NFR-4.7). UI-level hiding of a control is a
  convenience for the user, never the actual security boundary.
- The full role permission matrix is defined once, in `product-spec.md` §8.2, and this
  specification does not restate it — every authorization check in the codebase should trace back to
  that matrix, not to an ad hoc decision made while implementing a specific feature.
- **Row-level scoping**, not just role-level: an Investigator sees only investigations they created
  or are assigned to (`functional-requirements.md` FR-007), enforced as a query filter, not a
  post-fetch UI filter that would leak the existence/count of other records.
- **Fine-grained rules beyond simple role checks** exist where the domain requires them and must not
  be simplified away during implementation — the clearest example is action-effectiveness
  verification, which excludes the action's own owner even if that owner otherwise holds a role
  permitted to verify (`data-model.md` §6.9.1) — a role check alone is insufficient there; the
  specific-record relationship must also be checked.

## 7. Database Security

- **Encrypted connections**: the Postgres connection string uses `sslmode=require` (Neon's default,
  `technical-architecture.md` §5.1) — data in transit between the application and the database is
  always encrypted, never a plaintext connection.
- **[New] Least-privilege database role**: the application connects using a dedicated Postgres role
  scoped to its own schema, not the Neon project's owner/superuser role — this bounds the damage a
  compromised `DATABASE_URL` could do (e.g. it cannot drop the whole database or alter other
  projects' data on the same account) even though, at this project's single-tenant scale, the
  practical risk difference is modest; it costs nothing to configure correctly from the start.
- **Parameterized access only** — restated from §2 because it is as much a database-security
  property as an injection-prevention one: the database never receives a query built from
  unparameterized string concatenation.
- **Pooled vs. direct connections**: the pooled connection string (`DATABASE_URL`) is used for all
  runtime application queries; the unpooled direct connection (`DIRECT_URL`) is used **only** by
  Prisma Migrate, never by the running application — this limits which code path can hold a
  long-lived direct connection at all (`technical-architecture.md` §5.1).
- **Backup/recovery**: Neon's point-in-time recovery (included in its free tier) provides a recovery
  path independent of any application-level backup mechanism — no custom backup tooling is required
  for this project's scale.

## 8. Environment Variables

The complete list, unchanged from `technical-architecture.md` §11, restated here for this
document's completeness:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string — runtime queries |
| `DIRECT_URL` | Unpooled Postgres connection string — migrations only |
| `NEXTAUTH_SECRET` | Session/token signing secret |
| `NEXTAUTH_URL` | Canonical app URL (Auth.js requirement) |
| `NODE_ENV` | Standard Node/Next.js environment flag |

- **No AI provider key, no paid third-party API key, appears in this list** — a direct, checkable
  confirmation of Rule 1 (§0).
- **Per-environment isolation**: production, preview, and local-development environments each use
  their **own** values for every secret above — a preview deployment must never share
  `NEXTAUTH_SECRET` or point at the production `DATABASE_URL`. Neon's branching feature
  (`technical-architecture.md` §5.1, §10) makes this free and automatic for the database; the same
  discipline applies manually to `NEXTAUTH_SECRET` when configuring Vercel's per-environment
  variables.
- `.env.example` documents every variable name with a placeholder and a one-line comment, committed
  to the repo; it never contains a real value (§0 Rule 2, §9).

## 9. Secrets

- **Storage**: production/preview secrets live only in Vercel's encrypted environment variable
  store; local development secrets live only in `.env.local`, which is listed in `.gitignore` from
  the very first commit of the repository, not added reactively after a scare.
- **Never in Git, ever** (§0 Rule 2): this includes commit messages, code comments, test fixtures,
  and the demo-data specification (`demo-data.md` deliberately uses no real credentials anywhere,
  since it is entirely fictional data by design — product-spec A8).
- **GitHub secret scanning and push protection** enabled on the repository as an automated backstop
  — catches an accidental commit before it reaches a public/shared branch, rather than after.
- **If a secret is ever accidentally committed**: the correct response is to **rotate it**
  (generate a new value, e.g. a new `NEXTAUTH_SECRET`), not merely remove it from a later commit —
  a secret that has touched Git history must be treated as compromised regardless of whether it was
  later deleted, since Git history is not a secure deletion mechanism.
- **Never logged**: no logging statement (§11) ever includes a password, session token, or
  connection string, even at debug verbosity — this is a rule about what must never be written to a
  log line, independent of where those logs end up.

## 10. Error Messages

- **Generic to the client, detailed server-side** — every unhandled exception returns a generic
  message ("Something went wrong — please try again") to the browser while the full error (including
  stack trace) is logged server-side only (NFR-10.2, `technical-architecture.md` §7).
- **No internal detail ever reaches the client**: no stack traces, no database connection strings,
  no internal file paths, no Prisma error internals — the `AppError` hierarchy
  (`technical-architecture.md` §7) exists specifically to map internal failures to safe, generic
  client-facing messages at exactly one place per handler type.
- **Credential-enumeration hygiene**: a failed login shows "Incorrect email or password" without
  indicating which of the two was wrong, and a deactivated account shows the same generic message
  rather than confirming the account exists but is disabled (`ui-spec.md` §1) — an attacker probing
  for valid email addresses learns nothing from the error message either way.

## 11. Logging

- **Structured JSON to stdout**, captured by Vercel's own log pipeline — no external logging
  service is used or required (NFR-10.1), consistent with §0 Rule 1's spirit even though logging
  services aren't strictly "AI" or "API-key" dependencies — the same minimal-external-dependency
  preference applies.
- **What is logged**: unhandled exceptions (with full detail, server-side only, §10); authorization
  failures (which role attempted which action, without logging the request body's sensitive
  content); rate-limit triggers (§14); **[New]** login attempts, both failed (already required for
  §14's rate-limiting counter) and successful (recommended as a lightweight security-monitoring
  signal — who logged in, when, from which role — at negligible cost since it reuses the same
  structured-logging mechanism already required for everything else).
- **What is never logged**: passwords (hashed or plain), session tokens, full connection strings,
  or any secret from §8/§9 — restated here as a logging-specific rule, not only a secrets-handling
  one, because a secret leaking via an overly verbose debug log is a distinct failure mode from a
  secret leaking via source control.

## 12. Audit History

- `InvestigationHistory` (`data-model.md` §3.24) is the append-only system of record for lifecycle
  events — creation, stage transitions, assignment, review decisions, reopen, closure — with **no
  update or delete endpoint exposed at all** (§9's audit-integrity note): the only way an audit row
  changes is by a new row being appended, never by an existing one being altered.
- `InvestigationReview` (`data-model.md` §3.23) is the durable record of review decision detail
  (comments, decision), similarly never edited after the fact.
- **Security-relevant use of the audit trail**: the ADMIN emergency close-override
  (`data-model.md` §6.9.3) requires a mandatory justification that is itself recorded as an
  `InvestigationHistory` event — a bypass of the normal closure gate is never silent, and is
  discoverable by anyone with view access to the investigation, not only by inspecting raw
  application logs.
- **Explicit scope boundary, restated from `data-model.md` DM-8**: this is a lifecycle-event audit
  trail, not a field-level change-data-capture log — it answers "what happened, by whom, when," not
  "what was the previous value of this specific field." This is a deliberate scope limit, not an
  oversight, and should not be silently expanded during implementation without a corresponding spec
  update.

## 13. File Upload Security Architecture

Fully specified in `data-model.md` §6.10–§6.11 and `technical-architecture.md` §9; consolidated
here as the security view of that same design:

- **Allowlist, not blocklist**: only `image/jpeg`, `image/png`, `application/pdf`, `text/plain` —
  deliberately excluding video/audio, macro-capable office formats, and executables. This is why
  `CCTVReference` evidence records a text reference rather than an uploaded video, and why `Emails`
  evidence should be an exported PDF/plain-text copy rather than a raw `.eml`/`.msg` file
  (`data-model.md` §6.11).
- **Size limits**: 10MB per file, 100MB cumulative per investigation (NFR-4.5), bounding both
  storage cost and the resource impact of any single upload.
- **Filename handling**: the original filename is stored only for display; the actual storage
  reference is server-generated, never derived from user input, preventing any path/key-injection
  regardless of what a client sends as a filename.
- **Storage**: attachment bytes are stored as a Postgres `Bytes` column (`technical-architecture.md`
  §9's `PostgresBlobStorageProvider`) rather than on a filesystem — chosen specifically because
  Vercel's serverless filesystem cannot durably persist uploads, and as a side benefit this keeps
  attachment content inside the same access-controlled, encrypted-in-transit database as everything
  else, rather than a separate storage surface with its own security model.
- **Access control on retrieval**: downloading/viewing an attachment re-checks the requesting user's
  view access to the parent investigation on every request (FR-024) — a previously-valid link is not
  a standing bypass of authorization.
- **[New] Serving headers**: attachments are served with `Content-Type` set to the stored, validated
  MIME type and `X-Content-Type-Options: nosniff` (§3) so a browser cannot be tricked into
  interpreting an uploaded file as HTML/script regardless of its actual content.
- **No malware scanning** (accepted limitation, `product-spec.md` §12): no external scanning
  service is used, consistent with §0 Rule 1 — the narrow file-type allowlist is the primary
  mitigation in its place.
- **Simulated attachments never bypass any of the above**: a seed-data placeholder
  (`isSimulated = TRUE`) resolves to bundled, read-only application content, never
  user-writable — it is served through the identical access-control and header path as a real
  upload, just with different underlying bytes.

## 14. Rate Limiting Considerations

- **No external rate-limiting service** — deliberately, to honor §0 Rule 1 (no new third-party
  credential solely for this purpose, `technical-architecture.md` TA-4). Instead, a small
  database-backed attempt counter (`LoginAttempt`, keyed by email and/or IP) is checked and
  incremented inside the login Server Action itself.
- **Login**: a configurable threshold (e.g. 5 failed attempts within 15 minutes) triggers a
  temporary lockout of that email/IP pair, surfaced to the user as a generic "Too many attempts —
  please try again later" message (never confirming whether the account itself exists, per §10).
- **File uploads**: a comparable counter bounds upload frequency per user, mitigating
  storage-exhaustion abuse (`data-model.md` §6.11) without needing a dedicated edge rate-limiter.
- **Accepted trade-off**: this approach is coarser-grained than a dedicated distributed
  rate-limiting service (e.g. it does not defend against a highly distributed attack from many IPs
  as elegantly) — this is a documented, deliberate trade-off in favor of constraint compliance, not
  an oversight (`technical-architecture.md` TA-4).

## 15. Data Privacy

- **All application data is fictional** (`product-spec.md` A8) — there is no real personal data in
  this system, and therefore no GDPR/real-world privacy-law compliance obligation attaches to it.
  The application is nonetheless **designed as though it handled sensitive data**, both because that
  is realistic domain behavior for an investigation tool and because it demonstrates sound practice
  (`product-spec.md` §12):
  - Witness contact information is treated as restricted/sensitive in the UI and report (a
    muted, separately-labeled section, `report-spec.md` Appendix B) even though the underlying data
    carries no real risk.
  - No data is ever shared with or transmitted to a third party — a direct structural consequence of
    §0 Rule 1 (no external API calls exist to share data *with*), not merely a policy statement.
  - No third-party analytics or tracking scripts are included, so no visitor behavioral data leaves
    the system either.
  - An Administrator-only reset/reseed capability exists to restore the fictional demo dataset to a
    known-good state, since demo credentials are intentionally public
    (`ui-spec.md` UI-2) and the dataset should not be allowed to degrade indefinitely from public
    read/write exploration.

## 16. Production Deployment Security

- **HTTPS everywhere, automatically**: Vercel provisions TLS for the production domain and every
  preview URL with no configuration required (`technical-architecture.md` §10).
- **GitHub branch protection**: `main` requires a reviewed pull request before merge
  (`technical-architecture.md` §10's recommendation) — no direct pushes to the branch that triggers
  production deployment.
- **Preview isolation**: every pull request's preview deployment runs against its **own** Neon
  database branch (§7, §10), seeded independently — a change under review can never read or write
  production data, and a mistake in a preview environment cannot corrupt production.
- **[New] Dependency vulnerability scanning**: GitHub Dependabot (free) is enabled for this
  repository, alerting on known vulnerabilities in npm dependencies and opening automated update
  PRs — zero-cost, zero-new-credential, directly relevant to "secure handling of application data"
  since a vulnerable dependency is a common real-world attack path this project would otherwise have
  no visibility into.
- **Migrations as an explicit release step**: `prisma migrate deploy` runs as its own step before
  promoting a deployment, never automatically inside the build (`technical-architecture.md` §10) —
  a schema change is always a deliberate, reviewed action, never an incidental side effect of
  merging unrelated code.
- **Least-privilege repository access**: only the roles that need write/admin access to the GitHub
  repository and the Vercel/Neon projects should have it — a portfolio-scale recommendation, not a
  technical control this document can enforce directly.

## 17. Consistency Notes — Required Follow-Up Elsewhere

This document was scoped to `security-spec.md` only. The following newly-defined controls are not
yet reflected in the files that would ultimately implement them, and should be in a follow-up pass:

- **Security headers** (§3): **resolved** — `X-Content-Type-Options`, `X-Frame-Options`, and
  `Referrer-Policy` are set in `next.config.ts`'s `headers()`; `Content-Security-Policy` moved out
  of that static config and into `proxy.ts` as a per-request nonce during Phase 5's live browser
  verification, after a static CSP was found to block Next.js's own inline hydration scripts in
  production (`technical-architecture.md` §4.4's addendum has the full account). All four are
  verified present on live responses, including `robots.txt`, which is deliberately exempt from the
  auth proxy but still gets these headers independently. **Origin-header verification for
  state-changing Route Handlers** (§4) remains genuinely pending — there is no custom
  state-changing Route Handler yet to protect (only the Auth.js route exists, which handles its own
  CSRF); add this when Phase 6 introduces the evidence-upload Route Handler.
- **Least-privilege database role** (§7): still pending — this is a Postgres role/grant configured
  against the actual provisioned production database, not something expressible in application code;
  tracked as a Phase 16 deployment-time action item.
- **Login success logging and the `LoginAttempt` rate-limit table's exact shape** (§11, §14):
  **resolved** — `LoginAttempt` was formalized in `data-model.md` §3.25 during Phase 2
  (`implementation-plan.md`), closing spec-review.md SR-010.
- **Dependency scanning (Dependabot) and GitHub secret scanning/push protection** (§9, §16):
  `.github/dependabot.yml` was added during Phase 1 (pulled forward since it cost nothing to add
  early). GitHub secret scanning/push protection are repository *settings*, not files: a GitHub
  repository now exists and is the project's origin remote, so these can be enabled directly in its
  Settings whenever convenient — this is no longer blocked on repository creation, only on someone
  visiting that settings page. Still tracked as a Phase 16 deployment-time action item alongside the
  least-privilege database role above, since neither is expressible in application code.

Independent of this pass, `report-spec.md`'s partially-resolved
`InvestigationHistory`/`InvestigationReview` timeline interleaving remains outstanding.
`functional-requirements.md`'s status-name sweep (previously flagged here) is resolved — see
`spec-review.md` §7's confirmation of SR-003.
