import Link from "next/link";
import { initials } from "@/lib/data";
import { Avatar } from "./Avatar";
import { TagControls } from "./TagControls";
import { shortTime } from "@/lib/format";
import { SOURCE_LABEL, type Project } from "@/lib/types";
import type { MessageRow } from "@/lib/messages";

// A flat, newest-first list of messages from any app, each with its tag controls.
export function MessageList({ messages, projects, empty }: { messages: MessageRow[]; projects: Project[]; empty: React.ReactNode }) {
  if (!messages.length) return <div className="empty">{empty}</div>;
  return (
    <div className="list">
      {messages.map((m) => {
        const who = m.people?.display_name ?? "Unknown";
        const where = m.conversations?.kind === "channel" ? `#${m.conversations.name}` : m.conversations?.name;
        return (
          <div key={m.id} className="row">
            <Link href={`/c/${m.conversation_id}`}>
              <Avatar label={initials(who)} source={m.source} />
            </Link>
            <div className="content">
              <Link href={`/c/${m.conversation_id}`} className="top">
                <span className="name">{who}</span>
                <span className="time">{shortTime(m.created_at)}</span>
              </Link>
              <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{m.body}</div>
              <div className="meta">
                {SOURCE_LABEL[m.source]}
                {where ? ` · ${where}` : ""}
              </div>
              <TagControls messageId={m.id} projectId={m.project_id} status={m.tag_status} reason={m.tag_reason} projects={projects} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
