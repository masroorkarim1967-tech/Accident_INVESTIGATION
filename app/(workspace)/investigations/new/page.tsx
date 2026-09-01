import type { Metadata } from "next";
import { CreateInvestigationForm } from "@/components/investigations/CreateInvestigationForm";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "New Investigation — Aviation Incident Investigation Assistant",
};

/**
 * FR-005 (Create New Investigation), ui-spec.md §4. A minimal-friction
 * single form, not a stepper.
 */
export default async function NewInvestigationPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-full max-w-md rounded border border-border bg-surface p-6">
        <h1 className="mb-4 text-lg font-semibold text-foreground">New Investigation</h1>
        <CreateInvestigationForm defaultReporterName={currentUser.name} />
      </div>
    </div>
  );
}
