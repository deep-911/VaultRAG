import React from 'react';
import { Shield, X } from 'lucide-react';

export default function ExecutiveUnlockModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="exec-modal" role="dialog" aria-modal="true" aria-labelledby="exec-modal-title">
      <div className="exec-modal__backdrop" onClick={onClose} />
      <div className="exec-modal__panel">
        <button type="button" className="exec-modal__close" onClick={onClose} aria-label="Close">
          <X />
        </button>
        <div className="exec-modal__icon">
          <Shield />
        </div>
        <h2 id="exec-modal-title" className="exec-modal__title">
          Unlock Executive mode
        </h2>
        <p className="exec-modal__body">
          This demo uses <strong>client-side role simulation only</strong> — there is no server
          authentication. Executive mode lets you ingest <strong>PDF or CSV</strong> files (stored
          as Executive-tagged chunks) and search both Employee and Executive content, matching the
          backend RBAC filter.
        </p>
        <div className="exec-modal__actions">
          <button type="button" className="exec-modal__btn exec-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="exec-modal__btn exec-modal__btn--primary" onClick={onConfirm}>
            Switch to Executive
          </button>
        </div>
      </div>
    </div>
  );
}
