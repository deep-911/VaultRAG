import React, { useState } from 'react';
import { Sparkles, Sun, Moon, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ExecutiveUnlockModal from './ExecutiveUnlockModal';

interface HeaderProps {
  userRole: string;
  onUserRoleChange: (role: string) => void;
}

export default function Header({ userRole, onUserRoleChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <ExecutiveUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={() => {
          onUserRoleChange('Executive');
          setModalOpen(false);
        }}
      />

      <header className="header">
        <div className="header__logo">
          <div className="header__logo-icon" aria-hidden>
            <Sparkles />
          </div>
          <span className="header__logo-text">VaultRAG</span>
          <div className="header__logo-dot" aria-hidden />
        </div>

        <div className="header__rbac">
          <span
            className={`header__role-chip header__role-chip--${userRole === 'Executive' ? 'exec' : 'emp'}`}
            title="Retrieval uses this role for Chroma RBAC filters (demo only)."
          >
            {userRole}
          </span>
          {userRole === 'Employee' ? (
            <button
              type="button"
              className="header__unlock-btn"
              onClick={() => setModalOpen(true)}
              title="Enable PDF/CSV upload and Executive scope search"
            >
              <Shield className="header__unlock-icon" />
              Unlock Executive
            </button>
          ) : (
            <button
              type="button"
              className="header__unlock-btn header__unlock-btn--secondary"
              onClick={() => onUserRoleChange('Employee')}
              title="Use Employee-only document scope"
            >
              Use Employee role
            </button>
          )}
        </div>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
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
      </header>
    </>
  );
}
