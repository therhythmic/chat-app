import { notFound } from "next/navigation";
import Link from "next/link";
import { requireWorkspace } from "@/lib/data";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";
import { MessageList } from "@/components/MessageList";
import { LiveRefresh } from "@/components/LiveRefresh";
import { SourceLogo } from "@/components/SourceLogo";
import type { Source } from "@/lib/types";

const FILTERS: (Source | "all")[] = ["all", "chat", "messages", "slack", "telegram", "messenger"];

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, { s }] = await Promise.all([params, searchParams]);
  const { supabase, workspace } = await requireWorkspace();
  const project = workspace.projects.find((p) => p.id === id);
  if (!project) notFound();
  const source = FILTERS.includes(s as Source) ? (s as Source | "all") : "all";

  let q = supabase.from("messages").select(MESSAGE_SELECT).eq("project_id", id).in("tag_status", ["confirmed", "suggested"]);
  if (source !== "all") q = q.eq("source", source);
  const { data } = await q.order("created_at", { ascending: false }).limit(200);

  return (
    <div className="scroll">
      <LiveRefresh workspaceId={workspace.id} />
      <header className="page-head">
        <h1><span className="dot" style={{ background: project.color, width: 12, height: 12 }} />{project.name}</h1>
        <p>Every message tagged {project.name}, from any app.</p>
      </header>
      <div className="filters">
        {FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? `/projects/${id}` : `/projects/${id}?s=${f}`} className={f === source ? "pill on" : "pill"}>
            {f !== "all" && <SourceLogo source={f} size={14} />}
            {f === "all" ? "All" : f === "chat" ? "Nōnia" : f[0].toUpperCase() + f.slice(1)}
          </Link>
        ))}
      </div>
      <MessageList messages={(data ?? []) as unknown as MessageRow[]} projects={workspace.projects} empty={<><strong>Nothing here yet</strong>Tag messages to {project.name} and they collect here.</>} />
    </div>
  );
}
