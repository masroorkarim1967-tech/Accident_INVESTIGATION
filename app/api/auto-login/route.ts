import { signIn } from "@/lib/auth";
import { AUTO_LOGIN_EMAIL, DEMO_PASSWORD } from "@/lib/data/demoAccounts";

/**
 * Login removed: signs every visitor in automatically as the demo
 * Administrator and sends them to the dashboard. proxy.ts routes any
 * visitor without a session here instead of to the login form.
 */
export async function GET() {
  await signIn("credentials", {
    email: AUTO_LOGIN_EMAIL,
    password: DEMO_PASSWORD,
    redirectTo: "/dashboard",
  });
}
