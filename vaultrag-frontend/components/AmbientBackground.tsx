import React from 'react';

export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-bg__blob ambient-bg__blob--primary" />
      <div className="ambient-bg__blob ambient-bg__blob--secondary" />
      <div className="ambient-bg__blob ambient-bg__blob--tertiary" />
    </div>
  );
}
