"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/data";
import { suggestProject } from "@/lib/ai";

const COLORS = ["#E8833A", "#3A7BE8", "#2FA36B", "#C24FD6", "#D94A4A", "#0F8C8C", "#B58A1B"];

export async function postMessage(conversationId: string, body: string): Promise<{ error?: string }> {
  const text = body.trim();
  if (!text) return {};
  const { supabase, userId, workspace } = await requireWorkspace();
  const me = workspace.people.find((p) => p.user_id === userId);
  const convo = workspace.conversations.find((c) => c.id === conversationId);
  if (!convo) return { error: "Conversation not found." };
  if (convo.source !== "chat") return { error: `Reply to this in ${convo.source} for now.` };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      workspace_id: workspace.id,
      conversation_id: conversationId,
      author_user_id: userId,
      person_id: me?.id ?? null,
      body: text.slice(0, 8000),
      source: "chat",
      project_id: convo.default_project_id,
      tag_status: convo.default_project_id ? "confirmed" : "none",
    })
    .select("id")
    .single();
  if (error) return { error: "Couldn't send. Try again." };
  if (!convo.default_project_id) after(() => suggestProject(data.id));
  revalidatePath("/", "layout");
  return {};
}

export async function setTag(messageId: string, projectId: string | null): Promise<void> {
  const { supabase } = await requireWorkspace();
  await supabase
    .from("messages")
    .update({ project_id: projectId, tag_status: projectId ? "confirmed" : "none", tag_reason: null })
    .eq("id", messageId);
  revalidatePath("/", "layout");
}

export async function openDm(personId: string) {
  const { supabase, userId, workspace } = await requireWorkspace();
  const me = workspace.people.find((p) => p.user_id === userId);
  if (!me || me.id === personId) redirect(`/people/${personId}`);

  const { data: mine } = await supabase.from("conversation_people").select("conversation_id").eq("person_id", me.id);
  const { data: theirs } = await supabase.from("conversation_people").select("conversation_id").eq("person_id", personId);
  const theirSet = new Set((theirs ?? []).map((r) => r.conversation_id));
  const existing = workspace.conversations.find(
    (c) => c.kind === "dm" && c.source === "chat" && (mine ?? []).some((r) => r.conversation_id === c.id && theirSet.has(c.id)),
  );
  if (existing) redirect(`/c/${existing.id}`);

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ workspace_id: workspace.id, kind: "dm", source: "chat", created_by: userId })
    .select("id")
    .single();
  if (error) throw new Error("Couldn't start the conversation.");
  await supabase.from("conversation_people").insert([
    { conversation_id: convo.id, person_id: me.id },
    { conversation_id: convo.id, person_id: personId },
  ]);
  revalidatePath("/", "layout");
  redirect(`/c/${convo.id}`);
}

export async function createChannel(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 60);
  const projectId = String(formData.get("project") ?? "") || null;
  if (!name) return;
  const { supabase, userId, workspace } = await requireWorkspace();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ workspace_id: workspace.id, kind: "channel", source: "chat", name, default_project_id: projectId, created_by: userId })
    .select("id")
    .single();
  if (error) throw new Error("Couldn't create the channel.");
  revalidatePath("/", "layout");
  redirect(`/c/${data.id}`);
}

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  const { supabase, workspace } = await requireWorkspace();
  const color = COLORS[workspace.projects.length % COLORS.length];
  const { data, error } = await supabase.from("projects").insert({ workspace_id: workspace.id, name, color }).select("id").single();
  if (error) throw new Error(error.code === "23505" ? "A project with that name already exists." : "Couldn't create the project.");
  revalidatePath("/", "layout");
  redirect(`/projects/${data.id}`);
}

export async function invite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("name") ?? "").trim() || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  const { supabase, userId, workspace } = await requireWorkspace();
  await supabase.from("invites").insert({ workspace_id: workspace.id, email, display_name: displayName, invited_by: userId });
  revalidatePath("/settings");
}

export async function signOut() {
  const { supabase } = await requireWorkspace();
  await supabase.auth.signOut();
  redirect("/login");
}
