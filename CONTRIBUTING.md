# Contributing

This is a portfolio project, developed solo via Spec-Driven Development. It isn't actively seeking
external contributors, but the conventions below are documented in case that changes, and to keep
the project internally consistent as it grows through its remaining implementation phases.

## Spec-Driven Development — the core rule

**Every non-trivial change traces to a specification before it traces to code.** The full
specification set lives in [`/specs`](specs) and was written before any application code existed.
If a change isn't covered by an existing spec:

1. Update the relevant spec file(s) first, in the same pull request as the code change.
2. Explain *why* in the spec text itself — not just what changed, but the reasoning (a discovered
   defect, a tool-version incompatibility, a genuine requirements gap). Several spec files carry
   inline "Addendum" notes documenting exactly this kind of implementation-time discovery — follow
   that pattern rather than silently diverging from what's written.
3. Never resolve an ambiguous requirement by guessing silently. Either ask, or make a documented
   assumption and record it where the spec's existing assumptions registers live (e.g.
   `product-spec.md` Appendix A, or a file-specific `*-1`/`*-2` assumption list).

`specs/implementation-plan.md` sequences the work into 16 phases, each independently verifiable.
Don't implement functionality belonging to a later phase just because it would be convenient — the
phase boundaries exist so each piece of the system can be verified in isolation before the next is
built on top of it.

## Non-negotiable constraints

These apply to every change, no exceptions:

- **No external API keys, ever.** No AI/ML provider, no paid third-party service. If a feature seems
  to need one, the answer is a local/rule-based alternative, not an exception — see
  `specs/assistance-engine.md` for how this was resolved for decision-support features.
- **No secrets committed, ever.** `.env.local` is git-ignored from the start; `.env.example` lists
  variable names only, never real values. If a secret is ever accidentally committed, rotate it
  immediately — removing it from a later commit is not sufficient, since Git history isn't a secure
  deletion mechanism.
- **All data stays fictional.** No real names, organizations, or personal information anywhere,
  including in test fixtures and the demo dataset.

## Code conventions

- **TypeScript strict mode.** No `any` beyond what's genuinely unavoidable (and never silently —
  explain why if you add one).
- **Server Components by default**; a Client Component only when interaction genuinely requires it
  (a form, a filter bar, anything with local state). Mutations go through Server Actions, not
  hand-rolled fetch calls.
- **`requireRole` at the top of every Server Action and Route Handler that mutates data**, before any
  other logic. UI-level hiding of a control is a convenience for the user, never the security
  boundary — every authorization check re-reads the current user's role/active status from the
  database, never trusts a session claim.
- **Zod validation at the server boundary** for every input, even if the same shape was already
  validated client-side. Client-side validation is a UX nicety; server-side is authoritative.
- **No premature abstraction.** Don't build a generic/reusable version of something until there's a
  second real usage to generalize from. Three similar lines are better than a speculative helper.
- **Comments explain *why*, not *what*.** Well-named code already says what it does; a comment
  earns its place only when it captures a non-obvious constraint, a workaround, or a decision a
  future reader would otherwise have to rediscover the hard way.

## Testing

- A feature isn't done until it has both a positive and a negative test — see
  `specs/testing-spec.md` §3 for why "happy path only" isn't considered adequate coverage here.
- Unit tests (Zod schemas, pure service functions) should need no external dependency and must
  always run. Integration tests that need a live database use `describe.skipIf(!process.env.DATABASE_URL)`
  so they degrade gracefully rather than failing in an environment without one — write them to
  actually run once a database is available, not as a permanently-skipped placeholder.
- Before opening a pull request: `npm run typecheck`, `npm run lint`, `npm run test`, and
  `npm run build` should all pass clean.

## Commit and PR conventions

- Commit messages explain *why*, not just *what* — the diff already shows what changed.
- Keep commits scoped to one logical change; don't bundle an unrelated fix into a feature commit.
- Never force-push to `main`, never skip commit hooks, never amend a commit that's already been
  pushed/shared.
- A pull request that changes behavior should update the relevant spec file(s) in the same PR, not
  as a promised follow-up.

## Reporting an issue

Since this project intentionally has no runtime dependency on any external service, most defects are
either a specification gap (the spec didn't cover a case correctly) or an implementation bug (the
code doesn't match what the spec says). When filing an issue, it helps to say which — and if it's a
spec gap, to point at the exact section that's wrong or missing.
