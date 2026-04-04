import React, { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import { Paperclip, ArrowUp, X, FileText, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

/** Minimal Web Speech API surface (Chromium `SpeechRecognition` / `webkitSpeechRecognition`). */
type SpeechRecognitionResultRow = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionResultsList = { length: number; [i: number]: SpeechRecognitionResultRow };

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { resultIndex: number; results: SpeechRecognitionResultsList }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface InputBarProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  attachedFiles?: File[];
  onAttachFiles?: (files: File[]) => void;
  onRemoveFile?: (idx: number) => void;
  ttsEnabled?: boolean;
  onToggleTts?: () => void;
  variant?: string;
  attachDisabled?: boolean;
  attachTitle?: string;
}

export default function InputBar({
  onSubmit,
  disabled,
  attachedFiles,
  onAttachFiles,
  onRemoveFile,
  ttsEnabled,
  onToggleTts,
  variant = 'default',
  attachDisabled = false,
  attachTitle = 'Attach PDF or CSV (Executive mode)',
}: InputBarProps) {
  const [value, setValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  /** Only true after mount so SSR + first client paint match (avoids mic button hydration mismatch). */
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;
    startTransition(() => setSpeechAvailable(true));

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: { resultIndex: number; results: SpeechRecognitionResultsList }) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      setValue(() => {
        const base = finalTranscript;
        return base + interimTranscript;
      });
    };

    recognition.onerror = (event: { error: string }) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      finalTranscript = '';
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          const rec = recognitionRef.current;
          if (!rec) return;
          rec.start();
          setIsListening(true);
        } catch (e) {
          console.error('Failed to start recognition:', e);
        }
      }, 100);
    }
  }, [isListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      onSubmit(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onAttachFiles) {
      onAttachFiles(files);
    }
    e.target.value = '';
  };

  return (
    <div className={`input-bar ${variant === 'welcome' ? 'input-bar--welcome' : ''}`}>
      <div className="input-bar__controls-row input-bar__controls-row--simple">
        <span className="input-bar__backend-hint" title="Answers use Ollama phi3 after RBAC retrieval">
          RAG · Phi-3 (Ollama)
        </span>
        <button
          type="button"
          className={`tts-toggle ${ttsEnabled ? 'tts-toggle--active' : ''}`}
          onClick={onToggleTts}
          title={ttsEnabled ? 'Turn off voice output' : 'Turn on voice output'}
          aria-label={ttsEnabled ? 'Turn off voice output' : 'Turn on voice output'}
        >
          {ttsEnabled ? <Volume2 className="tts-toggle__icon" /> : <VolumeX className="tts-toggle__icon" />}
          {ttsEnabled && <span className="tts-toggle__badge" />}
        </button>
      </div>

      <form className="input-bar__container" onSubmit={handleSubmit}>
        {attachedFiles && attachedFiles.length > 0 && (
          <div className="input-bar__attachments">
            {attachedFiles.map((file, idx) => (
              <div key={idx} className="input-bar__attachment-pill">
                <FileText className="input-bar__attachment-icon" />
                <span className="input-bar__attachment-name">{file.name}</span>
                <button
                  type="button"
                  className="input-bar__attachment-remove"
                  onClick={() => onRemoveFile?.(idx)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="input-bar__row">
          <button
            type="button"
            className="input-bar__action-btn"
            title={attachTitle}
            aria-label="Attach PDF or CSV"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || attachDisabled}
          >
            <Paperclip />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,application/pdf,text/csv"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {speechAvailable && (
            <button
              type="button"
              className={`input-bar__action-btn input-bar__mic-btn ${isListening ? 'input-bar__mic-btn--active' : ''}`}
              title={isListening ? 'Stop listening' : 'Voice input'}
              aria-label={isListening ? 'Stop listening' : 'Voice input'}
              onClick={toggleListening}
            >
              {isListening ? <MicOff /> : <Mic />}
              {isListening && <span className="input-bar__mic-pulse" />}
            </button>
          )}

          <input
            id="search-input"
            className="input-bar__input"
            type="text"
            placeholder={isListening ? 'Listening…' : 'Ask a question about your documents…'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoFocus
            disabled={disabled}
          />

          <button
            type="submit"
            className="input-bar__send-btn"
            disabled={!value.trim() || disabled}
            aria-label="Send message"
          >
            <ArrowUp />
          </button>
        </div>
      </form>
    </div>
  );
}
