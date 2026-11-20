import { createHmac, timingSafeEqual } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";
import { suggestProject } from "@/lib/ai";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const twiml = (status = 200) => new Response(EMPTY_TWIML, { status, headers: { "Content-Type": "text/xml" } });

// Twilio signs each webhook: HMAC-SHA1 over the full URL plus the POST params
// sorted by name and concatenated as name+value, base64 encoded.
// https://www.twilio.com/docs/usage/webhooks/webhooks-security
function validSignature(url: string, params: Record<string, string>, signature: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => {
    if (typeof v === "string") params[k] = v;
  });
  const url = `${process.env.APP_URL ?? request.nextUrl.origin}/api/twilio/inbound`;
  if (!validSignature(url, params, request.headers.get("x-twilio-signature"))) return twiml(403);

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID;
  const from = params.From;
  const sid = params.MessageSid;
  if (!workspaceId || !from || !sid || !hasAdminKey()) return twiml();

  const numMedia = Number(params.NumMedia ?? 0);
  const body = (params.Body ?? "").trim() || (numMedia > 0 ? `[${numMedia} attachment${numMedia > 1 ? "s" : ""}]` : "");
  if (!body) return twiml();

  const admin = createAdminClient();

  // The sender: match by phone, or add them as a new person named by their number.
  let { data: person } = await admin.from("people").select("id, display_name").eq("workspace_id", workspaceId).eq("phone", from).maybeSingle();
  if (!person) {
    const { data } = await admin.from("people").insert({ workspace_id: workspaceId, phone: from, display_name: from }).select("id, display_name").single();
    person = data;
  }
  if (!person) return twiml(500);

  // One Messages conversation per sender for now. Whether Twilio passes the
  // other group members for a phone-started group text is still to be tested.
  const externalId = `from:${from}`;
  let { data: convo } = await admin
    .from("conversations")
    .select("id, default_project_id")
    .eq("workspace_id", workspaceId)
    .eq("source", "messages")
    .eq("external_id", externalId)
    .maybeSingle();
  if (!convo) {
    const { data } = await admin
      .from("conversations")
      .insert({ workspace_id: workspaceId, kind: "external", source: "messages", external_id: externalId, name: `Texts with ${person.display_name}` })
      .select("id, default_project_id")
      .single();
    convo = data;
    if (convo) await admin.from("conversation_people").insert({ conversation_id: convo.id, person_id: person.id });
  }
  if (!convo) return twiml(500);

  const { data: msg, error } = await admin
    .from("messages")
    .insert({
      workspace_id: workspaceId,
      conversation_id: convo.id,
      person_id: person.id,
      body,
      source: "messages",
      external_id: sid,
      project_id: convo.default_project_id,
      tag_status: convo.default_project_id ? "confirmed" : "none",
    })
    .select("id")
    .single();
  // A repeat delivery of the same MessageSid hits the unique index; that's fine.
  if (error && error.code !== "23505") return twiml(500);
  if (msg && !convo.default_project_id) after(() => suggestProject(msg.id));
  return twiml();
}
