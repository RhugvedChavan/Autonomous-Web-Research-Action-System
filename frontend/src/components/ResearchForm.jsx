import React, { useState } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Sparkles,
  Zap,
  Scale,
  FlaskConical,
  Layers,
  ArrowRight,
  HelpCircle,
  Tag
} from 'lucide-react';

const EXAMPLE_QUERIES = [
  {
    category: "Cloud & Dev",
    label: "Supabase vs Firebase (2026)",
    query: "Compare Supabase vs Firebase for a scalable real-time React web application in 2026",
    criteria: ["PostgreSQL vs NoSQL", "Pricing & Free Tier Limits", "Real-Time Sync Latency", "Vendor Lock-in"]
  },
  {
    category: "AI & LLMs",
    label: "Claude 3.7 vs GPT-4.5 for Code",
    query: "Compare Claude 3.7 Sonnet vs GPT-4.5 for agentic coding and multi-file code refactoring",
    criteria: ["Code Generation Accuracy", "Token Pricing & Economics", "Context Window Limits", "Tool Use Reliability"]
  },
  {
    category: "Data & Vectors",
    label: "Qdrant vs Chroma vs Milvus",
    query: "Evaluate top open-source vector databases: Qdrant vs Chroma vs Milvus for production RAG systems",
    criteria: ["Query Latency (HNSW)", "Memory Footprint", "Payload Filtering", "Self-Hosting Complexity"]
  },
  {
    category: "Hardware",
    label: "Wireless Mechanical Keyboards",
    query: "Best wireless hot-swappable mechanical keyboards under $150 in 2026",
    criteria: ["Build Quality & Acoustics", "Battery Endurance", "Switch Customization", "Wireless 2.4GHz Latency"]
  }
];

const SUGGESTED_CRITERIA = [
  "Pricing & Total Cost",
  "Performance & Latency",
  "Ease of Integration",
  "Security & Privacy",
  "Community & Docs",
  "Pros & Cons"
];

export default function ResearchForm({ onSubmit, isLoading }) {
  const [query, setQuery] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [newCriterion, setNewCriterion] = useState('');
  const [depth, setDepth] = useState('balanced');
  const [maxSources, setMaxSources] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    onSubmit({
      query: query.trim(),
      criteria: criteria.filter(c => c.trim().length > 0),
      depth,
      max_sources: maxSources
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddCriterion = (text) => {
    const val = (text || newCriterion).trim();
    if (val && !criteria.includes(val)) {
      setCriteria(prev => [...prev, val]);
      setNewCriterion('');
    }
  };

  const handleRemoveCriterion = (indexToRemove) => {
    setCriteria(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSelectExample = (ex) => {
    setQuery(ex.query);
    setCriteria(ex.criteria);
    if (ex.criteria.length > 3) {
      setMaxSources(6);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 sm:py-8 px-4">
      
      {/* Hero Headline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Autonomous 5-Agent Research & Verification Engine</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 font-sans">
          Deep Web Research, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200">Verified & Actionable</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Five specialized AI agents collaborate to search, extract facts, generate ranked comparisons, audit citations, and draft human-governed actions.
        </p>
      </div>

      {/* Main Command Console Card */}
      <div className="relative glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Query Input Box */}
          <div className="relative">
            <div className="absolute top-3.5 left-4 pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-indigo-400/80" />
            </div>
            <textarea
              id="research-query-input"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="What topic, tool comparison, or complex question would you like researched?"
              className="w-full pl-12 pr-4 pt-3.5 pb-3 bg-slate-950/60 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20 text-sm sm:text-base leading-relaxed resize-none transition-all"
            />
            <div className="absolute bottom-3 right-3 hidden sm:flex items-center space-x-1 text-[11px] text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">Enter</kbd>
              <span>to launch</span>
            </div>
          </div>

          {/* Depth Segmented Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-400">Research Depth:</span>
              <div className="inline-flex p-1 rounded-xl bg-slate-950/70 border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => { setDepth('quick'); setMaxSources(3); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    depth === 'quick'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Quick (3 sources)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setDepth('balanced'); setMaxSources(5); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    depth === 'balanced'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>Balanced (5 sources)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setDepth('deep'); setMaxSources(8); }}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    depth === 'deep'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Deep (8+ sources)</span>
                </button>
              </div>
            </div>

            {/* Advanced Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-indigo-300 transition-colors py-1"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Options' : 'Custom Criteria & Settings'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Advanced Criteria & Source Configuration */}
          {showAdvanced && (
            <div className="pt-4 border-t border-white/[0.06] space-y-4 animate-fade-in">
              
              {/* Custom Criteria Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Comparison Criteria (Optional)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">Guides the Comparison Agent scoring matrix</span>
                </div>

                {/* Criteria Tags */}
                {criteria.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {criteria.map((crit, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/70 text-indigo-200 border border-indigo-500/30 shadow-sm"
                      >
                        <span>{crit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCriterion(idx)}
                          className="text-indigo-400 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Input to add tag */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriterion();
                      }
                    }}
                    placeholder="Type custom criterion (e.g. 'Latency', 'Pricing') and press Enter"
                    className="flex-1 px-3 py-1.5 bg-slate-950/60 border border-white/[0.08] rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCriterion()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.06] transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Quick Add Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-500">Suggestions:</span>
                  {SUGGESTED_CRITERIA.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddCriterion(sug)}
                      disabled={criteria.includes(sug)}
                      className="px-2 py-0.5 rounded text-[11px] bg-slate-900/60 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-slate-200 border border-white/[0.05] transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Count Slider */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-slate-300">Max Source Pages:</span>
                  <span className="text-[11px] text-slate-500">Browser Agent search evaluation quota</span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={maxSources}
                    onChange={(e) => setMaxSources(parseInt(e.target.value))}
                    className="w-28 sm:w-36 accent-indigo-500 cursor-pointer"
                  />
                  <span className="w-7 text-center font-mono text-xs font-semibold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-700/50">
                    {maxSources}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Launch Action Button */}
          <div className="pt-2">
            <button
              id="launch-research-btn"
              type="submit"
              disabled={isLoading || !query.trim()}
              className="w-full relative group overflow-hidden rounded-xl p-[1px] font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.99]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 transition-all duration-300 group-hover:opacity-90"></div>
              <div className="relative px-6 py-3.5 bg-slate-950/20 rounded-[11px] flex items-center justify-center space-x-2 text-sm sm:text-base font-bold shadow-lg shadow-indigo-600/30">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                    <span>Executing 5-Agent Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Launch Autonomous Research Pipeline</span>
                    <ArrowRight className="w-4 h-4 text-cyan-300 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </div>
        </form>
      </div>

      {/* Curated Research Presets */}
      <div className="mt-8">
        <div className="flex items-center space-x-2 mb-3 px-1">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Suggested Deep Research Queries
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {EXAMPLE_QUERIES.map((ex, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectExample(ex)}
              className="glass-card glass-card-hover p-3.5 rounded-xl cursor-pointer group select-none text-left"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-white/[0.05]">
                  {ex.category}
                </span>
                <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">
                  {ex.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {ex.query}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ex.criteria.slice(0, 3).map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950/60 text-slate-400">
                    • {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
