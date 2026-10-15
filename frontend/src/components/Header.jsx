import React from 'react';
import { 
  Sparkles, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Plus, 
  ShieldCheck, 
  Cpu
} from 'lucide-react';

export default function Header({ 
  onOpenHistory, 
  historyCount = 0,
  systemStatus,
  onOpenSetup,
  onNewResearch,
  isRunning
}) {
  const isConfigured = systemStatus?.is_fully_configured;
  const activeModel = systemStatus?.mistral_model || 'mistral-small-latest';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#070a12]/85 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3.5">
          <div 
            onClick={onNewResearch}
            className="group flex items-center space-x-3 cursor-pointer select-none"
            title="Start new research"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-[#080c16] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-300 transition-transform duration-300 group-hover:rotate-12" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-tight text-white font-sans">
                  Antigravity
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                  v2.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal hidden sm:inline-block">
                Autonomous Multi-Agent Research System
              </span>
            </div>
          </div>

          {/* Model pill indicator */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/[0.06] text-[11px] text-slate-400">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span className="font-mono text-slate-300">{activeModel}</span>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* System Status Pill */}
          <button
            onClick={onOpenSetup}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              isConfigured 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-500/50' 
                : 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-500/50 animate-pulse'
            }`}
            title="View API configuration & keys status"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="hidden sm:inline">
              {isConfigured ? 'API Connected' : 'Setup Required'}
            </span>
            <Sliders className="w-3 h-3 opacity-60 ml-0.5" />
          </button>

          {/* New Query Button */}
          <button
            onClick={onNewResearch}
            disabled={isRunning}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200 shadow-sm shadow-indigo-600/30 active:scale-95"
            title="Start new research dossier"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Dossier</span>
          </button>

          {/* History Drawer Trigger */}
          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] hover:border-slate-700 transition-all duration-200 shadow-sm group"
            title="Open research session history"
          >
            <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="hidden sm:inline">Dossiers</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
              {historyCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
