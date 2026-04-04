import React from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: { id: number; title: string }[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onDelete: (id: number) => void;
}

export default function HistoryPanel({ isOpen, onToggle, conversations, activeId, onSelect, onNewChat, onDelete }: HistoryPanelProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="history-overlay" onClick={onToggle} />}

      <aside className={`history-panel ${isOpen ? 'history-panel--open' : ''}`}>
        {/* Panel Header */}
        <div className="history-panel__header">
          <button
            className="history-panel__toggle"
            onClick={onToggle}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <PanelLeftClose />
          </button>
          <button className="history-panel__new-chat" onClick={onNewChat}>
            <Plus />
            <span>New chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="history-panel__list">
          {conversations.length === 0 ? (
            <div className="history-panel__empty">
              <MessageSquare className="history-panel__empty-icon" />
              <p>No chats yet</p>
              <span>Your VaultRAG sessions will appear here</span>
            </div>
          ) : (
            <>
              <div className="history-panel__section-label">Recent</div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`history-panel__item ${conv.id === activeId ? 'history-panel__item--active' : ''}`}
                  onClick={() => onSelect(conv.id)}
                >
                  <MessageSquare className="history-panel__item-icon" />
                  <span className="history-panel__item-title">{conv.title}</span>
                  <button
                    className="history-panel__item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    aria-label={`Delete ${conv.title}`}
                    title="Delete"
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="history-panel__footer">
          <div className="history-panel__footer-text">
            VaultRAG
          </div>
        </div>
      </aside>

      {/* Floating toggle button when panel is closed */}
      {!isOpen && (
        <button
          className="history-panel__float-toggle"
          onClick={onToggle}
          aria-label="Open sidebar"
          title="Open sidebar"
        >
          <PanelLeft />
        </button>
      )}
    </>
  );
}
