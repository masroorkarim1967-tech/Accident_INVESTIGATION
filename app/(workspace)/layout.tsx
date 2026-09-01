import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { NavShell } from "@/components/layout/NavShell";

/**
 * Wraps every authenticated page. Belt-and-suspenders alongside proxy.ts:
 * the proxy already redirects an unauthenticated request before it gets
 * here, but this layout re-checks so the page never renders without a
 * session regardless of how it was reached.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <NavShell user={{ name: session.user.name ?? session.user.email ?? "User", role: session.user.role }}>
      {children}
    </NavShell>
  );
}
