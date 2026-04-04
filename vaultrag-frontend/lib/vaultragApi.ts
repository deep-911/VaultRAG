import { ContextSnippet } from "./chatTypes";

export type UserRole = "Employee" | "Executive";

const API_BASE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_VAULTRAG_API_URL) ||
  "http://127.0.0.1:8000";

function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}

type AskResponse = {
  answer: string;
  context_used: ContextSnippet[];
};

export type ChatHistoryItem = {
  role: "user" | "system";
  text: string;
};

export async function askVaultRag(
  query: string,
  user_role: UserRole,
  chat_history: ChatHistoryItem[] = []
): Promise<AskResponse> {
  const res = await fetch(`${getApiBase()}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, user_role, chat_history }),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }

  return res.json() as Promise<AskResponse>;
}

export async function uploadExecutiveFile(file: File): Promise<void> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${getApiBase()}/upload-file`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Upload failed (${res.status})`);
  }
}

const NO_RELEVANT_ANSWER = "No relevant information found.";

export function isNoRelevantAnswer(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t === NO_RELEVANT_ANSWER) return true;
  if (
    t === "Not authorized or no documents available for your role."
  ) {
    return true;
  }
  return false;
}
