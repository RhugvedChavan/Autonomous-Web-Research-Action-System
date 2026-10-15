import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.storage import session_store
from backend.models import (
    ResearchRequest,
    SourceDocument,
    FactItem,
    ResearchFindings,
    ComparisonOption,
    ComparisonMatrix,
    VerificationClaim,
    VerificationReport,
    ProposedAction,
    ActionPlan
)
from backend.orchestrator import MultiAgentOrchestrator


client = TestClient(app)


def setup_function():
    """Clear in-memory storage before each test."""
    session_store.clear()


def test_health_endpoint():
    """Verify health endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Autonomous Web Research" in data["service"]


def test_status_endpoint_no_secrets_exposed():
    """Verify that /api/status safely indicates key configuration without exposing values."""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_fully_configured" in data
    assert "mistral_configured" in data
    assert "tavily_configured" in data
    assert "missing_keys" in data
    assert "setup_messages" in data
    # Ensure missing_keys correctly reports keys when unconfigured
    assert isinstance(data["missing_keys"], list)
    assert isinstance(data["setup_messages"], list)
    # Ensure no secret keys dictionary or raw bearer tokens are returned in the response
    assert "api_key" not in data
    assert "token" not in data
    assert "secret" not in data


def test_in_memory_storage_lifecycle():
    """Verify complete in-memory storage operations without any database."""
    session = session_store.create_session(
        session_id="test_sess_01",
        query="Compare React vs Vue in 2026",
        criteria=["Performance", "Ecosystem"],
        depth="balanced"
    )
    assert session.session_id == "test_sess_01"
    assert session.status == "running"

    # List sessions
    summaries = session_store.list_sessions()
    assert len(summaries) == 1
    assert summaries[0]["session_id"] == "test_sess_01"
    assert summaries[0]["query"] == "Compare React vs Vue in 2026"

    # Retrieve
    retrieved = session_store.get_session("test_sess_01")
    assert retrieved is not None
    assert retrieved.query == "Compare React vs Vue in 2026"

    # Delete single session via API
    del_res = client.delete("/api/sessions/test_sess_01")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True
    assert session_store.get_session("test_sess_01") is None

    # Deleting non-existent session returns 404
    del_404 = client.delete("/api/sessions/non_existent")
    assert del_404.status_code == 404

    # Create 2 sessions and clear all via API
    session_store.create_session("s1", "Query 1")
    session_store.create_session("s2", "Query 2")
    assert len(session_store.list_sessions()) == 2
    clear_res = client.delete("/api/sessions")
    assert clear_res.status_code == 200
    assert clear_res.json()["cleared_count"] == 2
    assert len(session_store.list_sessions()) == 0


def test_action_approval_workflow():
    """Verify that actions require explicit user approval and cannot be executed until approved."""
    session = session_store.create_session("sess_approval_test", "Test Action Workflow")
    
    # Add an ActionPlan with a pending proposed action
    action_item = ProposedAction(
        id="act_001",
        title="Open Vue Official Documentation",
        action_type="open_link",
        description="Opens the official guide",
        target_url="https://vuejs.org",
        requires_approval=True,
        status="pending"
    )
    session.action_plan = ActionPlan(
        executive_recommendation="Use Vue for this project.",
        next_steps=["Step 1"],
        proposed_actions=[action_item]
    )
    session_store.save_session(session)

    # 1. Attempting execution while pending must fail (HTTP 400)
    exec_res = client.post("/api/sessions/sess_approval_test/actions/act_001/execute")
    assert exec_res.status_code == 400
    assert "must be explicitly approved" in exec_res.json()["detail"]

    # 2. Reject the action
    rej_res = client.post(
        "/api/sessions/sess_approval_test/actions/act_001/decision",
        json={"decision": "reject"}
    )
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "rejected"

    # 3. Approve the action
    app_res = client.post(
        "/api/sessions/sess_approval_test/actions/act_001/decision",
        json={"decision": "approve"}
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "approved"

    # 4. Now execution succeeds
    exec_success = client.post("/api/sessions/sess_approval_test/actions/act_001/execute")
    assert exec_success.status_code == 200
    assert exec_success.json()["status"] == "executed"
    assert exec_success.json()["payload"]["open_url"] == "https://vuejs.org"


def test_pydantic_models_validation():
    """Verify structured Pydantic response models for all agent artifacts."""
    doc = SourceDocument(
        url="https://react.dev",
        title="React Official",
        snippet="A library for web and native user interfaces",
        domain="react.dev"
    )
    assert doc.domain == "react.dev"

    fact = FactItem(
        fact="React 19 introduces Actions and Server Functions",
        category="Features",
        source_url="https://react.dev",
        source_title="React Official"
    )
    assert fact.category == "Features"

    research = ResearchFindings(
        summary="Comprehensive analysis of frontend frameworks.",
        key_findings=["React retains largest ecosystem"],
        facts=[fact],
        sources=[doc]
    )
    assert len(research.facts) == 1

    opt = ComparisonOption(
        name="React",
        rank=1,
        overall_score=9.4,
        summary="Dominant web UI ecosystem",
        criterion_scores={"Ecosystem": 9.8, "Performance": 9.0},
        strengths=["Large community", "Wide adoption"],
        weaknesses=["Requires build tools"],
        best_for="Large enterprise web applications"
    )

    matrix = ComparisonMatrix(
        criteria=["Ecosystem", "Performance"],
        options=[opt],
        top_pick="React",
        comparison_summary="React leads overall due to ecosystem maturity.",
        trade_offs=["Ecosystem breadth vs boilerplate"]
    )
    assert matrix.top_pick == "React"

    claim = VerificationClaim(
        claim="React 19 supports server actions",
        status="verified",
        confidence_level="high",
        supporting_sources=["https://react.dev"],
        analysis="Confirmed via official React documentation."
    )
    report = VerificationReport(
        confidence_score=95.0,
        verified_count=1,
        conflicting_count=0,
        unsupported_count=0,
        claims=[claim],
        critical_warnings=[]
    )
    assert report.confidence_score == 95.0


def test_markdown_export():
    """Verify that session export generates well-formatted markdown report."""
    session = session_store.create_session("sess_export_test", "Markdown Export Test")
    session.research = ResearchFindings(
        summary="Executive summary test",
        key_findings=["Finding 1", "Finding 2"],
        facts=[],
        sources=[]
    )
    session_store.save_session(session)

    res = client.get("/api/sessions/sess_export_test/export/markdown")
    assert res.status_code == 200
    assert "# Research Report: Markdown Export Test" in res.text
    assert "## Executive Summary" in res.text
    assert "Finding 1" in res.text


@pytest.mark.asyncio
async def test_orchestrator_unconfigured_keys_safely_halt(monkeypatch):
    """Verify pipeline halts gracefully with clear setup instructions if API keys are missing."""
    from backend.config import settings
    monkeypatch.setattr(settings, "get_setup_status", lambda: {
        "is_fully_configured": False,
        "mistral_configured": False,
        "tavily_configured": False,
        "missing_keys": ["MISTRAL_API_KEY", "TAVILY_API_KEY"],
        "setup_messages": ["Configuration required: API keys missing."]
    })
    orchestrator_inst = MultiAgentOrchestrator()
    req = ResearchRequest(query="Test query without keys")
    session = await orchestrator_inst.run_pipeline("test_sess_unconfig", req)
    
    assert session.status == "error"
    assert "Configuration required" in session.error_message or "missing" in session.error_message
    assert len(session.agent_logs) >= 1
    assert session.agent_logs[0].status == "failed"


@pytest.mark.asyncio
async def test_orchestrator_complete_five_agents_workflow(monkeypatch):
    """Verify complete 5-agent workflow execution from Browser to Action Planner."""
    from backend.config import settings
    # Temporarily pretend keys are configured for workflow validation
    monkeypatch.setattr(settings, "MISTRAL_API_KEY", "test_mistral_key_123")
    monkeypatch.setattr(settings, "TAVILY_API_KEY", "test_tavily_key_123")
    monkeypatch.setattr(settings, "get_setup_status", lambda: {
        "is_fully_configured": True,
        "mistral_configured": True,
        "tavily_configured": True,
        "missing_keys": [],
        "setup_messages": []
    })

    # Mock BrowserAgent
    mock_doc = SourceDocument(
        url="https://supabase.com",
        title="Supabase | The Open Source Firebase Alternative",
        snippet="Supabase provides Postgres database, Authentication, instant APIs, Realtime subscriptions, and Storage.",
        domain="supabase.com"
    )
    async def mock_browser_run(*args, **kwargs):
        return [mock_doc]

    # Mock ResearchAgent
    mock_findings = ResearchFindings(
        summary="Supabase offers an open source alternative to Firebase built on Postgres.",
        key_findings=["Postgres-based", "Realtime subscriptions"],
        facts=[
            FactItem(
                fact="Supabase provides dedicated Postgres databases",
                category="Architecture",
                source_url="https://supabase.com",
                source_title="Supabase"
            )
        ],
        sources=[mock_doc]
    )
    async def mock_research_run(*args, **kwargs):
        return mock_findings

    # Mock ComparisonAgent
    mock_matrix = ComparisonMatrix(
        criteria=["Database", "Lock-in", "Realtime"],
        options=[
            ComparisonOption(
                name="Supabase",
                rank=1,
                overall_score=9.2,
                summary="Relational SQL with full ownership",
                criterion_scores={"Database": 9.5, "Lock-in": 9.0, "Realtime": 9.0},
                strengths=["PostgreSQL core", "No vendor lock-in"],
                weaknesses=["Smaller ecosystem than Google Cloud"],
                best_for="SQL-first and open source architectures"
            )
        ],
        top_pick="Supabase",
        comparison_summary="Supabase is best for relational data requirements.",
        trade_offs=["SQL relational structure vs NoSQL schemaless agility"]
    )
    async def mock_comparison_run(*args, **kwargs):
        return mock_matrix

    # Mock VerificationAgent
    mock_report = VerificationReport(
        confidence_score=94.0,
        verified_count=1,
        conflicting_count=0,
        unsupported_count=0,
        claims=[
            VerificationClaim(
                claim="Supabase uses Postgres",
                status="verified",
                confidence_level="high",
                supporting_sources=["https://supabase.com"],
                analysis="Official docs verify native Postgres backend."
            )
        ],
        critical_warnings=[]
    )
    async def mock_verification_run(*args, **kwargs):
        return mock_report

    # Mock ActionPlannerAgent
    mock_plan = ActionPlan(
        executive_recommendation="Select Supabase for relational and open source requirements.",
        next_steps=["Deploy a Supabase project instance", "Run schema migration"],
        proposed_actions=[
            ProposedAction(
                id="act_test_01",
                title="Review Supabase Quickstart",
                action_type="open_link",
                description="Opens Supabase documentation.",
                target_url="https://supabase.com/docs",
                requires_approval=True,
                status="pending"
            )
        ]
    )
    async def mock_action_run(*args, **kwargs):
        return mock_plan

    monkeypatch.setattr("backend.agents.browser_agent.BrowserAgent.run", mock_browser_run)
    monkeypatch.setattr("backend.agents.research_agent.ResearchAgent.run", mock_research_run)
    monkeypatch.setattr("backend.agents.comparison_agent.ComparisonAgent.run", mock_comparison_run)
    monkeypatch.setattr("backend.agents.verification_agent.VerificationAgent.run", mock_verification_run)
    monkeypatch.setattr("backend.agents.action_planner_agent.ActionPlannerAgent.run", mock_action_run)

    orchestrator_inst = MultiAgentOrchestrator()
    req = ResearchRequest(query="Compare Supabase vs Firebase", criteria=["Database", "Lock-in"])
    session = await orchestrator_inst.run_pipeline("test_sess_full_pipeline", req)

    assert session.status == "completed"
    assert session.research is not None
    assert session.comparison is not None
    assert session.comparison.top_pick == "Supabase"
    assert session.verification is not None
    assert session.verification.confidence_score == 94.0
    assert session.action_plan is not None
    assert len(session.action_plan.proposed_actions) == 1
    assert session.action_plan.proposed_actions[0].requires_approval is True
    assert len(session.agent_logs) >= 5


