import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/prisma/client";

// Serverless-safe Prisma Client singleton (technical-architecture.md §5.1).
// Next.js dev-mode hot reload would otherwise create a new PrismaClient —
// and a new set of DB connections — on every file save.
//
// Uses the pooled DATABASE_URL via a driver adapter (Prisma 7 requires an
// adapter; there is no url-based fallback — see prisma.config.ts and
// technical-architecture.md §5.2's addendum for why).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
