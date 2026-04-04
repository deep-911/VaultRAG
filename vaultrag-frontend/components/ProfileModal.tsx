"use client";
import React, { useEffect, useRef } from 'react';
import { X, Pencil, KeyRound, Bell, Mail, HelpCircle, LogOut, Camera } from 'lucide-react';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { icon: Pencil,     label: 'Edit Profile' },
  { icon: KeyRound,   label: 'Security' },
  { icon: Bell,       label: 'Notifications' },
  { icon: Mail,       label: 'Email Preferences' },
  { icon: HelpCircle, label: 'Help & Support' },
];

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const ref = useRef<HTMLDivElement>(null);

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
    <div className="modal-overlay">
      <div className="modal-panel profile-modal" ref={ref} role="dialog" aria-modal="true" aria-label="Profile">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header__icon-wrap">
            <div className="modal-header__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          </div>
          <div className="modal-header__text">
            <span className="modal-header__title">Profile</span>
            <span className="modal-header__sub">Manage your account</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-divider" />

        {/* Avatar + Info */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent)' }}>
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <button className="profile-avatar-cam" aria-label="Change avatar">
              <Camera size={12} />
            </button>
          </div>
          <h2 className="profile-name">Alex Johnson</h2>
          <p className="profile-email">alex.johnson@vaultrag.ai</p>
          <span className="profile-plan-badge">Pro Plan</span>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat__val">1,284</span>
            <span className="profile-stat__label">SEARCHES</span>
          </div>
          <div className="profile-stat__divider" />
          <div className="profile-stat">
            <span className="profile-stat__val">392</span>
            <span className="profile-stat__label">FILES FOUND</span>
          </div>
          <div className="profile-stat__divider" />
          <div className="profile-stat">
            <span className="profile-stat__val">47</span>
            <span className="profile-stat__label">SAVED</span>
          </div>
        </div>

        {/* Menu */}
        <div className="profile-menu">
          {MENU_ITEMS.map(({ icon: Icon, label }) => (
            <button key={label} className="profile-menu-item">
              <span className="profile-menu-item__icon"><Icon size={16} /></span>
              <span className="profile-menu-item__label">{label}</span>
              <svg className="profile-menu-item__chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>

        <div className="modal-divider" />

        {/* Sign Out */}
        <div className="profile-footer">
          <button className="profile-signout">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
