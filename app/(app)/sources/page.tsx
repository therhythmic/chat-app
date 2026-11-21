import Link from "next/link";
import { requireWorkspace } from "@/lib/data";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";
import { MessageList } from "@/components/MessageList";
import { LiveRefresh } from "@/components/LiveRefresh";
import { SourceLogo } from "@/components/SourceLogo";
import { SOURCE_LABEL, type Source } from "@/lib/types";

const SOURCES: Source[] = ["messages", "slack", "telegram", "messenger"];
const CONNECTED: Partial<Record<Source, boolean>> = { messages: !!process.env.TWILIO_PHONE_NUMBER };

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ s?: string; p?: string }> }) {
  const { s, p } = await searchParams;
  const { supabase, workspace } = await requireWorkspace();
  const source: Source = SOURCES.includes(s as Source) ? (s as Source) : "messages";

  const { data: all } = await supabase.from("messages").select("source, person_id").eq("workspace_id", workspace.id).neq("source", "chat").limit(5000);
  const count = (src: Source) => (all ?? []).filter((m) => m.source === src).length;
  const peopleHere = workspace.people.filter((x) => (all ?? []).some((m) => m.source === source && m.person_id === x.id));

  let q = supabase.from("messages").select(MESSAGE_SELECT).eq("workspace_id", workspace.id).eq("source", source);
  if (p) q = q.eq("person_id", p);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);

  return (
    <div className="scroll">
      <LiveRefresh workspaceId={workspace.id} />
      <header className="page-head">
        <h1>Sources</h1>
        <p>Messages by app and by team member.</p>
      </header>
      <div className="tiles">
        {SOURCES.map((src) => (
          <Link key={src} href={`/sources?s=${src}`} className={src === source ? "tile on" : "tile"}>
            <SourceLogo source={src} size={22} />
            {SOURCE_LABEL[src]}
            <small>{count(src)}</small>
          </Link>
        ))}
      </div>
      {peopleHere.length > 0 && (
        <div className="filters">
          <Link href={`/sources?s=${source}`} className={!p ? "pill on" : "pill"}>Everyone</Link>
          {peopleHere.map((x) => (
            <Link key={x.id} href={`/sources?s=${source}&p=${x.id}`} className={p === x.id ? "pill on" : "pill"}>{x.display_name}</Link>
          ))}
        </div>
      )}
      <MessageList
        messages={(data ?? []) as unknown as MessageRow[]}
        projects={workspace.projects}
        empty={
          source === "messages" && !CONNECTED.messages ? (
            <><strong>Messages isn&apos;t connected yet</strong>Once the Nōnia number is set up, add it to a group text and messages land here.</>
          ) : source !== "messages" ? (
            <><strong>{SOURCE_LABEL[source]} is coming next</strong>We&apos;ll connect it after Messages.</>
          ) : (
            <><strong>No messages yet</strong>Add the Nōnia number to a group text.</>
          )
        }
      />
    </div>
  );
}
