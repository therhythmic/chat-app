"use server";

import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function sendCode(email: string): Promise<{ error?: string }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { error: "Enter a valid email." };

  if (!hasAdminKey()) return { error: "Email sign-in isn't switched on yet. Use Google for now." };

  // Only invited people (or existing members) can sign in.
  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin.from("invites").select("email").ilike("email", clean).limit(1).maybeSingle();
  if (inviteError) return { error: "Nōnia isn't fully set up yet. Try again in a few minutes." };
  if (!invite) return { error: "This email hasn't been invited yet. Ask a teammate to invite you." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { shouldCreateUser: true, emailRedirectTo: `${process.env.APP_URL || (await headers()).get("origin") || ""}/auth/confirm` },
  });
  return error ? { error: error.message } : {};
}

export async function verifyCode(email: string, token: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
  return error ? { error: "That code didn't work. Check it, or send a new one." } : {};
}
