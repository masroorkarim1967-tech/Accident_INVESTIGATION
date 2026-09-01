import type { Metadata } from "next";
import { DisclaimerRibbon } from "@/components/layout/DisclaimerRibbon";

// The login page itself is a Client Component and can't export `metadata`
// directly, so it's declared on this (Server Component) layout instead.
export const metadata: Metadata = {
  title: "Sign In — Aviation Incident Investigation Assistant",
};

/**
 * Pre-authentication layout (ui-spec.md §1) — no App Header Bar/nav, but
 * the Disclaimer Ribbon still shows here per that page's spec.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DisclaimerRibbon />
      <main className="flex flex-1 items-center justify-center p-4">{children}</main>
    </div>
  );
}
