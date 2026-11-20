import { SourceLogo } from "./SourceLogo";
import type { Source } from "@/lib/types";

export function Avatar({ label, source, size = 44 }: { label: string; source?: Source; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <div className="circle" style={{ width: size, height: size, fontSize: size * 0.34 }}>{label}</div>
      {source && (
        <span className="badge">
          <SourceLogo source={source} size={Math.round(size * 0.36)} />
        </span>
      )}
    </div>
  );
}
