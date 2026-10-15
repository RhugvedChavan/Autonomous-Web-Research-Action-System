import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SetupModal from './components/SetupModal';
import ResearchForm from './components/ResearchForm';
import AgentProgressStepper from './components/AgentProgressStepper';
import ResultsDashboard from './components/ResultsDashboard';
import HistorySidebar from './components/HistorySidebar';
import { 
  getSystemStatus, 
  startResearch, 
  subscribeToSessionEvents, 
  getSession, 
  getSessions, 
  deleteSession,
  clearAllSessions,
  sendActionDecision, 
  executeAction 
} from './services/api';
import { ShieldAlert, Settings, RefreshCw } from 'lucide-react';

const SESSIONS_STORAGE_KEY = 'antigravity_research_sessions';
const SESSION_CACHE_PREFIX = 'antigravity_session_data_';

export default function App() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Research execution state
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [liveLogs, setLiveLogs] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Frontend Session History list
  const [sessionsHistory, setSessionsHistory] = useState([]);

  const eventSourceUnsubRef = useRef(null);

  // Load and merge history from backend and localStorage
  const loadInitialData = async () => {
    // 1. Fetch system status
    try {
      const statusData = await getSystemStatus();
      setSystemStatus(statusData);
    } catch (err) {
      console.error('Failed to load system status:', err);
    }

    // 2. Load stored sessions from localStorage first for immediate display
    let localSessions = [];
    try {
      const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (raw) localSessions = JSON.parse(raw);
    } catch {
      localSessions = [];
    }

    // 3. Fetch from backend and merge
    try {
      const apiSessions = await getSessions();
      // Merge unique by session_id, preferring API data
      const mergedMap = new Map();
      localSessions.forEach(s => mergedMap.set(s.session_id, s));
      apiSessions.forEach(s => mergedMap.set(s.session_id, s));
      
      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      setSessionsHistory(mergedList);
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(mergedList));
      } catch (e) {
        console.warn('Storage sync notice:', e);
      }
    } catch (err) {
      console.warn('Backend history fetch error, using local state:', err);
      setSessionsHistory(localSessions);
    }
  };

  useEffect(() => {
    loadInitialData();
    return () => {
      if (eventSourceUnsubRef.current) {
        eventSourceUnsubRef.current();
      }
    };
  }, []);

  // Persist session summaries helper
  const persistSessionHistory = (updatedList) => {
    setSessionsHistory(updatedList);
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (err) {
      console.warn('Failed to save sessions history to localStorage:', err);
    }
  };

  // Cache full session artifact
  const cacheSessionData = (sessionData) => {
    if (!sessionData || !sessionData.session_id) return;
    try {
      localStorage.setItem(`${SESSION_CACHE_PREFIX}${sessionData.session_id}`, JSON.stringify(sessionData));
    } catch (err) {
      console.warn('Failed to cache session data in localStorage:', err);
    }
  };

  // Retrieve cached full session artifact if backend was cleared
  const getCachedSessionData = (sessionId) => {
    try {
      const raw = localStorage.getItem(`${SESSION_CACHE_PREFIX}${sessionId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Handle Starting a Research Query
  const handleStartResearch = async (requestPayload) => {
    setErrorMsg(null);
    setIsRunning(true);
    setLiveLogs([]);
    setActiveSession(null);

    // Clean up previous SSE stream if any
    if (eventSourceUnsubRef.current) {
      eventSourceUnsubRef.current();
    }

    try {
      const initRes = await startResearch(requestPayload);
      const sessionId = initRes.session_id;
      setActiveSessionId(sessionId);

      // Create new summary record
      const newHistoryItem = {
        session_id: sessionId,
        query: requestPayload.query,
        created_at: new Date().toISOString(),
        status: 'running',
        sources_count: 0
      };
      const updatedList = [newHistoryItem, ...sessionsHistory.filter(s => s.session_id !== sessionId)];
      persistSessionHistory(updatedList);

      // Subscribe to Server-Sent Events
      eventSourceUnsubRef.current = subscribeToSessionEvents(
        sessionId,
        (event) => {
          setLiveLogs(prev => [...prev, event]);
          if (event.status === 'failed') {
            setErrorMsg(event.message);
          }
        },
        (err) => {
          console.warn('SSE stream notice:', err);
        },
        async () => {
          // On pipeline completion, fetch full session artifact
          setIsRunning(false);
          try {
            const fullSession = await getSession(sessionId);
            setActiveSession(fullSession);
            cacheSessionData(fullSession);

            // Refresh history list
            const updatedBackendSessions = await getSessions();
            persistSessionHistory(updatedBackendSessions);
          } catch (e) {
            console.error('Error fetching completed session:', e);
          }
        }
      );

    } catch (err) {
      setIsRunning(false);
      setErrorMsg(err.message || 'Failed to start autonomous research pipeline');
    }
  };

  // Handle Action Decisions (Approve/Reject)
  const handleActionDecision = async (actionId, decision) => {
    if (!activeSessionId) return;
    setActionLoading(actionId);
    try {
      const updatedAction = await sendActionDecision(activeSessionId, actionId, decision);
      
      setActiveSession(prev => {
        if (!prev || !prev.action_plan) return prev;
        const newActions = prev.action_plan.proposed_actions.map(a => 
          a.id === actionId ? updatedAction : a
        );
        const updatedSession = {
          ...prev,
          action_plan: {
            ...prev.action_plan,
            proposed_actions: newActions
          }
        };
        cacheSessionData(updatedSession);
        return updatedSession;
      });

      const updatedList = await getSessions();
      persistSessionHistory(updatedList);

    } catch (err) {
      alert(`Error updating action: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Safe Action Execution
  const handleExecuteAction = async (actionId) => {
    if (!activeSessionId) return;
    setActionLoading(actionId);
    try {
      const result = await executeAction(activeSessionId, actionId);
      
      setActiveSession(prev => {
        if (!prev || !prev.action_plan) return prev;
        const newActions = prev.action_plan.proposed_actions.map(a => 
          a.id === actionId ? { ...a, status: 'executed', execution_result: result.message } : a
        );
        const updatedSession = {
          ...prev,
          action_plan: {
            ...prev.action_plan,
            proposed_actions: newActions
          }
        };
        cacheSessionData(updatedSession);
        return updatedSession;
      });

      return result;
    } finally {
      setActionLoading(null);
    }
  };

  // Select and load a historical session
  const handleSelectSession = async (sessionId) => {
    try {
      let sessionData = null;
      try {
        sessionData = await getSession(sessionId);
      } catch (err) {
        // Fall back to local storage cache if server memory restarted
        sessionData = getCachedSessionData(sessionId);
      }

      if (!sessionData) {
        throw new Error('Could not locate saved data for this session.');
      }

      setActiveSessionId(sessionId);
      setActiveSession(sessionData);
      setLiveLogs(sessionData.agent_logs || []);
      setIsRunning(sessionData.status === 'running');
      setErrorMsg(sessionData.error_message);
    } catch (err) {
      alert(`Failed to load session: ${err.message}`);
    }
  };

  // Delete an individual session
  const handleDeleteSession = async (sessionId) => {
    try {
      // 1. Delete on backend API if possible
      try {
        await deleteSession(sessionId);
      } catch (err) {
        console.warn('Backend delete note:', err);
      }

      // 2. Remove from local storage cache
      try {
        localStorage.removeItem(`${SESSION_CACHE_PREFIX}${sessionId}`);
      } catch {}

      // 3. Update sessions list
      const updatedList = sessionsHistory.filter(s => s.session_id !== sessionId);
      persistSessionHistory(updatedList);

      // 4. If current session was deleted, clear active view
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveSession(null);
        setLiveLogs([]);
        setErrorMsg(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      throw err;
    }
  };

  // Clear all research sessions
  const handleClearAllSessions = async () => {
    try {
      // 1. Clear backend sessions
      try {
        await clearAllSessions();
      } catch (err) {
        console.warn('Backend clear all note:', err);
      }

      // 2. Clear only this application's session cache keys from localStorage
      try {
        sessionsHistory.forEach(s => {
          localStorage.removeItem(`${SESSION_CACHE_PREFIX}${s.session_id}`);
        });
        localStorage.removeItem(SESSIONS_STORAGE_KEY);
      } catch {}

      // 3. Clear state
      setSessionsHistory([]);
      setActiveSessionId(null);
      setActiveSession(null);
      setLiveLogs([]);
      setErrorMsg(null);

    } catch (err) {
      console.error('Failed to clear sessions:', err);
      throw err;
    }
  };

  const handleNewResearch = () => {
    setActiveSession(null);
    setActiveSessionId(null);
    setLiveLogs([]);
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-indigo-600/30 selection:text-indigo-200">
      {/* State-of-the-Art Navbar */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={sessionsHistory.length}
        systemStatus={systemStatus}
        onOpenSetup={() => setIsSetupOpen(true)}
        onNewResearch={handleNewResearch}
        isRunning={isRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Missing Key Warning (Compact Banner) */}
        {systemStatus && !systemStatus.is_fully_configured && (
          <div className="max-w-4xl mx-auto p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs animate-fade-in shadow-lg">
            <div className="flex items-center space-x-2.5 text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                API key configuration required. Add <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">MISTRAL_API_KEY</code> and <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">TAVILY_API_KEY</code> to <code className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-amber-300">backend/.env</code>.
              </span>
            </div>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shrink-0 ml-3 shadow"
            >
              Setup Keys
            </button>
          </div>
        )}

        {/* Research Input Form */}
        <ResearchForm
          onSubmit={handleStartResearch}
          isLoading={isRunning}
        />

        {/* Live Multi-Agent Pipeline Stepper */}
        {(isRunning || liveLogs.length > 0 || errorMsg) && (
          <AgentProgressStepper
            logs={liveLogs}
            isRunning={isRunning}
            overallStatus={activeSession?.status}
            errorMsg={errorMsg}
          />
        )}

        {/* Research Results Dossier Dashboard */}
        {activeSession && activeSession.status === 'completed' && (
          <ResultsDashboard
            session={activeSession}
            onActionDecision={handleActionDecision}
            onExecuteAction={handleExecuteAction}
            actionLoading={actionLoading}
          />
        )}
      </main>

      {/* Refined Modern Footer */}
      <footer className="border-t border-white/[0.06] bg-[#05070d]/80 py-5 text-center text-xs text-slate-500 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">Antigravity Research</span>
            <span>&copy; 2026 Autonomous Multi-Agent Intelligence System</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-slate-400">
            <button
              onClick={() => setIsSetupOpen(true)}
              className="flex items-center space-x-1 hover:text-indigo-300 transition-colors"
            >
              <Settings className="w-3 h-3 text-slate-400" />
              <span>API Diagnostics</span>
            </button>
            <span>&bull;</span>
            <span className="font-mono text-slate-500">FastAPI + React 19</span>
          </div>
        </div>
      </footer>

      {/* API Setup Modal */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        systemStatus={systemStatus}
        onRefresh={loadInitialData}
      />

      {/* Complete Research History Panel */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessionsHistory}
        currentSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
      />
    </div>
  );
}
