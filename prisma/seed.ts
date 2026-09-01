/**
 * Prisma seed script — Aviation Incident Investigation Assistant.
 *
 * Phase 2 scope: the 5 system user accounts only (demo-data.md §1.4/§5 —
 * "the five User accounts," one per role). Investigation data (§2's ten
 * profiles) is seeded incrementally starting Phase 4, once the Investigation
 * table and its dependent tables exist.
 *
 * demo-data.md §1.4 lists three Investigator names (R. Okafor, T. Lindqvist,
 * S. Amara) but its own §5 says the seed script covers "the five User
 * accounts" (one per role). Resolved here per that explicit §5 statement:
 * R. Okafor — marked "already established" in §1.4 — is the one seeded
 * Investigator *account*; T. Lindqvist and S. Amara remain fictional
 * personnel available for later investigation records/narrative text, not
 * separate logins.
 *
 * demo-data.md does not specify login emails or a demo password; both are
 * invented here under the "example" reserved domain (RFC 2606) and recorded
 * in README.md's Getting Started section, since they are public demo
 * credentials for fictional accounts, not secrets (security-spec.md §9).
 *
 * Idempotent via upsert-by-email (technical-architecture.md §5.4 / NFR-8.4).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "./generated/prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD, GUEST_VIEWER_EMAIL } from "../lib/data/demoAccounts";

// Standalone script (run via `tsx`, not Next.js), so it builds its own
// PrismaClient rather than importing lib/db.ts's singleton — and uses a
// relative import for the generated client since tsx does not resolve the
// "@/*" tsconfig path alias the same way Next.js's own bundler does.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_USERS: Array<{ name: string; email: string; role: UserRole }> = [
  { name: "A. Whitfield", email: "a.whitfield@investigations.example", role: UserRole.Administrator },
  { name: "M. Delacroix", email: "m.delacroix@investigations.example", role: UserRole.InvestigationManager },
  { name: "R. Okafor", email: "r.okafor@investigations.example", role: UserRole.Investigator },
  { name: "J. Bramwell", email: "j.bramwell@investigations.example", role: UserRole.Reviewer },
  { name: "Guest Viewer", email: GUEST_VIEWER_EMAIL, role: UserRole.Viewer },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  console.log(`Seeded ${DEMO_USERS.length} demo user accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
