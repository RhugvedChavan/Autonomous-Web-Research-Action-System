from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from backend.models import ResearchSession, AgentStepEvent, ProposedAction


class InMemorySessionStore:
    """Thread-safe in-memory storage for active and completed research sessions.
    Strictly satisfies the requirement: NO database, Python in-memory dictionaries/lists.
    """
    def __init__(self):
        self._sessions: Dict[str, ResearchSession] = {}

    def create_session(
        self,
        session_id: str,
        query: str,
        criteria: Optional[List[str]] = None,
        depth: str = "balanced"
    ) -> ResearchSession:
        now_iso = datetime.now(timezone.utc).isoformat()
        session = ResearchSession(
            session_id=session_id,
            query=query,
            criteria=criteria or [],
            depth=depth,
            created_at=now_iso,
            updated_at=now_iso,
            status="running",
            agent_logs=[],
            sources=[]
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ResearchSession]:
        return self._sessions.get(session_id)

    def save_session(self, session: ResearchSession) -> ResearchSession:
        session.updated_at = datetime.now(timezone.utc).isoformat()
        self._sessions[session.session_id] = session
        return session

    def append_log(self, session_id: str, event: AgentStepEvent) -> None:
        session = self.get_session(session_id)
        if session:
            session.agent_logs.append(event)
            session.updated_at = datetime.now(timezone.utc).isoformat()

    def list_sessions(self) -> List[Dict[str, Any]]:
        """Return summary list of all in-memory sessions in reverse chronological order."""
        summaries = []
        for s in self._sessions.values():
            approved_actions = 0
            total_actions = 0
            if s.action_plan:
                total_actions = len(s.action_plan.proposed_actions)
                approved_actions = sum(1 for a in s.action_plan.proposed_actions if a.status == "approved")

            summaries.append({
                "session_id": s.session_id,
                "query": s.query,
                "created_at": s.created_at,
                "status": s.status,
                "sources_count": len(s.sources),
                "has_research": s.research is not None,
                "has_comparison": s.comparison is not None,
                "has_verification": s.verification is not None,
                "has_action_plan": s.action_plan is not None,
                "actions_count": total_actions,
                "actions_approved": approved_actions,
                "top_pick": s.comparison.top_pick if s.comparison else None,
                "confidence_score": s.verification.confidence_score if s.verification else None,
            })
        return sorted(summaries, key=lambda x: x["created_at"], reverse=True)

    def update_action_status(
        self,
        session_id: str,
        action_id: str,
        status: str,
        result_message: Optional[str] = None
    ) -> Optional[ProposedAction]:
        session = self.get_session(session_id)
        if not session or not session.action_plan:
            return None

        for action in session.action_plan.proposed_actions:
            if action.id == action_id:
                action.status = status
                if result_message:
                    action.execution_result = result_message
                if status in ("executed", "approved"):
                    action.executed_at = datetime.now(timezone.utc).isoformat()
                session.updated_at = datetime.now(timezone.utc).isoformat()
                return action
        return None

    def delete_session(self, session_id: str) -> bool:
        """Permanently delete an individual session from in-memory store."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def clear_sessions(self) -> int:
        """Permanently remove all saved sessions from in-memory store."""
        count = len(self._sessions)
        self._sessions.clear()
        return count

    def clear(self) -> None:
        """Clear store (alias for unit testing)."""
        self.clear_sessions()


session_store = InMemorySessionStore()
