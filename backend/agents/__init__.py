"""Autonomous Web Research & Action System - Multi-Agent AI Architecture
Agents:
- BrowserAgent: Web search via Tavily & deep content extraction via Playwright
- ResearchAgent: Structured fact extraction & source-linked summarization via Mistral
- ComparisonAgent: Multi-criteria evaluation, matrix generation & rankings via Mistral
- VerificationAgent: Claim cross-checking, conflict detection & confidence scoring via Mistral
- ActionPlannerAgent: Actionable recommendations & safe draft actions via Mistral
"""

from .browser_agent import BrowserAgent
from .research_agent import ResearchAgent
from .comparison_agent import ComparisonAgent
from .verification_agent import VerificationAgent
from .action_planner_agent import ActionPlannerAgent

__all__ = [
    "BrowserAgent",
    "ResearchAgent",
    "ComparisonAgent",
    "VerificationAgent",
    "ActionPlannerAgent",
]
