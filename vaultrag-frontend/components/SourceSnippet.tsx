import React, { useState } from 'react';
import { FileSearch, ChevronDown, ChevronUp } from 'lucide-react';

function truncate(text: string, maxLen = 320): string {
  const s = (text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trim() + '…';
}

type SourceSnippetProps = {
  text: string;
  sourceDoc?: string;
  index?: number;
};

export default function SourceSnippet({ text, sourceDoc, index = 0 }: SourceSnippetProps) {
  const [expanded, setExpanded] = useState(false);
  const title = sourceDoc || `Source ${index + 1}`;

  return (
    <div 
      className="source-snippet group cursor-pointer transition-colors duration-200 hover:bg-slate-800/80 rounded-md p-2 -mx-2"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex gap-2">
        <FileSearch className="source-snippet__icon shrink-0 mt-0.5 text-indigo-400 group-hover:text-indigo-300 transition-colors" aria-hidden />
        <div className="source-snippet__content flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <span className="source-snippet__title inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30 break-all line-clamp-1 max-w-[85%]">
              {title}
            </span>
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors shrink-0 mt-0.5">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
          <p className="source-snippet__text text-sm text-slate-300 leading-relaxed transition-all duration-300 ease-in-out">
            {expanded ? text : truncate(text)}
          </p>
        </div>
      </div>
    </div>
  );
}
