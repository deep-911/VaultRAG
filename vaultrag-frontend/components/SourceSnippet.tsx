import React from 'react';
import { FileSearch } from 'lucide-react';

function truncate(text: string, maxLen = 320): string {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim() + '…';
}

type SourceSnippetProps = {
  text: string;
  index?: number;
};

export default function SourceSnippet({ text, index = 0 }: SourceSnippetProps) {
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
