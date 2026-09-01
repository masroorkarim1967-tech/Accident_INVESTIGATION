/**
 * AppError hierarchy (technical-architecture.md §7). Members added as each
 * is first needed; ValidationError and TransitionError still pending.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown by requireRole (lib/auth/requireRole.ts) — NFR-4.7's security boundary. */
export class AuthorizationError extends AppError {}

/** Thrown when a referenced record (e.g. an investigation) doesn't exist or isn't visible to the caller. */
export class NotFoundError extends AppError {}
