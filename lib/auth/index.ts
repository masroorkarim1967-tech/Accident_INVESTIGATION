import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { isLoginRateLimited, recordLoginAttempt } from "@/lib/services/loginRateLimit";
import { AccountInactiveError, RateLimitedError } from "@/lib/auth/credentialsErrors";

/**
 * Full Auth.js config (Node.js runtime only — imports bcrypt and the
 * database client, so this file must never be imported by proxy.ts).
 *
 * Session strategy is JWT, not database — see technical-architecture.md
 * §4.4's addendum for why. The Prisma adapter stays configured (so a
 * future OAuth provider needs no rewrite, per §4.4) but is not what backs
 * the Credentials sessions below; `session.strategy` is set explicitly
 * because configuring an adapter would otherwise default Auth.js to the
 * `database` strategy.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        if (await isLoginRateLimited(email)) {
          throw new RateLimitedError();
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user) {
          // Generic failure — never reveal whether the account exists
          // (security-spec.md §10, credential-enumeration hygiene).
          return null;
        }

        if (!user.isActive) {
          // ui-spec.md §1 explicitly asks for this specific message,
          // unlike the generic "wrong email/password" case above.
          await recordLoginAttempt({
            identifier: email,
            ipAddress: null,
            succeeded: false,
            userId: user.id,
          });
          throw new AccountInactiveError();
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        await recordLoginAttempt({
          identifier: email,
          ipAddress: null,
          succeeded: passwordMatches,
          userId: user.id,
        });

        if (!passwordMatches) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        // `role` here is a display-only convenience (nav visibility, the
        // header's role badge) — never the source of truth for an
        // authorization decision. requireRole always re-reads the
        // database (technical-architecture.md §4.4's addendum).
        token.userId = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
