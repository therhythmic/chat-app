import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/data";
import { conversationPeople } from "@/lib/threads";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";
import { Avatar } from "@/components/Avatar";
import { ProjectChip } from "@/components/Chip";
import { Timeline } from "@/components/Timeline";
import { Composer } from "@/components/Composer";
import { LiveRefresh } from "@/components/LiveRefresh";
import { SOURCE_LABEL } from "@/lib/types";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const { supabase, workspace, userId } = ctx;
  const convo = workspace.conversations.find((c) => c.id === id);
  if (!convo) notFound();

  const [{ data }, members] = await Promise.all([
    supabase.from("messages").select(MESSAGE_SELECT).eq("conversation_id", id).order("created_at", { ascending: false }).limit(200),
    conversationPeople(ctx),
  ]);
  const messages = ((data ?? []) as unknown as MessageRow[]).reverse();
  const myId = workspace.people.find((p) => p.user_id === userId)?.id;
  const others = (members.get(id) ?? []).filter((pid) => pid !== myId).map((pid) => workspace.people.find((p) => p.id === pid)?.display_name).filter(Boolean);
  const title = convo.kind === "channel" ? `#${convo.name}` : convo.name || others.join(", ") || "Conversation";
  const project = workspace.projects.find((p) => p.id === convo.default_project_id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <LiveRefresh workspaceId={workspace.id} />
      <header className="convo-head">
        <Link href="/" className="back" aria-label="Back">‹</Link>
        <Avatar label={convo.kind === "channel" ? "#" : (others[0] ?? "?").slice(0, 1)} source={convo.source} size={36} />
        <div className="who">
          <div className="title">{title}</div>
          <div className="sub">
            {SOURCE_LABEL[convo.source]}
            {project && <ProjectChip project={project} />}
          </div>
        </div>
      </header>
      <Timeline messages={messages} userId={userId} projects={workspace.projects} />
      {convo.source === "chat" ? (
        <Composer conversationId={id} placeholder={`Message ${title}`} />
      ) : (
        <div className="notice">This conversation comes from {SOURCE_LABEL[convo.source]}. Reply there for now. New messages show up here automatically.</div>
      )}
    </div>
  );
}
