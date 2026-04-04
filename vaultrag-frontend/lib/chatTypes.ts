export type ChatMessage = {
  role: "user" | "system";
  text: string;
  attachments?: File[];
  sources?: string[];
  noRelevantInfo?: boolean;
};
