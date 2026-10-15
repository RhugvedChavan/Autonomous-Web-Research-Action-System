/**
 * API client service for communicating with FastAPI backend.
 */

const BASE_URL = '/api';

export async function getSystemStatus() {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function startResearch(payload) {
  const res = await fetch(`${BASE_URL}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to initiate research: ${res.statusText}`);
  }
  return res.json();
}

export function subscribeToSessionEvents(sessionId, onEvent, onError, onComplete) {
  const url = `${BASE_URL}/research/stream/${sessionId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onEvent) onEvent(data);
      if (data.status === 'completed' && data.agent === 'System Orchestrator') {
        eventSource.close();
        if (onComplete) onComplete(data);
      }
    } catch (err) {
      console.warn('Error parsing SSE event data:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
    eventSource.close();
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

export async function getSession(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`);
  if (!res.ok) throw new Error(`Failed to load session: ${res.statusText}`);
  return res.json();
}

export async function getSessions() {
  const res = await fetch(`${BASE_URL}/sessions`);
  if (!res.ok) throw new Error(`Failed to load sessions: ${res.statusText}`);
  return res.json();
}

export async function sendActionDecision(sessionId, actionId, decision) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/actions/${actionId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update action decision');
  }
  return res.json();
}

export async function executeAction(sessionId, actionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/actions/${actionId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to execute action');
  }
  return res.json();
}

export async function deleteSession(sessionId) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete research session');
  }
  return res.json();
}

export async function clearAllSessions() {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to clear research history');
  }
  return res.json();
}

export function getExportMarkdownUrl(sessionId) {
  return `${BASE_URL}/sessions/${sessionId}/export/markdown`;
}

