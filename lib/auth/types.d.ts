import type { DefaultSession } from "next-auth";

/**
 * Module augmentation adding `id`/`role` to Auth.js's Session/User/JWT
 * shapes. `role` is carried for UI display convenience only — never trust
 * it for an authorization decision; use requireRole (lib/auth/requireRole.ts)
 * instead, which always re-reads the database.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
  }
}
