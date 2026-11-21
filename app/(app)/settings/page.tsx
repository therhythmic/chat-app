import { requireWorkspace } from "@/lib/data";
import { createChannel, createProject, invite, signOut } from "../actions";
import { ProjectChip } from "@/components/Chip";

export default async function SettingsPage() {
  const { supabase, workspace } = await requireWorkspace();
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("members").select("user_id, display_name, role").eq("workspace_id", workspace.id).order("display_name"),
    supabase.from("invites").select("email, display_name").eq("workspace_id", workspace.id).order("created_at"),
  ]);
  const number = process.env.TWILIO_PHONE_NUMBER;

  return (
    <div className="scroll">
      <header className="page-head">
        <h1>Team &amp; settings</h1>
        <p>{workspace.name}</p>
      </header>
      <div className="stack" style={{ padding: "0 16px 32px", maxWidth: 560 }}>
        <section className="card stack">
          <strong>Team</strong>
          {(members ?? []).map((m) => (
            <div key={m.user_id} className="muted">{m.display_name}{m.role === "owner" ? " · owner" : ""}</div>
          ))}
          <div className="muted">Invited: {(invites ?? []).map((i) => i.display_name || i.email).join(", ") || "nobody yet"}</div>
          <form action={invite} className="stack">
            <label className="field">Name<input name="name" placeholder="Antjuan" /></label>
            <label className="field">Email<input name="email" type="email" required placeholder="name@company.com" /></label>
            <button className="btn">Invite</button>
          </form>
          <p className="muted" style={{ margin: 0 }}>They sign in with Google or an emailed code using that address.</p>
        </section>

        <section id="project" className="card stack">
          <strong>Projects</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {workspace.projects.map((p) => <ProjectChip key={p.id} project={p} />)}
          </div>
          <form action={createProject} style={{ display: "flex", gap: 8 }}>
            <input name="name" required placeholder="New project" className="field" style={{ flex: 1, padding: "10px 12px", borderRadius: 12, border: "1px solid var(--line)" }} />
            <button className="btn">Add</button>
          </form>
        </section>

        <section id="channel" className="card stack">
          <strong>New channel</strong>
          <form action={createChannel} className="stack">
            <label className="field">Name<input name="name" required placeholder="gearhead-launch" /></label>
            <label className="field">
              Project (optional, tags every message in it)
              <select name="project" defaultValue="">
                <option value="">None</option>
                {workspace.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <button className="btn">Create channel</button>
          </form>
        </section>

        <section className="card stack">
          <strong>Messages (iMessage and SMS)</strong>
          {number ? (
            <p className="muted" style={{ margin: 0 }}>
              Save <b>{number}</b> as a contact named Nōnia. Start a new group text with your teammates and that contact. Everything in it shows up here, and AI suggests the project.
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Not connected yet. It needs a Nōnia phone number.</p>
          )}
        </section>

        <form action={signOut}><button className="btn block">Sign out</button></form>
      </div>
    </div>
  );
}
