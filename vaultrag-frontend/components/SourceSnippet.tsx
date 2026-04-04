import React from 'react';
import { FileSearch } from 'lucide-react';

function truncate(text, maxLen = 320) {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim() + '…';
}

export default function SourceSnippet({ text, index = 0 }) {
  return (
    <div className="source-snippet">
      <div className="source-snippet__header">
        <FileSearch className="source-snippet__icon" aria-hidden />
        <span className="source-snippet__label">Source {index + 1}</span>
      </div>
      <p className="source-snippet__text">{truncate(text)}</p>
    </div>
  );
}
