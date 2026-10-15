import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator, Dict, Any, Optional
import json

from backend.config import settings
from backend.models import (
    ResearchRequest,
    ResearchSession,
    AgentStepEvent,
    AgentName
)
from backend.storage import session_store
from backend.agents.browser_agent import BrowserAgent
from backend.agents.research_agent import ResearchAgent
from backend.agents.comparison_agent import ComparisonAgent
from backend.agents.verification_agent import VerificationAgent
from backend.agents.action_planner_agent import ActionPlannerAgent


class MultiAgentOrchestrator:
    """Coordinates the 5-Agent pipeline and streams live updates:
    User Query -> Browser Agent -> Research Agent -> Comparison Agent -> Verification Agent -> Action Planner
    """

    def __init__(self):
        # Event queues mapped by session_id for SSE streaming
        self._queues: Dict[str, asyncio.Queue] = {}

    def get_or_create_queue(self, session_id: str) -> asyncio.Queue:
        if session_id not in self._queues:
            self._queues[session_id] = asyncio.Queue()
        return self._queues[session_id]

    async def emit_event(
        self,
        session_id: str,
        agent: str,
        status: str,
        message: str,
        progress: int,
        data: Optional[Dict[str, Any]] = None
    ) -> AgentStepEvent:
        """Record log into session storage and enqueue for live SSE subscribers."""
        event = AgentStepEvent(
            agent=agent,
            status=status,
            message=message,
            progress=progress,
            timestamp=datetime.now(timezone.utc).strftime("%H:%M:%S"),
            data=data
        )

        # Store in session
        session_store.append_log(session_id, event)

        # Enqueue for stream
        if session_id in self._queues:
            await self._queues[session_id].put(event)

        return event

    async def run_pipeline(self, session_id: str, request: ResearchRequest) -> ResearchSession:
        """Executes all 5 agents sequentially with live progress dispatch."""
        session = session_store.get_session(session_id)
        if not session:
            session = session_store.create_session(
                session_id=session_id,
                query=request.query,
                criteria=request.criteria,
                depth=request.depth
            )

        # Validate configuration before launching
        status_info = settings.get_setup_status()
        if not status_info["is_fully_configured"]:
            missing_msg = " ; ".join(status_info["setup_messages"])
            await self.emit_event(
                session_id=session_id,
                agent="System Orchestrator",
                status="failed",
                message=f"Configuration required: {missing_msg}",
                progress=0,
                data={"setup_status": status_info}
            )
            session.status = "error"
            session.error_message = missing_msg
            session_store.save_session(session)
            await self._finish_queue(session_id)
            return session

        try:
            # -------------------------------------------------------------
            # Stage 1: Browser Agent
            # -------------------------------------------------------------
            await self.emit_event(
                session_id=session_id,
                agent=AgentName.BROWSER.value,
                status="running",
                message=f"Initiating web search & content collection for '{request.query}'",
                progress=5
            )

            async def browser_logger(msg: str, prog: int, data: Optional[Dict[str, Any]] = None):
                await self.emit_event(session_id, AgentName.BROWSER.value, "running", msg, prog, data)

            browser_agent = BrowserAgent()
            sources = await browser_agent.run(
                query=request.query,
                depth=request.depth,
                max_results=request.max_sources,
                log_callback=browser_logger
            )

            session.sources = sources
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent=AgentName.BROWSER.value,
                status="completed",
                message=f"Browser Agent successfully gathered {len(sources)} verified web sources",
                progress=20,
                data={"sources_count": len(sources)}
            )

            # -------------------------------------------------------------
            # Stage 2: Research Agent
            # -------------------------------------------------------------
            await self.emit_event(
                session_id=session_id,
                agent=AgentName.RESEARCH.value,
                status="running",
                message="Research Agent extracting verifiable facts and synthesizing findings...",
                progress=25
            )

            async def research_logger(msg: str, prog: int, data: Optional[Dict[str, Any]] = None):
                await self.emit_event(session_id, AgentName.RESEARCH.value, "running", msg, prog, data)

            research_agent = ResearchAgent()
            findings = await research_agent.run(
                query=request.query,
                sources=sources,
                log_callback=research_logger
            )

            session.research = findings
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent=AgentName.RESEARCH.value,
                status="completed",
                message=f"Research Agent compiled executive summary and {len(findings.facts)} source-linked facts",
                progress=50
            )

            # -------------------------------------------------------------
            # Stage 3: Comparison Agent
            # -------------------------------------------------------------
            await self.emit_event(
                session_id=session_id,
                agent=AgentName.COMPARISON.value,
                status="running",
                message="Comparison Agent constructing multi-criteria matrix and calculating option scores...",
                progress=55
            )

            async def comparison_logger(msg: str, prog: int, data: Optional[Dict[str, Any]] = None):
                await self.emit_event(session_id, AgentName.COMPARISON.value, "running", msg, prog, data)

            comparison_agent = ComparisonAgent()
            matrix = await comparison_agent.run(
                query=request.query,
                research=findings,
                criteria=request.criteria,
                log_callback=comparison_logger
            )

            session.comparison = matrix
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent=AgentName.COMPARISON.value,
                status="completed",
                message=f"Comparison Agent ranked {len(matrix.options)} options. Top candidate: {matrix.top_pick}",
                progress=70
            )

            # -------------------------------------------------------------
            # Stage 4: Verification Agent
            # -------------------------------------------------------------
            await self.emit_event(
                session_id=session_id,
                agent=AgentName.VERIFICATION.value,
                status="running",
                message="Verification Agent auditing claims, checking source consensus, and detecting risks...",
                progress=75
            )

            async def verification_logger(msg: str, prog: int, data: Optional[Dict[str, Any]] = None):
                await self.emit_event(session_id, AgentName.VERIFICATION.value, "running", msg, prog, data)

            verification_agent = VerificationAgent()
            report = await verification_agent.run(
                query=request.query,
                research=findings,
                comparison=matrix,
                log_callback=verification_logger
            )

            session.verification = report
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent=AgentName.VERIFICATION.value,
                status="completed",
                message=f"Verification complete: Confidence {report.confidence_score:.0f}%, {len(report.critical_warnings)} caveats noted",
                progress=85
            )

            # -------------------------------------------------------------
            # Stage 5: Action Planner Agent
            # -------------------------------------------------------------
            await self.emit_event(
                session_id=session_id,
                agent=AgentName.ACTION_PLANNER.value,
                status="running",
                message="Action Planner formulating next steps and preparing safe drafts for user approval...",
                progress=90
            )

            async def action_logger(msg: str, prog: int, data: Optional[Dict[str, Any]] = None):
                await self.emit_event(session_id, AgentName.ACTION_PLANNER.value, "running", msg, prog, data)

            action_agent = ActionPlannerAgent()
            plan = await action_agent.run(
                query=request.query,
                research=findings,
                comparison=matrix,
                verification=report,
                log_callback=action_logger
            )

            session.action_plan = plan
            session.status = "completed"
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent="System Orchestrator",
                status="completed",
                message="Autonomous research workflow successfully completed! Results ready for review.",
                progress=100,
                data={"session_id": session_id}
            )

        except Exception as exc:
            err_msg = str(exc)
            session.status = "error"
            session.error_message = err_msg
            session_store.save_session(session)

            await self.emit_event(
                session_id=session_id,
                agent="System Orchestrator",
                status="failed",
                message=f"Pipeline error: {err_msg}",
                progress=100,
                data={"error": err_msg}
            )
        finally:
            await self._finish_queue(session_id)

        return session

    async def _finish_queue(self, session_id: str):
        """Signal end of stream to subscribers."""
        if session_id in self._queues:
            await self._queues[session_id].put(None)

    async def stream_events(self, session_id: str) -> AsyncGenerator[str, None]:
        """Server-Sent Events generator yielding JSON events."""
        queue = self.get_or_create_queue(session_id)

        # If session has existing logs, emit them first
        session = session_store.get_session(session_id)
        if session and session.agent_logs:
            for log in session.agent_logs:
                yield f"data: {json.dumps(log.model_dump())}\n\n"

        if session and session.status in ("completed", "error"):
            # Already completed
            yield f"data: {json.dumps({'agent': 'System Orchestrator', 'status': session.status, 'progress': 100, 'message': 'Session concluded.'})}\n\n"
            return

        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                if event is None:
                    # End of stream sentinel
                    yield f"data: {json.dumps({'agent': 'System Orchestrator', 'status': 'completed', 'progress': 100, 'message': 'Stream finished.'})}\n\n"
                    break
                yield f"data: {json.dumps(event.model_dump())}\n\n"
            except asyncio.TimeoutError:
                # Send SSE keep-alive ping
                yield ": keep-alive\n\n"
            except asyncio.CancelledError:
                break


orchestrator = MultiAgentOrchestrator()
