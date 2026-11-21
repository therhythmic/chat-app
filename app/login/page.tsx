"use client";

import { useState, useTransition } from "react";
import { sendCode } from "./actions";
import { SourceLogo } from "@/components/SourceLogo";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <div className="center-page">
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          start(async () => {
            if (!sent) {
              const r = await sendCode(email);
              if (r.error) setError(r.error);
              else setSent(true);
            }
          });
        }}
      >
        <SourceLogo source="chat" size={40} />
        <div>
          <h1 style={{ margin: "8px 0 4px", fontSize: 24 }}>Sign in to Nōnia</h1>
          <p className="muted" style={{ margin: 0 }}>
            {sent ? `We emailed a sign-in link to ${email}. Open it on this device to finish.` : "Use Google, or we'll email you a sign-in link."}
          </p>
        </div>
        {!sent && (
          <>
            <button
              type="button"
              className="btn block"
              disabled={pending}
              onClick={() => {
                setError(undefined);
                start(async () => {
                  const { error } = await createClient().auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${window.location.origin}/auth/confirm` },
                  });
                  if (error) setError(error.message);
                });
              }}
            >
              <GoogleMark /> Continue with Google
            </button>
            <div className="or"><span>or</span></div>
          </>
        )}
        {!sent ? (
          <label className="field">
            Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        ) : null}
        {error && <p className="error">{error}</p>}
        {!sent && (
          <button className="btn dark block" disabled={pending}>
            {pending ? "One moment…" : "Email me a link"}
          </button>
        )}
        {sent && (
          <button type="button" className="linkbtn muted" onClick={() => setSent(false)}>
            Use a different email
          </button>
        )}
      </form>
    </div>
  );
}
