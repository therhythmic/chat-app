import Link from "next/link";
import { notFound } from "next/navigation";
import { requireWorkspace, initials } from "@/lib/data";
import { conversationPeople } from "@/lib/threads";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";
import { Avatar } from "@/components/Avatar";
import { Timeline } from "@/components/Timeline";
import { LiveRefresh } from "@/components/LiveRefresh";
import { openDm } from "../../actions";

export default async function PersonThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireWorkspace();
  const { supabase, workspace, userId } = ctx;
  const person = workspace.people.find((p) => p.id === id);
  if (!person) notFound();

  // Their messages anywhere, plus every DM or group text they're in.
  const members = await conversationPeople(ctx);
  const shared = [...members.entries()].filter(([, ids]) => ids.includes(id)).map(([cid]) => cid);
  const filter = shared.length ? `person_id.eq.${id},conversation_id.in.(${shared.join(",")})` : `person_id.eq.${id}`;
  const { data } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("workspace_id", workspace.id)
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(200);
  const messages = ((data ?? []) as unknown as MessageRow[]).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <LiveRefresh workspaceId={workspace.id} />
      <header className="convo-head">
        <Link href="/" className="back" aria-label="Back">‹</Link>
        <Avatar label={initials(person.display_name)} size={36} />
        <div className="who">
          <div className="title">{person.display_name}</div>
          <div className="sub">All apps, one thread</div>
        </div>
      </header>
      <Timeline messages={messages} userId={userId} projects={workspace.projects} showContext />
      {person.user_id && person.user_id !== userId && (
        <form action={openDm.bind(null, id)} className="composer" style={{ justifyContent: "center" }}>
          <button className="btn dark block">Message {person.display_name.split(" ")[0]} in Nōnia</button>
        </form>
      )}
    </div>
  );
}
