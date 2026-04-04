"use client";
import React, { useEffect, useRef, useState } from 'react';
import { X, Monitor, Palette, Bell, ShieldCheck, Zap, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type SettingsTab = 'General' | 'Appearance' | 'Notifications' | 'Privacy' | 'Advanced';

const TABS: { label: SettingsTab; icon: React.ElementType }[] = [
  { label: 'General',       icon: Monitor    },
  { label: 'Appearance',   icon: Palette    },
  { label: 'Notifications',icon: Bell       },
  { label: 'Privacy',      icon: ShieldCheck },
  { label: 'Advanced',     icon: Zap        },
];

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('General');
  const [compactMode, setCompactMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState('English');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="modal-panel settings-modal relative w-full max-w-[650px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" ref={ref} role="dialog" aria-modal="true" aria-label="Settings">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__icon-wrap">
            <div className="modal-header__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
          </div>
          <div className="modal-header__text">
            <span className="modal-header__title">Settings</span>
            <span className="modal-header__sub">Manage your preferences</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-divider" />

        {/* Body: Sidebar + Content */}
        <div className="settings-body">
          <nav className="settings-tabs">
            {TABS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className={`settings-tab ${activeTab === label ? 'settings-tab--active' : ''}`}
                onClick={() => setActiveTab(label)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {activeTab === 'General' && (
              <>
                <p className="settings-section-label">INTERFACE</p>
                <ToggleRow
                  label="Compact Mode"
                  description="Reduce padding and spacing throughout the app"
                  checked={compactMode}
                  onChange={setCompactMode}
                />
                <ToggleRow
                  label="Auto-save Conversations"
                  description="Automatically save your search history"
                  checked={autoSave}
                  onChange={setAutoSave}
                />
                <p className="settings-section-label" style={{ marginTop: 24 }}>LANGUAGE & REGION</p>
                <div className="settings-row">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Language</span>
                    <span className="settings-row__desc">Choose your preferred language</span>
                  </div>
                  <select
                    className="settings-select"
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                  >
                    {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeTab === 'Appearance' && (
              <>
                <p className="settings-section-label">THEME</p>
                <div className="settings-row">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Dark Mode</span>
                    <span className="settings-row__desc">Switch between dark and light theme</span>
                  </div>
                  <button
                    className="theme-toggle"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    <div className="theme-toggle__track">
                      <div className={`theme-toggle__thumb ${theme === 'light' ? 'theme-toggle__thumb--light' : ''}`}>
                        {theme === 'dark' ? <Moon className="theme-toggle__icon" /> : <Sun className="theme-toggle__icon" />}
                      </div>
                      <div className="theme-toggle__stars">
                        <span className="theme-toggle__star" />
                        <span className="theme-toggle__star" />
                        <span className="theme-toggle__star" />
                      </div>
                    </div>
                  </button>
                </div>
                <p className="settings-section-label" style={{ marginTop: 24 }}>DENSITY</p>
                <ToggleRow
                  label="Compact Mode"
                  description="Use a denser layout to fit more content on screen"
                  checked={compactMode}
                  onChange={setCompactMode}
                />
              </>
            )}

            {activeTab === 'Notifications' && (
              <>
                <p className="settings-section-label">ALERTS</p>
                <ToggleRow
                  label="Email Notifications"
                  description="Receive updates and alerts via email"
                  checked={emailNotifs}
                  onChange={setEmailNotifs}
                />
                <ToggleRow
                  label="Push Notifications"
                  description="Get in-app push notifications"
                  checked={pushNotifs}
                  onChange={setPushNotifs}
                />
              </>
            )}

            {activeTab === 'Privacy' && (
              <>
                <p className="settings-section-label">DATA & PRIVACY</p>
                <div className="settings-row settings-row--info-only">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Search History</span>
                    <span className="settings-row__desc">Your conversations are stored locally in this browser only.</span>
                  </div>
                </div>
                <div className="settings-row settings-row--info-only">
                  <div className="settings-row__info">
                    <span className="settings-row__label">Data Retention</span>
                    <span className="settings-row__desc">No data is sent to external servers beyond the local API.</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'Advanced' && (
              <>
                <p className="settings-section-label">DEVELOPER</p>
                <div className="settings-row settings-row--info-only">
                  <div className="settings-row__info">
                    <span className="settings-row__label">API Endpoint</span>
                    <span className="settings-row__desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {process.env.NEXT_PUBLIC_VAULTRAG_API_URL || 'http://127.0.0.1:8000'}
                    </span>
                  </div>
                </div>
                <div className="settings-row settings-row--info-only">
                  <div className="settings-row__info">
                    <span className="settings-row__label">LLM Model</span>
                    <span className="settings-row__desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>phi3 (via Ollama)</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <span className="settings-row__label">{label}</span>
        <span className="settings-row__desc">{description}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        className={`settings-toggle ${checked ? 'settings-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="settings-toggle__thumb" />
      </button>
    </div>
  );
}
