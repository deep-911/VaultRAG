import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, PanelLeft, Settings, User } from 'lucide-react';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';

interface HeaderProps {
  userRole: string;
  onUserRoleChange: (role: string) => void;
  onToggleSidebar?: () => void;
}

export default function Header({ userRole, onToggleSidebar }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isExec = userRole === 'Executive';

  return (
    <>
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <header className="header">
        {/* Logo */}
        <div className="header__logo">
          <button
            className="relative group w-8 h-8 rounded-md cursor-pointer flex-shrink-0"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 rounded-md shadow-[0_4px_12px_rgba(99,102,241,0.3)] transition-opacity duration-300 opacity-100 group-hover:opacity-0">
              <Sparkles className="w-[18px] h-[18px] text-white" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-transparent rounded-md border border-white/10 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
              <PanelLeft className="w-[18px] h-[18px] text-white/70" />
            </div>
          </button>
          <span className="header__logo-text">VaultRAG</span>
          <div className="header__logo-dot" aria-hidden />
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Role badge — static indicator only, switching is in bottom bar */}
        <div className={`header__role-badge ${isExec ? 'header__role-badge--exec' : 'header__role-badge--emp'}`}>
          {userRole.toUpperCase()}
        </div>

        {/* Right actions — icon-only */}
        <div className="header__actions">
          <button
            id="settings-btn"
            className="header__icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button
            id="profile-btn"
            className="header__icon-btn"
            onClick={() => setProfileOpen(true)}
            aria-label="Profile"
            title="Profile"
          >
            <User size={18} />
          </button>
        </div>
      </header>
    </>
  );
}
