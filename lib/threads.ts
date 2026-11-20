import "server-only";
import { requireWorkspace } from "@/lib/data";
import { MESSAGE_SELECT, type MessageRow } from "@/lib/messages";

type Ctx = Awaited<ReturnType<typeof requireWorkspace>>;

/** Maps each non-channel conversation to the people in it. */
export async function conversationPeople(ctx: Ctx) {
  const ids = ctx.workspace.conversations.filter((c) => c.kind !== "channel").map((c) => c.id);
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const { data } = await ctx.supabase.from("conversation_people").select("conversation_id, person_id").in("conversation_id", ids);
  for (const r of data ?? []) map.set(r.conversation_id, [...(map.get(r.conversation_id) ?? []), r.person_id]);
  return map;
}

/**
 * Threads by team member: every message is filed under the person it came
 * from, or, for my own messages in a DM or group text, under the others in it.
 */
export async function threadsByPerson(ctx: Ctx) {
  const myId = ctx.workspace.people.find((p) => p.user_id === ctx.userId)?.id;
  const [{ data }, members] = await Promise.all([
    ctx.supabase.from("messages").select(MESSAGE_SELECT).eq("workspace_id", ctx.workspace.id).order("created_at", { ascending: false }).limit(500),
    conversationPeople(ctx),
  ]);
  const latest = new Map<string, { msg: MessageRow; unsorted: number }>();
  for (const m of (data ?? []) as unknown as MessageRow[]) {
    const kind = m.conversations?.kind;
    const owners =
      m.person_id && m.person_id !== myId
        ? [m.person_id]
        : kind !== "channel"
          ? (members.get(m.conversation_id) ?? []).filter((id) => id !== myId)
          : [];
    for (const pid of owners) {
      const cur = latest.get(pid);
      if (!cur) latest.set(pid, { msg: m, unsorted: m.tag_status === "suggested" ? 1 : 0 });
      else if (m.tag_status === "suggested") cur.unsorted++;
    }
  }
  return ctx.workspace.people
    .filter((p) => p.id !== myId)
    .map((p) => ({ person: p, ...latest.get(p.id) }))
    .sort((a, b) => (b.msg?.created_at ?? "").localeCompare(a.msg?.created_at ?? ""));
}
