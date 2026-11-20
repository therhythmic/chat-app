import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Conversation, Person, Project } from "@/lib/types";

export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const loadMembership = () =>
    supabase
      .from("members")
      .select("workspace_id, display_name, role, workspaces(name)")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
  let { data: membership } = await loadMembership();

  // Someone who signed up before being invited (e.g. with Google) joins on their next visit.
  const email = (claims?.claims?.email as string | undefined)?.toLowerCase();
  if (!membership && email) {
    const admin = createAdminClient();
    const { data: invites } = await admin.from("invites").select("workspace_id, display_name, role").ilike("email", email);
    for (const inv of invites ?? []) {
      const name = inv.display_name ?? email.split("@")[0];
      await admin.from("members").upsert({ workspace_id: inv.workspace_id, user_id: userId, display_name: name, role: inv.role }, { onConflict: "workspace_id,user_id", ignoreDuplicates: true });
      const { data: person } = await admin.from("people").select("id").eq("workspace_id", inv.workspace_id).eq("user_id", userId).maybeSingle();
      if (!person) await admin.from("people").insert({ workspace_id: inv.workspace_id, user_id: userId, display_name: name });
    }
    if (invites?.length) ({ data: membership } = await loadMembership());
  }

  if (!membership) return { supabase, userId, workspace: null } as const;

  const ws = membership.workspaces as unknown as { name: string } | null;
  const workspaceId = membership.workspace_id as string;
  const [projects, people, conversations] = await Promise.all([
    supabase.from("projects").select("id, name, color").eq("workspace_id", workspaceId).order("name"),
    supabase.from("people").select("id, display_name, user_id, phone").eq("workspace_id", workspaceId).order("display_name"),
    supabase
      .from("conversations")
      .select("id, kind, source, name, default_project_id, last_message_at")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  ]);

  return {
    supabase,
    userId,
    workspace: {
      id: workspaceId,
      name: ws?.name ?? "Team",
      me: { displayName: membership.display_name as string, role: membership.role as string },
      projects: (projects.data ?? []) as Project[],
      people: (people.data ?? []) as Person[],
      conversations: (conversations.data ?? []) as Conversation[],
    },
  } as const;
});

export async function requireWorkspace() {
  const ctx = await getContext();
  if (!ctx.workspace) redirect("/welcome");
  return { ...ctx, workspace: ctx.workspace };
}

export function initials(name: string) {
  const parts = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
