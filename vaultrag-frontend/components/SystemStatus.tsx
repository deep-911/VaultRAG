import React, { useState, useEffect } from 'react';
import { Cpu, Database, Shield, ChevronUp, Loader2 } from 'lucide-react';

export default function SystemStatus() {
  const [statusState, setStatusState] = useState([
    { id: 'llm', label: 'LLM', state: 'loading', text: 'Initializing...', icon: Cpu },
    { id: 'db', label: 'Database', state: 'pending', text: 'Waiting...', icon: Database },
    { id: 'rbac', label: 'RBAC Filter', state: 'pending', text: 'Waiting...', icon: Shield },
  ]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Step 1: LLM loading to done (1.5s)
    const t1 = setTimeout(() => {
      setStatusState(prev => prev.map(item =>
        item.id === 'llm'
          ? { ...item, state: 'ready', text: 'Running (Phi-3)' }
          : item.id === 'db'
            ? { ...item, state: 'loading', text: 'Connecting...' }
            : item
      ));
    }, 1500);

    // Step 2: Database loading to done (3.0s)
    const t2 = setTimeout(() => {
      setStatusState(prev => prev.map(item =>
        item.id === 'db'
          ? { ...item, state: 'ready', text: 'Connected' }
          : item.id === 'rbac'
            ? { ...item, state: 'loading', text: 'Verifying...' }
            : item
      ));
    }, 3000);

    // Step 3: RBAC loading to done (4.5s)
    const t3 = setTimeout(() => {
      setStatusState(prev => prev.map(item =>
        item.id === 'rbac'
          ? { ...item, state: 'ready', text: 'Active' }
          : item
      ));
    }, 4500);

    // Step 4: Collapse panel 5 seconds after completing all tasks (4.5s + 5.0s = 9.5s)
    const t4 = setTimeout(() => {
      setIsCollapsed(true);
    }, 9500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const showExpanded = !isCollapsed || isHovered;

  return (
    <div 
      className="fixed bottom-6 right-6 z-[100]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${
          showExpanded 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-12 scale-95 pointer-events-none absolute bottom-0 right-0'
        }`}
      >
        <div className="bg-[#0f0f14]/90 backdrop-blur-2xl border border-gray-800 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-[320px] flex flex-col p-5">
          <div className="flex items-center justify-between pb-4 border-b border-gray-800/50 mb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500">SYSTEM STATUS</span>
            <button 
              className="text-gray-500 hover:text-white hover:bg-gray-800 p-1.5 rounded-lg transition-colors cursor-pointer" 
              onClick={() => { setIsCollapsed(true); setIsHovered(false); }} 
              aria-label="Collapse panel"
            >
              <ChevronUp size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-5">
            {statusState.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl flex items-center justify-center transition-colors duration-500 ${
                      item.state === 'ready' ? 'bg-emerald-500/10 text-emerald-400' :
                      item.state === 'loading' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-gray-800/30 text-gray-600'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <span className={`font-medium text-sm transition-colors duration-500 ${
                      item.state === 'ready' ? 'text-gray-200' :
                      item.state === 'loading' ? 'text-gray-300' :
                      'text-gray-500'
                    }`}>
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-4 h-4">
                      {item.state === 'loading' ? (
                        <Loader2 size={14} className="text-indigo-400 animate-spin" />
                      ) : item.state === 'ready' ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700"></div>
                      )}
                    </div>
                    <span className={`text-xs font-mono min-w-[90px] text-right transition-colors duration-500 ${
                      item.state === 'ready' ? 'text-emerald-400' :
                      item.state === 'loading' ? 'text-indigo-400' :
                      'text-gray-600'
                    }`}>
                      {item.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div 
        className={`transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] transform absolute bottom-0 right-0 ${
          showExpanded 
            ? 'opacity-0 translate-y-12 scale-95 pointer-events-none' 
            : 'opacity-100 translate-y-0 scale-100 cursor-pointer'
        }`}
      >
        <button 
          className="flex items-center gap-3 bg-[#0f0f14]/90 backdrop-blur-2xl border border-gray-800 px-4 py-2.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:bg-gray-800 transition-all hover:scale-[1.02] active:scale-[0.98] group" 
          onClick={() => setIsCollapsed(false)}
        >
          <span className="text-[11px] font-bold tracking-wider text-gray-400 group-hover:text-gray-200 transition-colors uppercase">
            System 
          </span>
          <div className="flex items-center gap-1.5 border-l border-gray-800 pl-3">
            {statusState.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="relative">
                  <Icon size={14} className={`transition-colors duration-500 ${
                    item.state === 'ready' ? 'text-emerald-400' :
                    item.state === 'loading' ? 'text-indigo-400 animate-pulse' :
                    'text-gray-600'
                  }`} />
                  {item.state === 'ready' && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"></div>
                  )}
                </div>
              );
            })}
          </div>
        </button>
      </div>
    </div>
  );
}
