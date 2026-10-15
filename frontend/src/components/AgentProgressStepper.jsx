import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  Scale, 
  ShieldCheck, 
  ClipboardList, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Terminal,
  Clock,
  Sparkles,
  Check,
  Activity
} from 'lucide-react';

const AGENTS = [
  {
    id: 'Browser Agent',
    name: 'Browser Agent',
    short: 'Search & Scrape',
    icon: Globe,
    desc: 'Tavily web discovery & page extraction',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'Research Agent',
    name: 'Research Agent',
    short: 'Fact Synthesis',
    icon: Search,
    desc: 'Fact extraction & source attribution',
    color: 'from-indigo-500 to-blue-500'
  },
  {
    id: 'Comparison Agent',
    name: 'Comparison Agent',
    short: 'Rankings & Matrix',
    icon: Scale,
    desc: 'Multi-criteria scoring & trade-offs',
    color: 'from-violet-500 to-indigo-500'
  },
  {
    id: 'Verification Agent',
    name: 'Verification Agent',
    short: 'Claim Corroboration',
    icon: ShieldCheck,
    desc: 'Source cross-check & confidence score',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'Action Planner Agent',
    name: 'Action Planner Agent',
    short: 'Action Planner',
    icon: ClipboardList,
    desc: 'Roadmap & human-governed draft actions',
    color: 'from-amber-500 to-orange-500'
  }
];

export default function AgentProgressStepper({ 
  logs = [], 
  isRunning, 
  overallStatus, 
  errorMsg 
}) {
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Helper to extract an agent's latest status and dedicated logs
  const getAgentInfo = (agentName) => {
    const agentLogs = logs.filter(l => l.agent === agentName);
    if (!agentLogs.length) {
      return { 
        state: 'Pending', 
        message: 'Awaiting prior stage completion...', 
        progress: 0,
        logs: [] 
      };
    }
    const lastLog = agentLogs[agentLogs.length - 1];
    return {
      state: lastLog.status || 'Active',
      message: lastLog.message || 'Processing...',
      progress: lastLog.progress !== undefined ? lastLog.progress : 50,
      logs: agentLogs
    };
  };

  const completedCount = AGENTS.filter(a => getAgentInfo(a.name).state === 'Completed').length;
  const overallProgress = Math.round((completedCount / AGENTS.length) * 100);

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        
        {/* Animated laser line at top when running */}
        {isRunning && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser"></div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/[0.08] gap-2">
          <div className="flex items-center space-x-2.5">
            <div className={`p-1.5 rounded-lg border ${
              isRunning 
                ? 'bg-indigo-950/60 border-indigo-500/40 text-cyan-300' 
                : 'bg-slate-900 border-white/[0.08] text-slate-400'
            }`}>
              <Activity className={`w-4 h-4 ${isRunning ? 'animate-pulse text-indigo-400' : ''}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>Multi-Agent Orchestration Pipeline</span>
                {isRunning && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse">
                    LIVE STREAMING
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Autonomous 5-stage pipeline executing structured web intelligence
              </p>
            </div>
          </div>

          {/* Progress Bar & Log Toggle */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400">
                {completedCount}/5 Complete
              </span>
              <div className="w-20 sm:w-28 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/[0.05]">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => setShowAllLogs(!showAllLogs)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Event Log</span>
              <span className="text-[11px] font-mono text-indigo-400">({logs.length})</span>
              {showAllLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Stepper Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {AGENTS.map((agent, idx) => {
            const info = getAgentInfo(agent.name);
            const isCurrent = isRunning && info.state === 'Active';
            const isDone = info.state === 'Completed';
            const isError = info.state === 'Error';
            const isPending = info.state === 'Pending';
            const Icon = agent.icon;

            return (
              <div
                key={agent.name}
                onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
                className={`relative rounded-xl p-3.5 border transition-all duration-300 cursor-pointer select-none text-left flex flex-col justify-between ${
                  isCurrent 
                    ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/40' 
                    : isDone
                    ? 'bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/50'
                    : isError
                    ? 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-slate-950/40 border-white/[0.05] opacity-60 hover:opacity-80'
                }`}
              >
                {/* Agent Number & Icon */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      0{idx + 1}
                    </span>
                    <div className={`p-1.5 rounded-lg ${
                      isCurrent 
                        ? 'bg-indigo-500/20 text-cyan-300' 
                        : isDone
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-900 text-slate-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Status Indicator Icon */}
                  <div>
                    {isCurrent && (
                      <Loader2 className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                    )}
                    {isDone && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {isError && (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {isPending && (
                      <Clock className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                </div>

                {/* Agent Title & Short Desc */}
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-white truncate">
                    {agent.name.replace(' Agent', '')}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-tight line-clamp-1 mt-0.5">
                    {agent.short}
                  </p>
                </div>

                {/* Latest Status Message */}
                <div className="pt-2 border-t border-white/[0.04]">
                  <p className={`text-[10px] font-mono truncate ${
                    isCurrent 
                      ? 'text-cyan-300 font-semibold' 
                      : isDone 
                      ? 'text-emerald-300/80' 
                      : 'text-slate-500'
                  }`}>
                    {isPending ? 'Queued' : info.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dedicated Expanded Agent Logs */}
        {expandedAgent && (
          <div className="mt-4 p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.08] animate-fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.05]">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-indigo-300">
                  {expandedAgent} Stream
                </span>
                <span className="text-[11px] text-slate-400">
                  ({getAgentInfo(expandedAgent).logs.length} events logged)
                </span>
              </div>
              <button
                onClick={() => setExpandedAgent(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
              {getAgentInfo(expandedAgent).logs.map((log, i) => (
                <div key={i} className="flex items-start space-x-2 text-slate-300">
                  <span className="text-slate-500 shrink-0">[{log.timestamp || '00:00'}]</span>
                  <span className="text-indigo-400 shrink-0">[{log.status}]</span>
                  <span className="text-slate-300 break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Event Stream Terminal Drawer */}
        {showAllLogs && (
          <div className="mt-4 rounded-xl bg-[#050810] border border-white/[0.08] p-3.5 animate-fade-in">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block"></span>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-300">
                  Live Orchestration Event Console
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Server-Sent Events (SSE) Stream
              </span>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300 scroll-smooth">
              {logs.length === 0 ? (
                <p className="text-slate-500 italic py-2">No events dispatched yet.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-slate-600 shrink-0 select-none">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-cyan-400 font-semibold shrink-0">
                      [{log.agent || 'SYSTEM'}]
                    </span>
                    <span className="text-slate-400 shrink-0">
                      [{log.status || 'INFO'}]
                    </span>
                    <span className="text-slate-200">
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Execution Alert: </span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
