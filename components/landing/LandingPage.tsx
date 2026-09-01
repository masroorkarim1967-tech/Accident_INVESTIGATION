import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DisclaimerRibbon } from "@/components/layout/DisclaimerRibbon";

type FeatureStatus = "live" | "planned";

const STATUS_LABEL: Record<FeatureStatus, string> = {
  live: "Live",
  planned: "Planned",
};

const STATUS_CLASSES: Record<FeatureStatus, string> = {
  live: "border-green text-green",
  planned: "border-slate text-slate",
};

function StatusPill({ status }: { status: FeatureStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${STATUS_CLASSES[status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

const FEATURES: Array<{
  glyph: string;
  title: string;
  description: string;
  status: FeatureStatus;
}> = [
  {
    glyph: "◎",
    title: "Investigation Workflow",
    description:
      "A six-state lifecycle (Draft → Open → Under Investigation → Analysis → Review → Closed) with role-gated editing and a read-only rule once an investigation reaches Review.",
    status: "live",
  },
  {
    glyph: "△",
    title: "Risk Assessment",
    description:
      "Actual and potential outcome severity combine with likelihood of recurrence into a computed risk score, band, and investigation priority — always human-overridable with a mandatory written justification.",
    status: "live",
  },
  {
    glyph: "▤",
    title: "Evidence Management",
    description: "Upload, categorize, and link supporting evidence to specific findings.",
    status: "planned",
  },
  {
    glyph: "◇",
    title: "Root Cause Analysis",
    description: "Structured 5 Whys chains and contributing-factor documentation, linked back to the hazards they explain.",
    status: "planned",
  },
  {
    glyph: "✓",
    title: "Corrective Actions",
    description: "Track corrective and preventive actions from assignment through verification, with overdue tracking.",
    status: "planned",
  },
  {
    glyph: "▦",
    title: "Investigation Dashboard",
    description: "Portfolio-wide stat tiles and charts across every open, in-progress, and closed investigation.",
    status: "planned",
  },
  {
    glyph: "▣",
    title: "Report Generation",
    description: "A structured, exportable final report assembled from the investigation record.",
    status: "planned",
  },
];

const WORKFLOW_STAGES = ["Draft", "Open", "Under Investigation", "Analysis", "Review", "Closed"];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DisclaimerRibbon />

      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
          <span aria-hidden="true" className="text-teal">
            ◎
          </span>
          <span className="hidden sm:inline">Aviation Incident Investigation Assistant</span>
          <span className="sm:hidden">AIIA</span>
        </Link>
        <Link href="/login">
          <Button variant="secondary" className="whitespace-nowrap">
            Sign In
          </Button>
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border px-4 py-16 sm:px-6 sm:py-24">
          <div className="radar-sweep pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-20 sm:opacity-30" />
          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-start gap-6 text-left">
            <span className="rounded-full border border-amber px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber">
              Educational / Demonstration System
            </span>
            <h1 className="font-mono text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl">
              Aviation Incident Investigation Assistant
            </h1>
            <p className="max-w-xl text-lg text-muted sm:text-xl">
              Structured investigation support for aviation safety and operations teams.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login">
                <Button className="w-full sm:w-auto">Sign In</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" className="w-full sm:w-auto">
                  View Demo Accounts
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Prominent disclaimer block */}
        <section className="border-b border-border bg-surface px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded border border-amber/40 bg-amber-muted/10 p-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber px-2.5 py-0.5 font-mono text-xs uppercase tracking-widest text-amber">
                Educational / Demonstration System
              </span>
              <span className="rounded-full border border-amber px-2.5 py-0.5 font-mono text-xs uppercase tracking-widest text-amber">
                Uses simulated aviation data
              </span>
            </div>
            <p className="text-foreground">
              This application uses simulated, fictional aviation incident data for demonstration purposes only. It
              is not affiliated with any aviation authority.{" "}
              <strong>
                Not a substitute for official aviation investigation or regulatory reporting.
              </strong>{" "}
              No occurrence classification, risk rating, or root-cause suggestion produced by this application
              represents an official, regulatory, or authoritative determination under any real aviation safety
              framework (ICAO Annex 13, NTSB, EASA, or otherwise).
            </p>
          </div>
        </section>

        {/* Workflow strip */}
        <section className="border-b border-border px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-mono text-xs uppercase tracking-widest text-teal">
              Investigation Lifecycle
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
              {WORKFLOW_STAGES.map((stage, i) => (
                <div key={stage} className="flex items-center gap-2">
                  <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
                    {stage}
                  </span>
                  {i < WORKFLOW_STAGES.length - 1 && (
                    <span aria-hidden="true" className="text-muted">
                      →
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature showcase */}
        <section className="px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center font-mono text-xs uppercase tracking-widest text-teal">What It Does</h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted">
              Built in the open, phase by phase — every capability below is either live today or specified and
              scheduled, never silently assumed.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="flex flex-col gap-2 rounded border border-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span aria-hidden="true" className="text-2xl text-teal">
                      {feature.glyph}
                    </span>
                    <StatusPill status={feature.status} />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Investigation Support callout */}
        <section className="border-t border-border bg-surface px-4 py-12 sm:px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded border border-dashed border-teal/50 p-5">
            <p className="font-mono text-xs uppercase tracking-widest text-teal">
              Investigation Support · Rule-Based, Not AI
            </p>
            <p className="text-sm text-foreground">
              Where the application offers a suggestion — such as a likely occurrence classification — it is always
              local, keyword-based, rule-driven logic, never an external AI service call. Suggestions are always
              clearly labeled, always require the investigator to explicitly accept them, and are never applied
              automatically.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-6">
        <p>
          Portfolio project — built via Spec-Driven Development. Every named airline, airport, aircraft
          registration, flight number, and individual in this application is entirely fictional.
        </p>
      </footer>
    </div>
  );
}
