import type { Project } from "@/lib/types";

export function ProjectChip({ project }: { project: Project }) {
  return (
    <span className="chip">
      <span className="d" style={{ background: project.color }} />
      {project.name}
    </span>
  );
}

export function AiChip({ label }: { label: string }) {
  return (
    <span className="chip ai">
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="currentColor" />
      </svg>
      {label}
    </span>
  );
}
