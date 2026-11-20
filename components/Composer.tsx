"use client";

import { useRef, useState, useTransition } from "react";
import { postMessage } from "@/app/(app)/actions";

export function Composer({ conversationId, placeholder }: { conversationId: string; placeholder: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    setError(undefined);
    start(async () => {
      const r = await postMessage(conversationId, body);
      if (r.error) {
        setError(r.error);
        setText(body);
      }
      ref.current?.focus();
    });
  };
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        {error && <span className="error">{error}</span>}
      </div>
      <button className="send" disabled={pending || !text.trim()} aria-label="Send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}
