import { Suspense } from "react";
import { requireWorkspace } from "@/lib/data";
import { Sidebar, TabBar } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, workspace } = await requireWorkspace();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .eq("tag_status", "suggested");
  const channels = workspace.conversations.filter((c) => c.kind === "channel");
  return (
    <div className="shell">
      <Suspense>
        <Sidebar workspaceName={workspace.name} projects={workspace.projects} channels={channels} toTag={count ?? 0} />
      </Suspense>
      <main className="main">{children}</main>
      <TabBar />
    </div>
  );
}
