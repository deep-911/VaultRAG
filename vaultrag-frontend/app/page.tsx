"use client";
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import AmbientBackground from '../components/AmbientBackground';
import CursorOrbs from '../components/CursorOrbs';
import Header from '../components/Header';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';
import SearchingAnimation from '../components/SearchingAnimation';
import HistoryPanel from '../components/HistoryPanel';
import type { UserRole } from '../lib/vaultragApi';
import {
  askVaultRag,
  uploadExecutiveFile,
  isNoRelevantAnswer,
} from '../lib/vaultragApi';
import type { ChatMessage } from '../lib/chatTypes';

function generateTitle(text: string) {
  const clean = text.trim();
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean;
}

export default function App() {
  const [conversations, setConversations] = useState<
    { id: number; title: string; messages: ChatMessage[]; createdAt: string }[]
  >([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('Employee');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vaultrag_conversations');
      if (saved) {
        setConversations(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load conversations", e);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      try {
        localStorage.setItem('vaultrag_conversations', JSON.stringify(conversations));
      } catch (e) {
        console.error("Failed to save conversations", e);
      }
    }
  }, [conversations]);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const messages = useMemo(
    () => (activeConv ? activeConv.messages : []),
    [activeConv]
  );

  useEffect(() => {
    if (!ttsEnabled) {
      lastMessageCountRef.current = messages.length;
      return;
    }
    if (messages.length > lastMessageCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'system' && lastMsg.text) {
        const cleanText = lastMsg.text
          .replace(/\*\*/g, '')
          .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
          .replace(/[•●▪]/g, '')
          .trim();
        if (cleanText && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText);

          const voices = window.speechSynthesis.getVoices();
          const femaleVoice =
            voices.find(
              (v) =>
                v.name.includes('Zira') ||
                v.name.includes('Samantha') ||
                v.name.includes('Google US English') ||
                v.name.includes('Female')
            ) || voices.find((v) => v.lang.startsWith('en'));

          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }

          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      }
    }
    lastMessageCountRef.current = messages.length;
  }, [messages, ttsEnabled]);

  const handleSend = useCallback(
    async (text: string) => {
      const currentAttachments = [...attachedFiles];
      const hasFiles = currentAttachments.length > 0;

      const userMessage: ChatMessage = {
        role: 'user',
        text,
        attachments: hasFiles ? currentAttachments : undefined,
      };

      let convId = activeConvId;

      if (!convId) {
        convId = Date.now();
        const newConv = {
          id: convId,
          title: generateTitle(text),
          messages: [userMessage],
          createdAt: new Date().toISOString(),
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(convId);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
          )
        );
      }

      setAttachedFiles([]);
      setIsTyping(true);

      const capturedConvId = convId;
      const appendSystem = (msg: ChatMessage) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === capturedConvId
              ? { ...c, messages: [...c.messages, msg] }
              : c
          )
        );
      };

      try {
        if (hasFiles && userRole !== 'Executive') {
          appendSystem({
            role: 'system',
            text:
              '**Upload skipped:** PDF and CSV go to the API only in **Executive** mode (unlock in the header). Your question below is still sent to `/ask` without ingesting these files.',
            noRelevantInfo: false,
          });
        }

        let queryText = text.trim();
        if (!queryText && hasFiles && userRole === 'Executive') {
          queryText =
            'What are the main points in the document I just uploaded?';
        }

        if (!queryText) {
          appendSystem({
            role: 'system',
            text: 'Add a question, or attach a PDF/CSV in Executive mode so we can ingest and then ask about it.',
            noRelevantInfo: false,
          });
          setIsTyping(false);
          return;
        }

        if (hasFiles && userRole === 'Executive') {
          const errors: string[] = [];
          for (const f of currentAttachments) {
            try {
              await uploadExecutiveFile(f);
            } catch (e) {
              errors.push(
                `${f.name}: ${e instanceof Error ? e.message : String(e)}`
              );
            }
          }
          if (errors.length > 0) {
            appendSystem({
              role: 'system',
              text: `**Upload issue(s):**\n${errors.join('\n')}`,
              noRelevantInfo: false,
            });
          }
        }

        const { answer, context_used } = await askVaultRag(queryText, userRole);
        const noRelevantInfo = isNoRelevantAnswer(answer);

        appendSystem({
          role: 'system',
          text: answer,
          sources:
            context_used && context_used.length > 0 ? context_used : undefined,
          noRelevantInfo,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        appendSystem({
          role: 'system',
          text: `**Could not reach the VaultRAG API.**\n\n${msg}\n\nStart the backend: \`uvicorn main:app --reload --port 8000\`. For answers, run Ollama with the **phi3** model.`,
          noRelevantInfo: false,
        });
      } finally {
        setIsTyping(false);
      }
    },
    [activeConvId, attachedFiles, userRole]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend]
  );

  const handleAttachFiles = useCallback((newFiles: File[]) => {
    setAttachedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setAttachedFiles([]);
    setIsTyping(false);
  }, []);

  const handleSelectConversation = useCallback((id: number) => {
    setActiveConvId(id);
    setAttachedFiles([]);
    setIsTyping(false);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleDeleteConversation = useCallback(
    (id: number) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId(null);
      }
    },
    [activeConvId]
  );

  return (
    <>
      <AmbientBackground />
      <CursorOrbs />

      <HistoryPanel
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
      />

      <div className={`app-shell ${sidebarOpen ? 'app-shell--sidebar-open' : ''}`}>
        {isTyping && <SearchingAnimation />}
        <Header userRole={userRole} onUserRoleChange={setUserRole} />
        <main className="app-layout">
          <ChatWindow
            messages={messages}
            isTyping={isTyping}
            onSuggestionClick={handleSuggestionClick}
          />
          <div className="input-bar-wrapper">
            <InputBar
              onSubmit={handleSend}
              disabled={isTyping}
              attachedFiles={attachedFiles}
              onAttachFiles={handleAttachFiles}
              onRemoveFile={handleRemoveFile}
              ttsEnabled={ttsEnabled}
              onToggleTts={() => setTtsEnabled((v) => !v)}
              attachDisabled={userRole !== 'Executive'}
              attachTitle={
                userRole === 'Executive'
                  ? 'Attach PDF or CSV (ingested as Executive-tagged chunks)'
                  : 'Unlock Executive mode to attach PDF or CSV'
              }
            />
          </div>
        </main>
      </div>
    </>
  );
}
