"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SourceLogo } from "./SourceLogo";
import type { Conversation, Project, Source } from "@/lib/types";

const SOURCES: { key: Source; label: string }[] = [
  { key: "messages", label: "Messages" },
  { key: "slack", label: "Slack" },
  { key: "telegram", label: "Telegram" },
  { key: "messenger", label: "Messenger" },
];

export function Sidebar({
  workspaceName,
  projects,
  channels,
  toTag,
}: {
  workspaceName: string;
  projects: Project[];
  channels: Conversation[];
  toTag: number;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const on = (href: string) => (path === href ? "nav-item active" : "nav-item");
  return (
    <aside className="sidebar">
      <div className="brand">
        <SourceLogo source="chat" size={26} />
        {workspaceName}
      </div>
      <div className="nav-group">
        <Link className={on("/")} href="/">Threads</Link>
        <Link className={on("/tag")} href="/tag">
          To tag {toTag > 0 && <span className="count ai">{toTag}</span>}
        </Link>
      </div>
      <div className="nav-title">Channels <Link href="/settings#channel" aria-label="New channel">+</Link></div>
      <div className="nav-group">
        {channels.map((c) => (
          <Link key={c.id} className={on(`/c/${c.id}`)} href={`/c/${c.id}`}># {c.name}</Link>
        ))}
      </div>
      <div className="nav-title">Projects <Link href="/settings#project" aria-label="New project">+</Link></div>
      <div className="nav-group">
        {projects.map((p) => (
          <Link key={p.id} className={on(`/projects/${p.id}`)} href={`/projects/${p.id}`}>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
          </Link>
        ))}
      </div>
      <div className="nav-title">Sources</div>
      <div className="nav-group">
        {SOURCES.map((s) => (
          <Link
            key={s.key}
            className={path === "/sources" && (params.get("s") ?? "messages") === s.key ? "nav-item active" : "nav-item"}
            href={`/sources?s=${s.key}`}
          >
            <SourceLogo source={s.key} size={16} />
            {s.label}
          </Link>
        ))}
      </div>
      <div className="nav-group" style={{ marginTop: 12 }}>
        <Link className={on("/settings")} href="/settings">Team &amp; settings</Link>
      </div>
    </aside>
  );
}

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

export function TabBar() {
  const path = usePathname();
  const tab = (href: string, label: string, d: string, match: (p: string) => boolean) => (
    <Link href={href} className={match(path) ? "tab active" : "tab"}>
      <Icon d={d} />
      {label}
    </Link>
  );
  return (
    <nav className="tabbar">
      {tab("/", "Threads", "M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 19.5c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.4c1.9.8 3.1 2.6 3.5 5.1", (p) => p === "/" || p.startsWith("/c/") || p.startsWith("/people") || p === "/tag")}
      {tab("/projects", "Projects", "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", (p) => p.startsWith("/projects"))}
      {tab("/sources", "Sources", "M6 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6", (p) => p.startsWith("/sources"))}
      {tab("/settings", "Team", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z", (p) => p.startsWith("/settings"))}
    </nav>
  );
}
