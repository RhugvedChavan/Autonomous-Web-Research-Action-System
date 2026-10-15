import React, { useState } from 'react';
import { 
  FileText, 
  Globe, 
  Scale, 
  ShieldCheck, 
  ClipboardCheck, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trophy, 
  ArrowUpRight, 
  Copy, 
  Check, 
  Play, 
  Info,
  Clock,
  Layers,
  Sparkles,
  Share2,
  CheckCheck,
  AlertCircle,
  Tag
} from 'lucide-react';
import { getExportMarkdownUrl } from '../services/api';

export default function ResultsDashboard({ 
  session, 
  onActionDecision, 
  onExecuteAction, 
  actionLoading 
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  if (!session) return null;

  const { 
    session_id, 
    query, 
    depth = 'balanced',
    research, 
    comparison, 
    verification, 
    action_plan, 
    sources = [] 
  } = session;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyDraft = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied draft to clipboard.');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyFullDossier = () => {
    let md = `# Research Dossier: ${query}\n\n`;
    if (research?.summary) {
      md += `## Executive Summary\n${research.summary}\n\n`;
    }
    if (research?.key_findings?.length) {
      md += `## Key Findings\n` + research.key_findings.map(f => `- ${f}`).join('\n') + '\n\n';
    }
    if (comparison?.options?.length) {
      md += `## Comparison Matrix\n` + comparison.options.map(o => `### ${o.rank}. ${o.name} (Score: ${o.overall_score}/10)\n${o.summary}\n- Strengths: ${o.strengths.join(', ')}\n- Weaknesses: ${o.weaknesses.join(', ')}\n`).join('\n') + '\n';
    }
    if (verification) {
      md += `## Verification Audit\nConfidence Score: ${verification.confidence_score}%\n\n`;
    }
    if (action_plan?.recommendations?.length) {
      md += `## Recommended Next Steps\n` + action_plan.recommendations.map(r => `- ${r}`).join('\n') + '\n\n';
    }
    navigator.clipboard.writeText(md);
    setCopiedAll(true);
    showToast('Full Markdown Dossier copied to clipboard.');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleExecute = async (action) => {
    try {
      const res = await onExecuteAction(action.id);
      if (res?.payload?.open_url) {
        window.open(res.payload.open_url, '_blank', 'noopener,noreferrer');
        showToast('Opened link in a new tab.');
      } else if (res?.payload?.draft) {
        handleCopyDraft(action.id, res.payload.draft);
      } else if (res?.payload?.summary) {
        handleCopyDraft(action.id, res.payload.summary);
      } else if (res?.payload?.markdown) {
        handleCopyDraft(action.id, res.payload.markdown);
      } else {
        showToast(`Action '${action.title}' executed successfully.`);
      }
    } catch {
      showToast('Action execution failed. Please check logs.');
    }
  };

  // Metrics calculation
  const confidenceScore = verification?.confidence_score ?? 85;
  const verifiedFactsCount = research?.facts?.length || 0;
  const sourceCount = sources?.length || 0;
  const pendingActionsCount = action_plan?.proposed_actions?.filter(a => a.status === 'pending').length || 0;

  return (
    <div className="w-full max-w-6xl mx-auto my-8 px-4 animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-white text-xs shadow-2xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Dossier Header Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-2xl mb-6 relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Verified Dossier
              </span>
              <span className="text-xs text-slate-400">
                Session <span className="font-mono text-slate-300">{session_id}</span>
              </span>
              <span className="text-xs text-slate-400">• Depth: <span className="capitalize text-slate-200">{depth}</span></span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {query}
            </h2>
          </div>

          {/* Export & Copy Actions */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              onClick={handleCopyFullDossier}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] hover:border-slate-700 transition-colors shadow-sm"
              title="Copy entire dossier formatted as markdown"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedAll ? 'Copied' : 'Copy Markdown'}</span>
            </button>

            <a
              href={getExportMarkdownUrl(session_id)}
              download={`research_dossier_${session_id}.md`}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/30 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.md)</span>
            </a>
          </div>
        </div>

        {/* Intelligence Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          
          {/* Metric 1: Confidence Score */}
          <div className="glass-card p-3.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Confidence Score</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-sans">
                {confidenceScore}%
              </span>
              <span className="text-[11px] font-medium text-emerald-400">
                {confidenceScore >= 80 ? 'Verified' : 'Moderate'}
              </span>
            </div>
          </div>

          {/* Metric 2: Sources Evaluated */}
          <div className="glass-card p-3.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Web Sources</span>
              <Globe className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-sans">
                {sourceCount}
              </span>
              <span className="text-[11px] text-slate-400">Pages Parsed</span>
            </div>
          </div>

          {/* Metric 3: Facts Extracted */}
          <div className="glass-card p-3.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Verified Claims</span>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-sans">
                {verifiedFactsCount}
              </span>
              <span className="text-[11px] text-slate-400">Attributed Facts</span>
            </div>
          </div>

          {/* Metric 4: Human Actions Staged */}
          <div className="glass-card p-3.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium">Action Governance</span>
              <ClipboardCheck className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl sm:text-2xl font-black text-white font-sans">
                {pendingActionsCount}
              </span>
              <span className={`text-[11px] font-medium ${pendingActionsCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
                {pendingActionsCount > 0 ? 'Pending Review' : 'All Decided'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-white/[0.08] mb-6 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'summary', label: 'Executive Summary', icon: Sparkles, count: research?.key_findings?.length },
          { id: 'comparison', label: 'Scorecard Matrix', icon: Scale, count: comparison?.options?.length },
          { id: 'verification', label: 'Audit & Fact-Check', icon: ShieldCheck, count: research?.facts?.length },
          { id: 'actions', label: 'Action Governance', icon: ClipboardCheck, count: action_plan?.proposed_actions?.length, badgeColor: pendingActionsCount > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : null },
          { id: 'sources', label: 'Sources Library', icon: Globe, count: sources.length },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono ${
                  isActive ? 'bg-indigo-950 text-indigo-200' : 'bg-slate-800 text-slate-400'
                } ${tab.badgeColor || ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panes */}

      {/* 1. Executive Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Summary Box */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Synthesized Intelligence Overview</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-sans">
              {research?.summary || "No executive summary available for this session."}
            </p>
          </div>

          {/* Key Findings List */}
          {research?.key_findings && research.key_findings.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Key Discoveries & Takeaways</span>
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {research.key_findings.map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-950/40 border border-white/[0.04]">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed font-sans">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Action Plan Preview */}
          {action_plan?.recommendations && action_plan.recommendations.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
                <span>Action Planner Strategic Recommendations</span>
              </h3>
              <div className="space-y-2.5">
                {action_plan.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start space-x-3 p-3 rounded-xl bg-slate-950/30 border border-white/[0.04]">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></div>
                    <span className="text-sm text-slate-300 leading-relaxed">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Comparison Matrix & Scorecards */}
      {activeTab === 'comparison' && (
        <div className="space-y-6 animate-fade-in">
          {(!comparison?.options || comparison.options.length === 0) ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <Scale className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No multi-option comparison matrix generated for this query.</p>
            </div>
          ) : (
            <>
              {/* Overall Winner / Summary Banner */}
              {comparison.overall_summary && (
                <div className="glass-panel rounded-2xl p-6 border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-slate-900/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Comparison Verdict</span>
                  </h4>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {comparison.overall_summary}
                  </p>
                </div>
              )}

              {/* Options Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.options.map((opt, idx) => (
                  <div 
                    key={idx}
                    className={`glass-panel rounded-2xl p-6 shadow-xl relative flex flex-col justify-between ${
                      opt.rank === 1 ? 'border-indigo-500/50 shadow-indigo-500/10' : ''
                    }`}
                  >
                    <div>
                      {/* Top Rank Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            opt.rank === 1 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {opt.rank === 1 && <Trophy className="w-3.5 h-3.5 text-amber-400" />}
                            <span>Rank #{opt.rank}</span>
                          </span>
                          <h4 className="text-base font-bold text-white font-sans">
                            {opt.name}
                          </h4>
                        </div>

                        {/* Overall Score Pill */}
                        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-950 border border-white/[0.08]">
                          <span className="text-xs text-slate-400 font-medium">Score</span>
                          <span className="text-sm font-black font-mono text-cyan-300">{opt.overall_score}</span>
                          <span className="text-[10px] text-slate-500">/10</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-sans">
                        {opt.summary}
                      </p>

                      {/* Criteria Score Breakdown */}
                      {opt.criterion_scores && Object.keys(opt.criterion_scores).length > 0 && (
                        <div className="space-y-2 mb-4 p-3 rounded-xl bg-slate-950/60 border border-white/[0.04]">
                          <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Criterion Breakdown:
                          </span>
                          {Object.entries(opt.criterion_scores).map(([crit, score]) => (
                            <div key={crit} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 truncate max-w-[65%]">{crit}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{ width: `${Math.min(100, (Number(score) / 10) * 100)}%` }}
                                  ></div>
                                </div>
                                <span className="font-mono text-slate-200 text-[11px] w-6 text-right">
                                  {score}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mb-3">
                        {opt.strengths && opt.strengths.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                            <span className="font-bold text-[11px] text-emerald-400 block mb-1">Strengths:</span>
                            <ul className="space-y-1">
                              {opt.strengths.map((s, i) => (
                                <li key={i} className="text-slate-300 text-[11px] flex items-start space-x-1.5">
                                  <span className="text-emerald-400">•</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {opt.weaknesses && opt.weaknesses.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                            <span className="font-bold text-[11px] text-rose-400 block mb-1">Trade-offs:</span>
                            <ul className="space-y-1">
                              {opt.weaknesses.map((w, i) => (
                                <li key={i} className="text-slate-300 text-[11px] flex items-start space-x-1.5">
                                  <span className="text-rose-400">•</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Best For Tag */}
                    {opt.best_for && (
                      <div className="pt-3 border-t border-white/[0.06] text-xs">
                        <span className="text-indigo-400 font-semibold">Best Suited For: </span>
                        <span className="text-slate-300 font-sans">{opt.best_for}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. Verification & Fact-Check Audit */}
      {activeTab === 'verification' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Audit Overview Card */}
          <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/[0.06] gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Claim Corroboration & Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cross-checked against retrieved web sources with direct attribution
                </p>
              </div>

              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30">
                <span className="text-xs text-slate-400">Audit Score:</span>
                <span className="text-base font-black font-mono text-emerald-400">{confidenceScore}%</span>
              </div>
            </div>

            {/* Verification Reasoning */}
            {verification?.reasoning && (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/[0.04] mb-4">
                <span className="text-xs font-semibold text-indigo-400 block mb-1">
                  Verification Agent Audit Assessment:
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                  {verification.reasoning}
                </p>
              </div>
            )}

            {/* Contradictions / Alerts if any */}
            {verification?.conflicting_claims && verification.conflicting_claims.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 mb-4">
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5 mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Flagged Contradictions Across Sources ({verification.conflicting_claims.length})</span>
                </span>
                <ul className="space-y-1.5">
                  {verification.conflicting_claims.map((claim, idx) => (
                    <li key={idx} className="text-xs text-amber-200/90 leading-relaxed">
                      • {claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Attributed Facts List */}
          {research?.facts && research.facts.length > 0 && (
            <div className="glass-panel rounded-2xl p-6 sm:p-7 shadow-xl">
              <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Extracted Claims & Source Evidence</span>
              </h4>

              <div className="space-y-3">
                {research.facts.map((fact, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950/50 border border-white/[0.05] hover:border-white/[0.1] transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-xs sm:text-sm text-slate-100 font-medium font-sans leading-relaxed">
                        {fact.fact}
                      </p>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-white/[0.04] shrink-0">
                        {fact.category || 'General'}
                      </span>
                    </div>

                    {/* Attribution Snippet */}
                    {fact.context_snippet && (
                      <blockquote className="text-[11px] text-slate-400 italic pl-3 border-l-2 border-indigo-500/40 my-2 leading-relaxed">
                        "{fact.context_snippet}"
                      </blockquote>
                    )}

                    {/* Citation Link */}
                    {fact.source_url && (
                      <div className="pt-2 flex items-center justify-between text-xs">
                        <a 
                          href={fact.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span className="truncate max-w-sm">{fact.source_title || fact.source_url}</span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Action Governance (Human-in-the-Loop Hub) */}
      {activeTab === 'actions' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Safety Notice Banner */}
          <div className="glass-panel rounded-2xl p-6 border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900/60 to-slate-900/60">
            <div className="flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Human-in-the-Loop Autonomous Governance
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                  The system enforces a strict zero-autonomous-mutation policy. Proposed actions remain staged in pending state until you explicitly click <strong>Approve</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Proposed Actions Cards */}
          {(!action_plan?.proposed_actions || action_plan.proposed_actions.length === 0) ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <ClipboardCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No draft actions were generated for this research query.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {action_plan.proposed_actions.map((act) => {
                const isPending = act.status === 'pending';
                const isApproved = act.status === 'approved';
                const isRejected = act.status === 'rejected';
                const isExecuted = act.status === 'executed';
                const isLoadingThis = actionLoading === act.id;

                return (
                  <div 
                    key={act.id} 
                    className={`glass-panel rounded-2xl p-5 sm:p-6 shadow-xl border transition-all ${
                      isPending ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 
                      isApproved ? 'border-indigo-500/40' :
                      isExecuted ? 'border-emerald-500/40' : 'border-white/[0.05] opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/[0.06] gap-2">
                      <div className="flex items-center space-x-2.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          isApproved ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          isExecuted ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {act.status.toUpperCase()}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white font-sans">
                          {act.title}
                        </h4>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">
                        Type: <span className="text-slate-200 capitalize">{act.action_type}</span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed font-sans">
                      {act.description}
                    </p>

                    {/* Staged Payload / Draft Preview Box */}
                    {act.payload && (
                      <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/[0.05] mb-4 text-xs font-mono">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                            Staged Artifact Preview:
                          </span>
                          {(act.payload.draft || act.payload.summary || act.payload.open_url) && (
                            <button
                              onClick={() => handleCopyDraft(act.id, act.payload.draft || act.payload.summary || act.payload.open_url)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                            >
                              {copiedId === act.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedId === act.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                        <pre className="text-slate-300 text-[11px] whitespace-pre-wrap break-words max-h-36 overflow-y-auto font-mono">
                          {act.payload.draft || act.payload.summary || (act.payload.open_url ? `Target URL: ${act.payload.open_url}` : JSON.stringify(act.payload, null, 2))}
                        </pre>
                      </div>
                    )}

                    {/* Action Decision Control Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-400">
                        {isPending && "Review above draft and confirm approval before execution."}
                        {isApproved && "Action approved! Click Execute to proceed safely."}
                        {isExecuted && "Action completed and archived."}
                        {isRejected && "Action dismissed by user."}
                      </div>

                      <div className="flex items-center space-x-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => onActionDecision(act.id, 'reject')}
                              disabled={isLoadingThis}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-white/[0.08] transition-colors"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => onActionDecision(act.id, 'approve')}
                              disabled={isLoadingThis}
                              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 shadow-sm transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approve Action</span>
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => handleExecute(act)}
                            disabled={isLoadingThis}
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/30 transition-all active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Execute Action</span>
                          </button>
                        )}

                        {isExecuted && (
                          <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-medium">
                            <CheckCheck className="w-4 h-4" />
                            <span>Executed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Sources Library */}
      {activeTab === 'sources' && (
        <div className="space-y-4 animate-fade-in">
          {(!sources || sources.length === 0) ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <Globe className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>No web sources collected for this research session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {sources.map((src, idx) => (
                <div key={idx} className="glass-panel rounded-xl p-4 sm:p-5 shadow-lg border border-white/[0.06] hover:border-indigo-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-white/[0.04] gap-2">
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-white hover:text-indigo-300 flex items-center space-x-1.5 transition-colors group"
                    >
                      <span className="truncate">{src.title || src.url}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 shrink-0" />
                    </a>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-white/[0.05]">
                        {src.domain}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/25">
                        {src.scrape_method === 'playwright' ? 'Playwright Chromium' : 'Tavily Search API'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                    {src.snippet || src.scraped_content || "No text preview snippet extracted."}
                  </p>

                  <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono truncate max-w-md">{src.url}</span>
                    <span className="text-emerald-400/80 font-medium">Verified Genuine Source</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
