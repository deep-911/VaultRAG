import React, { useRef, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';
import SourceSnippet from './SourceSnippet';

function TypingIndicator() {
  return (
    <div className="chat-message chat-message--system">
      <div className="chat-bubble chat-bubble--system">
        <div className="typing-indicator">
          <div className="typing-indicator__dot" />
          <div className="typing-indicator__dot" />
          <div className="typing-indicator__dot" />
        </div>
      </div>
    </div>
  );
}

export function WelcomeState({ onSuggestionClick }: { onSuggestionClick: (s: string) => void }) {
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

export default function ChatWindow({ messages, isTyping, onSuggestionClick }: { messages: any[], isTyping: boolean, onSuggestionClick: (s: string) => void }) {
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
                  {msg.attachments.map((f: any, fidx: number) => (
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
                {msg.text}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="source-snippet-list">
                    <div className="source-snippet-list__title">Context used (retrieved chunks)</div>
                    {msg.sources.map((chunk: any, sidx: number) => (
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
