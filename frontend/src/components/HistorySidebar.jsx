import React, { useState, useMemo } from 'react';
import { 
  X, 
  History, 
  Trash2, 
  Search, 
  Clock, 
  ArrowUpDown, 
  AlertTriangle, 
  Trophy, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function HistorySidebar({ 
  isOpen, 
  onClose, 
  sessions = [], 
  currentSessionId, 
  onSelectSession,
  onDeleteSession,
  onClearAllSessions
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [confirmDialog, setConfirmDialog] = useState(null); // { type: 'single', sessionId, query } | { type: 'all' } | null
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(s => s.query && s.query.toLowerCase().includes(lower));
    }

    result.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [sessions, searchTerm, sortOrder]);

  if (!isOpen) return null;

  const handleOpenDeleteSingle = (e, session) => {
    e.stopPropagation();
    setConfirmDialog({
      type: 'single',
      sessionId: session.session_id,
      query: session.query
    });
  };

  const handleOpenClearAll = () => {
    setConfirmDialog({ type: 'all' });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsDeleting(true);
    try {
      if (confirmDialog.type === 'single') {
        await onDeleteSession(confirmDialog.sessionId);
      } else if (confirmDialog.type === 'all') {
        await onClearAllSessions();
      }
      setConfirmDialog(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#080c16] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between">
          
          {/* Drawer Header */}
          <div className="p-5 border-b border-white/[0.08] bg-slate-950/60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Research History
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {sessions.length} saved intelligence dossiers
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter past queries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/[0.08] text-xs text-slate-400 hover:text-slate-200 transition-colors"
                title="Toggle sort order"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="text-[11px] capitalize">{sortOrder}</span>
              </button>
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <History className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                <p className="text-xs">No research sessions match your filter.</p>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = s.session_id === currentSessionId;
                const winner = s.comparison?.options?.find(o => o.rank === 1);

                return (
                  <div
                    key={s.session_id}
                    onClick={() => {
                      onSelectSession(s.session_id);
                      onClose();
                    }}
                    className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected 
                        ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30' 
                        : 'bg-slate-900/50 border-white/[0.05] hover:border-white/[0.12] hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-relaxed">
                        {s.query}
                      </h4>
                      <button
                        onClick={(e) => handleOpenDeleteSingle(e, s)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded hover:bg-slate-800"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-white/[0.04]">
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center space-x-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimestamp(s.created_at)}</span>
                        </span>
                        {s.depth && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] uppercase bg-slate-950 text-slate-400 border border-white/[0.04]">
                            {s.depth}
                          </span>
                        )}
                      </div>

                      {winner && (
                        <div className="flex items-center space-x-1 text-amber-300 text-[10px] font-medium">
                          <Trophy className="w-3 h-3 text-amber-400" />
                          <span className="truncate max-w-[100px]">{winner.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer Actions */}
          {sessions.length > 0 && (
            <div className="p-4 border-t border-white/[0.08] bg-slate-950/80">
              <button
                onClick={handleOpenClearAll}
                className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Saved History</span>
              </button>
            </div>
          )}

          {/* Confirmation Dialog Overlay */}
          {confirmDialog && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-xs p-5 rounded-2xl bg-slate-900 border border-white/[0.1] text-center shadow-2xl">
                <AlertTriangle className="w-8 h-8 mx-auto text-amber-400 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  {confirmDialog.type === 'single' ? 'Delete Dossier?' : 'Clear All History?'}
                </h4>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  {confirmDialog.type === 'single'
                    ? `Are you sure you want to permanently delete "${confirmDialog.query}"?`
                    : 'This will permanently remove all stored research sessions from both memory and local cache.'}
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setConfirmDialog(null)}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    disabled={isDeleting}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
