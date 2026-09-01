"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { loginAction, continueAsViewerAction, type LoginActionState } from "./actions";

const DEMO_ACCOUNTS = [
  { role: "Administrator", email: "a.whitfield@investigations.example" },
  { role: "Investigation Manager", email: "m.delacroix@investigations.example" },
  { role: "Investigator", email: "r.okafor@investigations.example" },
  { role: "Reviewer", email: "j.bramwell@investigations.example" },
  { role: "Viewer", email: "viewer@investigations.example" },
];

const INITIAL_STATE: LoginActionState = { error: null };

export default function LoginPage() {
  const [loginState, loginFormAction, loginPending] = useActionState(loginAction, INITIAL_STATE);
  const [viewerState, viewerFormAction, viewerPending] = useActionState(
    async () => continueAsViewerAction(),
    INITIAL_STATE,
  );

  const error = loginState.error ?? viewerState.error;

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded border border-border md:grid-cols-2">
      {/* Hero panel (desktop/tablet) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-surface p-8 md:flex">
        <div className="radar-sweep pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-30" />
        <div className="relative z-10">
          <p className="font-mono text-sm font-semibold text-foreground">
            Aviation Incident Investigation Assistant
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            A guided aviation incident investigation workflow — portfolio demonstration.
          </p>
        </div>
        <Link href="/settings" className="relative z-10 text-sm text-teal hover:underline">
          About
        </Link>
      </div>

      {/* Login card */}
      <div className="flex flex-col gap-6 bg-background p-8">
        <div className="md:hidden">
          <p className="font-mono text-sm font-semibold text-foreground">
            Aviation Incident Investigation Assistant
          </p>
        </div>

        {error && <ErrorBanner message={error} />}

        <form action={loginFormAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-muted">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-muted">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-teal"
            />
          </div>
          <Button type="submit" disabled={loginPending} className="w-full">
            {loginPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <form action={viewerFormAction}>
          <Button type="submit" variant="ghost" disabled={viewerPending} className="w-full">
            {viewerPending ? "Signing in…" : "Continue as Viewer"}
          </Button>
        </form>

        <div className="rounded border border-border bg-surface p-3 text-xs text-muted">
          <p className="mb-2 font-mono uppercase tracking-wide text-teal">Demo accounts</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email} className="flex justify-between gap-2">
                <span>{account.role}</span>
                <span className="font-mono">{account.email}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Password for every demo account: <span className="font-mono">Demo!Pass2026</span>
          </p>
        </div>
      </div>
    </div>
  );
}
