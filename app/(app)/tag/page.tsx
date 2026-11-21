import { requireWorkspace } from "@/lib/data";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";
import { MessageList } from "@/components/MessageList";
import { LiveRefresh } from "@/components/LiveRefresh";

export default async function ToTagPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("workspace_id", workspace.id)
    .eq("tag_status", "suggested")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <div className="scroll">
      <LiveRefresh workspaceId={workspace.id} />
      <header className="page-head">
        <h1>To tag</h1>
        <p>AI guessed a project for these. Tap Yes, or change it.</p>
      </header>
      <MessageList messages={(data ?? []) as unknown as MessageRow[]} projects={workspace.projects} empty={<><strong>All caught up</strong>New guesses show up here.</>} />
    </div>
  );
}
