"use client";

import { useState, useTransition } from "react";
import { setTag } from "@/app/(app)/actions";
import { AiChip, ProjectChip } from "./Chip";
import type { Project, TagStatus } from "@/lib/types";

export function TagControls({
  messageId,
  projectId,
  status,
  reason,
  projects,
}: {
  messageId: string;
  projectId: string | null;
  status: TagStatus;
  reason: string | null;
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const project = projects.find((p) => p.id === projectId);
  const choose = (id: string | null) => {
    setOpen(false);
    start(() => setTag(messageId, id));
  };

  return (
    <div className="tagrow menu" style={{ opacity: pending ? 0.5 : 1 }}>
      {status === "suggested" && project ? (
        <>
          <AiChip label={`${project.name}?`} />
          <button className="linkbtn" onClick={() => choose(project.id)} title={reason ?? undefined}>Yes</button>
          <button className="linkbtn muted" onClick={() => setOpen((o) => !o)}>Change</button>
        </>
      ) : project ? (
        <button className="chip" onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
          <span className="d" style={{ background: project.color }} />
          {project.name}
        </button>
      ) : (
        projects.length > 0 && <button className="linkbtn muted" onClick={() => setOpen((o) => !o)}>+ Tag project</button>
      )}
      {open && (
        <div className="menu-list" role="menu">
          {projects.map((p) => (
            <button key={p.id} role="menuitem" onClick={() => choose(p.id)}>
              <ProjectChip project={p} />
            </button>
          ))}
          {project && (
            <button role="menuitem" onClick={() => choose(null)} className="muted">Remove tag</button>
          )}
        </div>
      )}
    </div>
  );
}
