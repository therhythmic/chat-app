import Link from "next/link";
import { requireWorkspace } from "@/lib/data";
import { shortTime } from "@/lib/format";

export default async function ProjectsPage() {
  const { supabase, workspace } = await requireWorkspace();
  const { data } = await supabase
    .from("messages")
    .select("project_id, created_at")
    .eq("workspace_id", workspace.id)
    .eq("tag_status", "confirmed")
    .not("project_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(2000);
  const stats = new Map<string, { n: number; last: string }>();
  for (const r of data ?? []) {
    const s = stats.get(r.project_id!) ?? { n: 0, last: r.created_at };
    s.n++;
    stats.set(r.project_id!, s);
  }
  return (
    <div className="scroll">
      <header className="page-head">
        <h1>Projects</h1>
        <p>Everything tagged to a project, from any app.</p>
      </header>
      <div className="list">
        {workspace.projects.map((p) => {
          const s = stats.get(p.id);
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="row">
              <div className="avatar"><div className="circle" style={{ background: p.color, color: "#fff" }}>{p.name.slice(0, 1)}</div></div>
              <div className="content">
                <div className="top">
                  <span className="name">{p.name}</span>
                  <span className="time">{shortTime(s?.last)}</span>
                </div>
                <div className="preview">{s ? `${s.n} message${s.n === 1 ? "" : "s"}` : "Nothing tagged yet"}</div>
              </div>
            </Link>
          );
        })}
        {!workspace.projects.length && <div className="empty"><strong>No projects yet</strong>Add one in Team &amp; settings.</div>}
      </div>
    </div>
  );
}
