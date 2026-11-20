import { SourceLogo } from "./SourceLogo";
import { TagControls } from "./TagControls";
import { SOURCE_LABEL, type Project } from "@/lib/types";
import type { MessageRow } from "@/lib/messages";
import { shortTime } from "@/lib/format";

// Messages oldest to newest. When `showContext` is on, a label marks each switch
// of app or conversation, so a merged thread still reads clearly.
export function Timeline({
  messages,
  userId,
  projects,
  showContext = false,
}: {
  messages: MessageRow[];
  userId: string;
  projects: Project[];
  showContext?: boolean;
}) {
  if (!messages.length) {
    return (
      <div className="timeline">
        <div className="empty"><strong>No messages yet</strong>Say hello below.</div>
      </div>
    );
  }
  let lastKey = "";
  let lastSender = "";
  return (
    <div className="timeline">
      {messages.map((m) => {
        const key = `${m.source}:${m.conversation_id}`;
        const ctx = showContext && key !== lastKey;
        const mine = m.author_user_id === userId;
        const sender = m.people?.display_name ?? "Unknown";
        const showSender = !mine && (ctx || sender !== lastSender || key !== lastKey);
        lastKey = key;
        lastSender = sender;
        const where = m.conversations?.kind === "channel" ? `#${m.conversations.name}` : m.conversations?.name;
        return (
          <div key={m.id}>
            {ctx && (
              <div className="ctx">
                <SourceLogo source={m.source} size={14} />
                {SOURCE_LABEL[m.source]}
                {where ? ` · ${where}` : ""} · {shortTime(m.created_at)}
              </div>
            )}
            <div className={mine ? "msg mine" : "msg"}>
              {showSender && <span className="sender">{sender}</span>}
              <div className="bubble">{m.body}</div>
              <TagControls messageId={m.id} projectId={m.project_id} status={m.tag_status} reason={m.tag_reason} projects={projects} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
