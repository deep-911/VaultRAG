import { ContextSnippet } from "./chatTypes";

export type UserRole = "Employee" | "Executive";

const API_BASE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_VAULTRAG_API_URL) ||
  "http://127.0.0.1:8000";

function getApiBase(): string {
  return API_BASE.replace(/\/$/, "");
}

export type ChatHistoryItem = {
  role: "user" | "system";
  text: string;
};

/* ------------------------------------------------------------------ */
/*  Streaming /ask consumer                                           */
/* ------------------------------------------------------------------ */

const CONTEXT_DELIMITER = "\n\n__VAULTRAG_CONTEXT__\n";

export type StreamCallbacks = {
  onToken: (token: string) => void;
  onContext: (context: ContextSnippet[]) => void;
  onDone: () => void;
  onError: (error: Error) => void;
};

/**
 * Consume the streaming /ask endpoint.
 * Text tokens are forwarded via `onToken`, and the final
 * JSON context array is forwarded via `onContext`.
 *
 * The backend yields the delimiter and the JSON in separate chunks,
 * so after detecting the delimiter we must keep reading until the
 * stream ends to collect the complete JSON payload.
 */
export async function askVaultRagStream(
  query: string,
  user_role: UserRole,
  chat_history: ChatHistoryItem[] = [],
  callbacks: StreamCallbacks,
): Promise<void> {
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

  if (!res.body) {
    throw new Error("Response body is not readable");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let emittedLength = 0;
  let delimiterFound = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fullText += decoder.decode(value, { stream: true });

      // Once we've found the delimiter, just keep accumulating the
      // JSON payload — don't emit anything else as visible text.
      if (delimiterFound) continue;

      // Check whether the delimiter has arrived in the buffer
      const delimIdx = fullText.indexOf(CONTEXT_DELIMITER);
      if (delimIdx !== -1) {
        delimiterFound = true;
        // Emit any remaining answer text before the delimiter
        if (delimIdx > emittedLength) {
          callbacks.onToken(fullText.slice(emittedLength, delimIdx));
        }
        emittedLength = fullText.length;
        // Don't break — keep reading so the JSON payload is complete
        continue;
      }

      // Emit text safely — hold back delimiter-length chars to avoid
      // emitting a partial delimiter that we'd later need to retract.
      const safeUpTo = fullText.length - CONTEXT_DELIMITER.length;
      if (safeUpTo > emittedLength) {
        callbacks.onToken(fullText.slice(emittedLength, safeUpTo));
        emittedLength = safeUpTo;
      }
    }

    // --- Post-stream processing ---
    if (delimiterFound) {
      // Extract everything after the delimiter as the JSON payload
      const delimIdx = fullText.indexOf(CONTEXT_DELIMITER);
      const jsonStr = fullText.slice(delimIdx + CONTEXT_DELIMITER.length);
      if (jsonStr.trim()) {
        try {
          const context = JSON.parse(jsonStr) as ContextSnippet[];
          callbacks.onContext(context);
        } catch {
          console.warn("Failed to parse context JSON from stream:", jsonStr.slice(0, 200));
        }
      }
    } else if (fullText.length > emittedLength) {
      // No delimiter found at all — emit everything remaining
      callbacks.onToken(fullText.slice(emittedLength));
    }

    callbacks.onDone();
  } catch (e) {
    callbacks.onError(e instanceof Error ? e : new Error(String(e)));
  }
}

/* ------------------------------------------------------------------ */
/*  File upload                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

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
