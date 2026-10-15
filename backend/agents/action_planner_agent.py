import asyncio
import uuid
from typing import List, Optional, Callable, Dict, Any
from backend.mistral_client import MistralService
from backend.models import (
    ResearchFindings,
    ComparisonMatrix,
    VerificationReport,
    ActionPlan,
    ProposedAction
)


class ActionPlannerAgent:
    """Agent 5: Action Planner Agent
    Prepares actionable executive recommendations, step-by-step implementation roadmaps,
    and structured action drafts.
    Safety constraint: All actions strictly require explicit user approval before execution.
    Initially prepares drafts and links only; never submits forms or modifies external systems.
    """

    def __init__(self, mistral_api_key: Optional[str] = None):
        self.mistral = MistralService(mistral_api_key)

    async def run(
        self,
        query: str,
        research: ResearchFindings,
        comparison: ComparisonMatrix,
        verification: VerificationReport,
        log_callback: Optional[Callable[[str, int, Optional[Dict[str, Any]]], Any]] = None
    ) -> ActionPlan:
        """Prepare recommendations, next steps, and action drafts for user approval."""
        if log_callback:
            await self._notify(
                log_callback,
                "Action Planner synthesizing verified findings and drafting proposals...",
                90
            )

        top_pick_str = comparison.top_pick or "Recommended Option"
        sources_summary = "\n".join([f"- {s.title}: {s.url}" for s in research.sources[:6]])
        warnings_str = "\n".join([f"- Warning: {w}" for w in verification.critical_warnings])

        system_prompt = (
            "You are an expert Action Planner Agent in a multi-agent AI system. "
            "Your objective is to translate complex research into an authoritative executive decision "
            "and prepare concrete, safe action items that require explicit user review and approval.\n\n"
            "SAFETY AND ACTION CONSTRAINTS:\n"
            "1. You NEVER execute real-world mutations autonomously. You ONLY prepare inspectable drafts and safe navigation targets.\n"
            "2. Action types supported:\n"
            "   - 'open_link': Open official documentation, GitHub repo, or pricing portal for user review.\n"
            "   - 'draft_message': Ready-to-use email/memo/slack draft to send to team or vendor.\n"
            "   - 'export_markdown': Complete structured markdown report draft for download.\n"
            "   - 'copy_summary': Compact 2-paragraph decision summary for stakeholder sign-off.\n"
            "3. Every proposed action MUST have requires_approval: true.\n"
            "4. Output MUST be valid JSON matching this schema:\n"
            "{\n"
            '  "executive_recommendation": "Decisive, detailed recommendation explaining why top_pick was chosen and how to move forward.",\n'
            '  "next_steps": [\n'
            '    "Step 1: ...",\n'
            '    "Step 2: ...",\n'
            '    "Step 3: ..."\n'
            '  ],\n'
            '  "proposed_actions": [\n'
            '    {\n'
            '      "title": "Clear action title",\n'
            '      "action_type": "open_link|draft_message|export_markdown|copy_summary",\n'
            '      "description": "Clear explanation of what happens when approved",\n'
            '      "target_url": "URL if open_link, otherwise null",\n'
            '      "content_draft": "Full text or message draft to be reviewed, otherwise null"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"Research Query: {query}\n"
            f"Evaluated Winner: {top_pick_str}\n"
            f"Comparison Trade-offs: {', '.join(comparison.trade_offs)}\n"
            f"Verification Confidence: {verification.confidence_score:.1f}%\n"
            f"Verification Caveats:\n{warnings_str or 'None'}\n\n"
            f"Verified Web Sources:\n{sources_summary}\n\n"
            f"Formulate the executive recommendation and prepare 3 to 4 concrete action drafts for user approval."
        )

        try:
            data = await self.mistral.chat_json(system_prompt, user_prompt, temperature=0.2)
        except Exception as e:
            if log_callback:
                await self._notify(log_callback, f"Action Planner fallback: {str(e)[:100]}", 92)
            first_url = research.sources[0].url if research.sources else "https://google.com"
            data = {
                "executive_recommendation": f"Based on research and cross-verified analysis, proceed with {top_pick_str}.",
                "next_steps": [
                    f"Review official documentation for {top_pick_str}",
                    "Perform a quick proof-of-concept benchmark",
                    "Align requirements with team stakeholders"
                ],
                "proposed_actions": [
                    {
                        "title": f"Review {top_pick_str} Official Documentation",
                        "action_type": "open_link",
                        "description": "Opens verified official portal in a new browser tab for direct inspection.",
                        "target_url": first_url,
                        "content_draft": None
                    },
                    {
                        "title": "Draft Stakeholder Migration Memo",
                        "action_type": "draft_message",
                        "description": "Pre-formatted memo draft detailing decision rationale and expected trade-offs.",
                        "target_url": None,
                        "content_draft": f"Subject: Evaluation Summary - {query}\n\nTeam,\n\nFollowing our multi-agent web research, we recommend selecting {top_pick_str}. Confidence score is {verification.confidence_score:.0f}%."
                    },
                    {
                        "title": "Copy Executive Summary to Clipboard",
                        "action_type": "copy_summary",
                        "description": "Copies verified decision brief to system clipboard for quick pasting.",
                        "target_url": None,
                        "content_draft": f"Recommendation: {top_pick_str}\n\nSummary: {research.summary[:300]}"
                    }
                ]
            }

        # Build structured Pydantic ProposedAction objects with unique IDs
        actions: List[ProposedAction] = []
        for raw_act in data.get("proposed_actions", []):
            act_id = f"act_{uuid.uuid4().hex[:8]}"
            target_url = raw_act.get("target_url")
            # If open_link has no target_url or invalid, pick from sources
            if raw_act.get("action_type") == "open_link" and (not target_url or not target_url.startswith("http")):
                target_url = research.sources[0].url if research.sources else "https://google.com"

            actions.append(
                ProposedAction(
                    id=act_id,
                    title=raw_act.get("title", "Proposed Action"),
                    action_type=raw_act.get("action_type", "copy_summary"),
                    description=raw_act.get("description", "Requires user approval."),
                    target_url=target_url,
                    content_draft=raw_act.get("content_draft"),
                    requires_approval=True,
                    status="pending"
                )
            )

        plan = ActionPlan(
            executive_recommendation=data.get("executive_recommendation", f"Proceed with {top_pick_str}."),
            next_steps=data.get("next_steps", []),
            proposed_actions=actions
        )

        if log_callback:
            await self._notify(
                log_callback,
                f"Action Planner Agent ready with {len(actions)} actions awaiting your approval",
                100,
                {"actions_count": len(actions)}
            )

        return plan

    async def _notify(self, callback: Callable, msg: str, progress: int, data: Optional[Dict[str, Any]] = None):
        res = callback(msg, progress, data)
        if asyncio.iscoroutine(res):
            await res
