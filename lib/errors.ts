/**
 * AppError hierarchy (technical-architecture.md §7). Only the member this
 * phase needs is defined here; later phases add ValidationError,
 * NotFoundError, ConflictError, TransitionError when they first need them.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown by requireRole (lib/auth/requireRole.ts) — NFR-4.7's security boundary. */
export class AuthorizationError extends AppError {}
