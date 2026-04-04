export type ContextSnippet = {
  text: string;
  source_document: string;
};

export type ChatMessage = {
  role: "user" | "system";
  text: string;
  attachments?: File[];
  sources?: ContextSnippet[];
  noRelevantInfo?: boolean;
};
