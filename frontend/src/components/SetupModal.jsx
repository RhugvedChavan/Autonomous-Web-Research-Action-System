import React, { useState } from 'react';
import { 
  X, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check,
  ShieldCheck,
  Sparkles,
  Search,
  Cpu
} from 'lucide-react';

export default function SetupModal({ isOpen, onClose, systemStatus, onRefresh }) {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleCopyEnv = () => {
    const text = `MISTRAL_API_KEY=your_key_here\nTAVILY_API_KEY=your_key_here\nMISTRAL_MODEL=mistral-small-latest\nPLAYWRIGHT_HEADLESS=true\nPORT=8000`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const isMistralOk = systemStatus?.mistral_configured;
  const isTavilyOk = systemStatus?.tavily_configured;
  const isFullyReady = systemStatus?.is_fully_configured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg glass-panel rounded-2xl shadow-2xl p-6 sm:p-7 border border-white/[0.1] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Decorative ambient background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans">
                System Credentials & API Status
              </h3>
              <p className="text-xs text-slate-400">
                Multi-agent engine connectivity settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Checklist Cards */}
        <div className="my-5 space-y-3">
          
          {/* Mistral AI Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            isMistralOk 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-white font-sans">Mistral AI API</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {isMistralOk ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Missing Key</span>
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
              Powers reasoning, factual synthesis, comparative matrix scoring, and action planning.
            </p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-400">
                Model: <span className="text-slate-200">{systemStatus?.mistral_model || 'mistral-small-latest'}</span>
              </span>
              <a
                href="https://console.mistral.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1"
              >
                <span>Get Mistral Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Tavily Web Search Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            isTavilyOk 
              ? 'bg-emerald-950/20 border-emerald-500/30' 
              : 'bg-rose-950/20 border-rose-500/30'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white font-sans">Tavily Web Search API</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {isTavilyOk ? (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-xs font-semibold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Missing Key</span>
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
              Used by the Browser Agent for search discovery, real-time web retrieval, and Playwright scraping.
            </p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-400">
                Playwright: <span className="text-slate-200">{systemStatus?.playwright_enabled ? 'Enabled' : 'Disabled'}</span>
              </span>
              <a
                href="https://app.tavily.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center space-x-1"
              >
                <span>Get Tavily Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Environment File Instruction */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.06] mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-300">
              Local Credentials Configuration
            </span>
            <button
              onClick={handleCopyEnv}
              className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Sample'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
            Store your keys in <code className="text-indigo-300 font-mono">backend/.env</code>. The backend reloads automatically without needing a server restart.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-white/[0.08] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Verifying...' : 'Re-check Credentials'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
