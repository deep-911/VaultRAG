import React, { useRef, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../lib/chatTypes';
import SourceSnippet from './SourceSnippet';

function TypingIndicator() {
  return (
    <div className="chat-message chat-message--system">
      <div className="chat-bubble chat-bubble--system flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </div>
        <div className="text-sm font-medium text-indigo-300/80 animate-pulse tracking-wide">
          VaultRAG is analyzing corporate archives...
        </div>
      </div>
    </div>
  );
}

function WelcomeState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
  const suggestions = [
    'What policies apply to my team this quarter?',
    'Summarize the latest financial figures we have on record.',
    'What security or compliance topics are documented?',
    'What did we decide about the product roadmap?',
  ];

  return (
    <div className="welcome">
      <div className="welcome__icon">
        <MessageSquareText />
      </div>
      <h1 className="welcome__title">Ask your secure knowledge base</h1>
      <p className="welcome__subtitle">
        VaultRAG retrieves role-filtered document chunks from ChromaDB, then answers with the local
        Phi-3 model (Ollama). Employee sees Employee-tagged content only; Executive also sees
        Executive-tagged chunks and can upload PDF or CSV.
      </p>

      <div className="welcome__suggestions">
        {suggestions.map((s, i) => (
          <button
            key={i}
            className="welcome__suggestion"
            onClick={() => onSuggestionClick(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages,
  isTyping,
  onSuggestionClick,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSuggestionClick: (s: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  if (messages.length === 0 && !isTyping) {
    return (
      <WelcomeState onSuggestionClick={onSuggestionClick} />
    );
  }

  return (
    <div className="chat-window" ref={scrollRef}>
      {messages.map((msg, idx) => (
        <div key={idx} className={`chat-message chat-message--${msg.role}`}>
          {msg.role === 'user' ? (
            <div className="chat-bubble chat-bubble--user">
              <div className="chat-bubble__label">You</div>
              {msg.text}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="chat-bubble__attachments">
                  {msg.attachments.map((f: File, fidx: number) => (
                    <span key={fidx} className="chat-bubble__file-tag">📎 {f.name}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="chat-bubble chat-bubble--system">
                <div className="chat-bubble__label chat-bubble__label--oracle">VaultRAG</div>
                {msg.noRelevantInfo && (
                  <div className="chat-bubble__notice chat-bubble__notice--muted" role="status">
                    No matching chunks passed the RBAC and similarity filters for this question, or the
                    model returned no grounded answer.
                  </div>
                )}
                <div className="chat-bubble__content">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="chat-bubble__sources">
                    <div className="chat-bubble__sources-label">
                      Sources Used
                    </div>
                    {msg.sources.map((chunk: string, sidx: number) => (
                      <SourceSnippet key={sidx} text={chunk} index={sidx} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
