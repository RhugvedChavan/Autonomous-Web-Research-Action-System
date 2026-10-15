import asyncio
import uuid
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse

from backend.config import settings
from backend.models import (
    ResearchRequest,
    ResearchSession,
    ActionDecisionRequest,
    ProposedAction
)
from backend.storage import session_store
from backend.orchestrator import orchestrator

app = FastAPI(
    title="Autonomous Web Research & Action System",
    description="Multi-Agent AI architecture with Mistral AI, Tavily, and Playwright",
    version="1.0.0"
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "Autonomous Web Research & Action System"}


@app.get("/api/status")
def get_system_status() -> Dict[str, Any]:
    """Returns safe configuration status for Mistral and Tavily APIs.
    Never exposes API secrets to frontend.
    """
    return settings.get_setup_status()


@app.post("/api/research", response_model=Dict[str, Any])
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """Initiates an autonomous multi-agent research session."""
    session_id = f"res_{uuid.uuid4().hex[:10]}"
    
    # Create session in memory
    session = session_store.create_session(
        session_id=session_id,
        query=request.query,
        criteria=request.criteria,
        depth=request.depth
    )

    # Launch pipeline in background task so client can connect to SSE stream or poll
    background_tasks.add_task(orchestrator.run_pipeline, session_id, request)

    return {
        "session_id": session_id,
        "query": request.query,
        "status": "running",
        "message": "Autonomous multi-agent research session launched.",
        "stream_url": f"/api/research/stream/{session_id}"
    }


@app.get("/api/research/stream/{session_id}")
async def stream_research_events(session_id: str):
    """Server-Sent Events endpoint streaming real-time agent progress and logs."""
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research session '{session_id}' not found."
        )

    return StreamingResponse(
        orchestrator.stream_events(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/sessions", response_model=List[Dict[str, Any]])
def list_research_sessions():
    """Retrieve all in-memory research session summaries (history)."""
    return session_store.list_sessions()


@app.get("/api/sessions/{session_id}", response_model=ResearchSession)
def get_session_details(session_id: str):
    """Retrieve full details of a specific research session."""
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research session '{session_id}' not found."
        )
    return session


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str) -> Dict[str, Any]:
    """Permanently delete an individual research session."""
    deleted = session_store.delete_session(session_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Research session '{session_id}' not found."
        )
    return {"success": True, "message": f"Session '{session_id}' deleted successfully."}


@app.delete("/api/sessions")
def clear_all_sessions() -> Dict[str, Any]:
    """Permanently clear all research sessions from in-memory storage."""
    cleared_count = session_store.clear_sessions()
    return {"success": True, "cleared_count": cleared_count, "message": f"Cleared {cleared_count} research sessions."}


@app.post("/api/sessions/{session_id}/actions/{action_id}/decision", response_model=ProposedAction)
def update_action_decision(session_id: str, action_id: str, req: ActionDecisionRequest):
    """Approve or reject a proposed action. Requires explicit user approval."""
    new_status = "approved" if req.decision == "approve" else "rejected"
    action = session_store.update_action_status(
        session_id=session_id,
        action_id=action_id,
        status=new_status,
        result_message=f"User explicitly {new_status} this action."
    )
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action or session not found."
        )
    return action


@app.post("/api/sessions/{session_id}/actions/{action_id}/execute")
def execute_approved_action(session_id: str, action_id: str) -> Dict[str, Any]:
    """Execute an action that has received explicit user approval.
    Safety constraint: opens verified links or copies structured content only;
    never mutates external systems without human review.
    """
    session = session_store.get_session(session_id)
    if not session or not session.action_plan:
        raise HTTPException(status_code=404, detail="Session or action plan not found.")

    target_action = None
    for a in session.action_plan.proposed_actions:
        if a.id == action_id:
            target_action = a
            break

    if not target_action:
        raise HTTPException(status_code=404, detail="Action not found.")

    if target_action.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Action must be explicitly approved before execution. Current status is '{target_action.status}'."
        )

    # Perform safe execution
    exec_result = ""
    payload = {}

    if target_action.action_type == "open_link":
        exec_result = f"Safe navigation target confirmed: {target_action.target_url}"
        payload = {"open_url": target_action.target_url}
    elif target_action.action_type == "draft_message":
        exec_result = "Message draft prepared for user dispatch."
        payload = {"draft": target_action.content_draft}
    elif target_action.action_type == "copy_summary":
        exec_result = "Executive summary ready for clipboard."
        payload = {"summary": target_action.content_draft}
    elif target_action.action_type == "export_markdown":
        exec_result = "Markdown research report compiled."
        # Build markdown report
        md_content = f"# Autonomous Web Research Report\n\n"
        md_content += f"**Query:** {session.query}\n"
        md_content += f"**Date:** {session.created_at}\n\n"
        if session.research:
            md_content += f"## Executive Summary\n{session.research.summary}\n\n"
            md_content += "## Key Findings\n"
            for kf in session.research.key_findings:
                md_content += f"- {kf}\n"
            md_content += "\n## Verified Facts\n"
            for f in session.research.facts:
                md_content += f"- **[{f.category}]** {f.fact} ([Source]({f.source_url}))\n"
        if session.comparison:
            md_content += f"\n## Comparison Matrix\n**Top Pick:** {session.comparison.top_pick}\n\n"
            for opt in session.comparison.options:
                md_content += f"### {opt.rank}. {opt.name} (Score: {opt.overall_score}/10)\n"
                md_content += f"- Best for: {opt.best_for}\n"
                md_content += f"- Strengths: {', '.join(opt.strengths)}\n"
                md_content += f"- Weaknesses: {', '.join(opt.weaknesses)}\n"
        if session.verification:
            md_content += f"\n## Verification Audit (Confidence: {session.verification.confidence_score:.0f}%)\n"
            for c in session.verification.claims:
                md_content += f"- [{c.status.upper()}] {c.claim}\n"
        payload = {"markdown": md_content}

    # Mark as executed in memory
    session_store.update_action_status(
        session_id=session_id,
        action_id=action_id,
        status="executed",
        result_message=exec_result
    )

    return {
        "action_id": action_id,
        "status": "executed",
        "action_type": target_action.action_type,
        "message": exec_result,
        "payload": payload
    }


@app.get("/api/sessions/{session_id}/export/markdown", response_class=PlainTextResponse)
def export_session_markdown(session_id: str):
    """Directly download complete session as Markdown."""
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    md = f"# Research Report: {session.query}\n\n"
    md += f"- **Status:** {session.status.upper()}\n"
    md += f"- **Created At:** {session.created_at}\n\n"

    if session.research:
        md += f"## Executive Summary\n{session.research.summary}\n\n"
        md += "### Key Findings\n"
        for k in session.research.key_findings:
            md += f"- {k}\n"
        md += "\n### Extracted Facts\n"
        for f in session.research.facts:
            md += f"- [{f.category}] {f.fact} (Source: [{f.source_title}]({f.source_url}))\n"

    if session.comparison:
        md += f"\n## Comparative Analysis\n"
        md += f"**Top Pick:** {session.comparison.top_pick}\n\n"
        md += f"{session.comparison.comparison_summary}\n\n"
        for opt in session.comparison.options:
            md += f"### #{opt.rank} {opt.name} — {opt.overall_score}/10\n"
            md += f"**Best For:** {opt.best_for}\n"
            md += f"- **Strengths:** {', '.join(opt.strengths)}\n"
            md += f"- **Weaknesses:** {', '.join(opt.weaknesses)}\n"

    if session.verification:
        md += f"\n## Verification & Audit (Confidence: {session.verification.confidence_score:.0f}%)\n"
        if session.verification.critical_warnings:
            md += "### Warnings\n"
            for w in session.verification.critical_warnings:
                md += f"> [!WARNING]\n> {w}\n\n"
        md += "### Claim Cross-Check\n"
        for c in session.verification.claims:
            md += f"- **[{c.status.upper()}]** {c.claim}\n  _{c.analysis}_\n"

    if session.action_plan:
        md += f"\n## Recommended Action Plan\n"
        md += f"{session.action_plan.executive_recommendation}\n\n"
        md += "### Next Steps\n"
        for ns in session.action_plan.next_steps:
            md += f"1. {ns}\n"

    return PlainTextResponse(content=md, media_type="text/markdown")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=settings.PORT, reload=True)
