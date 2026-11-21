import type { Source, TagStatus } from "@/lib/types";

export const MESSAGE_SELECT =
  "id, conversation_id, person_id, author_user_id, body, source, project_id, tag_status, tag_reason, created_at, people(display_name), conversations(name, kind, source)";

export type MessageRow = {
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
  people: { display_name: string } | null;
  conversations: { name: string | null; kind: string; source: Source } | null;
};
