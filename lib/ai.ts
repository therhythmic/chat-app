import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { createAdminClient } from "@/lib/supabase/admin";

const Suggestion = z.object({
  project: z.string().describe("Exact project name from the list, or an empty string if none fits."),
  confident: z.boolean().describe("True only when the message clearly belongs to that project."),
  reason: z.string().describe("Under 12 words, shown to the team, e.g. 'Mentions the GearHead launch date'."),
});

/**
 * Suggests a project for one message. The team confirms or changes it, so the
 * model only proposes. Does nothing when ANTHROPIC_API_KEY is not set.
 */
export async function suggestProject(messageId: string) {
  if (!process.env.ANTHROPIC_API_KEY) return;
  const admin = createAdminClient();
  const { data: msg } = await admin
    .from("messages")
    .select("id, workspace_id, conversation_id, body, project_id, tag_status")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.project_id || msg.tag_status !== "none" || msg.body.trim().length < 3) return;

  const [{ data: projects }, { data: recent }] = await Promise.all([
    admin.from("projects").select("id, name").eq("workspace_id", msg.workspace_id),
    admin
      .from("messages")
      .select("body, projects(name)")
      .eq("conversation_id", msg.conversation_id)
      .neq("id", msg.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  if (!projects?.length) return;

  const context = (recent ?? [])
    .reverse()
    .map((m) => {
      const p = (m.projects as unknown as { name: string } | null)?.name;
      return `- ${m.body}${p ? `  [tagged: ${p}]` : ""}`;
    })
    .join("\n");

  const client = new Anthropic();
  try {
    const res = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(Suggestion) },
      system:
        "You sort a small creative team's messages into their projects. Pick the single best project from the list, " +
        "using the earlier messages in the same conversation as context. If nothing in the message or its context points to a project, return an empty project.",
      messages: [
        {
          role: "user",
          content:
            `Projects: ${projects.map((p) => p.name).join(", ")}\n\n` +
            (context ? `Earlier in this conversation:\n${context}\n\n` : "") +
            `New message:\n${msg.body}`,
        },
      ],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return;
    const out = res.parsed_output;
    const match = projects.find((p) => p.name.toLowerCase() === out.project.trim().toLowerCase());
    if (!match) return;
    await admin
      .from("messages")
      .update({ project_id: match.id, tag_status: "suggested", tag_reason: out.reason.slice(0, 140) })
      .eq("id", msg.id)
      .eq("tag_status", "none");
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("AI tagging failed", err.status, err.message);
    else throw err;
  }
}
