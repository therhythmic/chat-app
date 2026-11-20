export type Source = "chat" | "messages" | "slack" | "telegram" | "messenger";
export type TagStatus = "none" | "suggested" | "confirmed";

export type Project = { id: string; name: string; color: string };
export type Person = { id: string; display_name: string; user_id: string | null; phone: string | null };
export type Conversation = {
  id: string;
  kind: "channel" | "dm" | "external";
  source: Source;
  name: string | null;
  default_project_id: string | null;
  last_message_at: string | null;
};
export type Message = {
  id: string;
  conversation_id: string;
  person_id: string | null;
  author_user_id: string | null;
  body: string;
  source: Source;
  project_id: string | null;
  tag_status: TagStatus;
  tag_reason: string | null;
  created_at: string;
};

export const SOURCE_LABEL: Record<Source, string> = {
  chat: "Nōnia",
  messages: "Messages",
  slack: "Slack",
  telegram: "Telegram",
  messenger: "Messenger",
};
