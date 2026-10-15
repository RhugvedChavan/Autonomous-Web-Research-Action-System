from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class AgentName(str, Enum):
    BROWSER = "Browser Agent"
    RESEARCH = "Research Agent"
    COMPARISON = "Comparison Agent"
    VERIFICATION = "Verification Agent"
    ACTION_PLANNER = "Action Planner Agent"


class ResearchRequest(BaseModel):
    """User input request for autonomous web research."""
    query: str = Field(..., min_length=3, description="The research question or topic")
    criteria: List[str] = Field(default_factory=list, description="Optional custom comparison criteria")
    depth: str = Field(default="balanced", description="Search depth: 'quick', 'balanced', or 'deep'")
    max_sources: int = Field(default=5, ge=1, le=10, description="Max source pages to evaluate")


class SourceDocument(BaseModel):
    """A web source document retrieved by the Browser Agent."""
    url: str
    title: str
    snippet: str
    domain: str
    scraped_content: Optional[str] = None
    scrape_method: str = "tavily"  # "tavily", "playwright", "fallback"
    success: bool = True
    error: Optional[str] = None


class FactItem(BaseModel):
    """Extracted fact with direct source attribution."""
    fact: str
    category: str = "Overview"
    source_url: str
    source_title: str
    context_snippet: Optional[str] = None


class ResearchFindings(BaseModel):
    """Structured output from the Research Agent."""
    summary: str
    key_findings: List[str] = Field(default_factory=list)
    facts: List[FactItem] = Field(default_factory=list)
    sources: List[SourceDocument] = Field(default_factory=list)


class ComparisonOption(BaseModel):
    """Evaluated option/entity in the comparison matrix."""
    name: str
    rank: int = 1
    overall_score: float = 8.0  # Out of 10
    summary: str = ""
    criterion_scores: Dict[str, float] = Field(default_factory=dict)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    best_for: str = ""


class ComparisonMatrix(BaseModel):
    """Structured output from the Comparison Agent."""
    criteria: List[str] = Field(default_factory=list)
    options: List[ComparisonOption] = Field(default_factory=list)
    top_pick: str = ""
    comparison_summary: str = ""
    trade_offs: List[str] = Field(default_factory=list)


class VerificationClaim(BaseModel):
    """Individual claim assessed for accuracy and consensus."""
    claim: str
    status: str = "verified"  # "verified", "conflicting", "unsupported", "partially_verified"
    confidence_level: str = "high"  # "high", "medium", "low"
    supporting_sources: List[str] = Field(default_factory=list)
    conflicting_sources: List[str] = Field(default_factory=list)
    analysis: str = ""


class VerificationReport(BaseModel):
    """Structured output from the Verification Agent."""
    confidence_score: float = 85.0  # 0 to 100
    verified_count: int = 0
    conflicting_count: int = 0
    unsupported_count: int = 0
    claims: List[VerificationClaim] = Field(default_factory=list)
    critical_warnings: List[str] = Field(default_factory=list)


class ProposedAction(BaseModel):
    """Action item prepared by the Action Planner Agent requiring user approval."""
    id: str
    title: str
    action_type: str  # "open_link", "draft_message", "export_markdown", "copy_summary", "calendar_entry"
    description: str
    target_url: Optional[str] = None
    content_draft: Optional[str] = None
    requires_approval: bool = True
    status: str = "pending"  # "pending", "approved", "rejected", "executed"
    executed_at: Optional[str] = None
    execution_result: Optional[str] = None


class ActionPlan(BaseModel):
    """Structured output from the Action Planner Agent."""
    executive_recommendation: str
    next_steps: List[str] = Field(default_factory=list)
    proposed_actions: List[ProposedAction] = Field(default_factory=list)


class AgentStepEvent(BaseModel):
    """Live streaming event emitted during agent orchestration."""
    agent: str  # "Browser Agent", "Research Agent", etc.
    status: str  # "pending", "running", "completed", "failed"
    message: str
    progress: int = 0  # 0 to 100
    timestamp: str
    data: Optional[Dict[str, Any]] = None


class ResearchSession(BaseModel):
    """In-memory research session tracking complete state and logs."""
    session_id: str
    query: str
    criteria: List[str] = Field(default_factory=list)
    depth: str = "balanced"
    created_at: str
    updated_at: str
    status: str = "running"  # "running", "completed", "error"
    error_message: Optional[str] = None
    agent_logs: List[AgentStepEvent] = Field(default_factory=list)
    sources: List[SourceDocument] = Field(default_factory=list)
    research: Optional[ResearchFindings] = None
    comparison: Optional[ComparisonMatrix] = None
    verification: Optional[VerificationReport] = None
    action_plan: Optional[ActionPlan] = None


class ActionDecisionRequest(BaseModel):
    """User decision payload to approve or reject a proposed action."""
    decision: str = Field(..., pattern="^(approve|reject)$")
