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
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-black/20 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all duration-300 overflow-hidden">
      <FileSearch className="w-4 h-4 mt-0.5 text-indigo-400 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-xs font-semibold text-indigo-300/90 truncate">Source {index + 1}</span>
        <p className="text-[13px] text-white/60 leading-relaxed m-0 break-words">{truncate(text)}</p>
      </div>
    </div>
  );
}
