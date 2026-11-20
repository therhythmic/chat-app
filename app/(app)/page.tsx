import Link from "next/link";
import { requireWorkspace, initials } from "@/lib/data";
import { threadsByPerson } from "@/lib/threads";
import { Avatar } from "@/components/Avatar";
import { AiChip, ProjectChip } from "@/components/Chip";
import { LiveRefresh } from "@/components/LiveRefresh";
import { shortTime } from "@/lib/format";

export default async function ThreadsPage() {
  const ctx = await requireWorkspace();
  const { workspace } = ctx;
  const threads = await threadsByPerson(ctx);
  const channels = workspace.conversations.filter((c) => c.kind === "channel");
  const project = (id: string | null) => workspace.projects.find((p) => p.id === id);

  return (
    <div className="scroll">
      <LiveRefresh workspaceId={workspace.id} />
      <header className="page-head">
        <h1>Threads</h1>
        <p>Everyone on the team, with every app merged per person.</p>
      </header>
      <div className="list">
        {threads.map(({ person, msg, unsorted }) => {
          const p = project(msg?.project_id ?? null);
          return (
            <Link key={person.id} href={`/people/${person.id}`} className="row">
              <Avatar label={initials(person.display_name)} source={msg?.source} />
              <div className="content">
                <div className="top">
                  <span className="name">{person.display_name}</span>
                  <span className="time">{shortTime(msg?.created_at)}</span>
                </div>
                <div className="preview">{msg ? msg.body : "No messages yet. Say hello."}</div>
                {msg && (p || unsorted) ? (
                  <div className="meta">
                    {p && msg.tag_status === "confirmed" && <ProjectChip project={p} />}
                    {unsorted ? <AiChip label={`${unsorted} to tag`} /> : null}
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
        {!threads.length && (
          <div className="empty"><strong>It&apos;s just you so far</strong>Invite your team from Team &amp; settings.</div>
        )}
      </div>
      {channels.length > 0 && (
        <>
          <div className="section">Channels</div>
          <div className="list">
            {channels.map((c) => (
              <Link key={c.id} href={`/c/${c.id}`} className="row">
                <Avatar label="#" source="chat" />
                <div className="content">
                  <div className="top">
                    <span className="name">#{c.name}</span>
                    <span className="time">{shortTime(c.last_message_at)}</span>
                  </div>
                  {project(c.default_project_id) && (
                    <div className="meta"><ProjectChip project={project(c.default_project_id)!} /></div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
