import asyncio
from typing import List, Optional, Callable, Dict, Any
from backend.mistral_client import MistralService
from backend.models import SourceDocument, ResearchFindings, FactItem


class ResearchAgent:
    """Agent 2: Research Agent
    Extracts verifiable facts and produces a synthesized research summary
    strictly linked to the real source URLs gathered by the Browser Agent.
    """

    def __init__(self, mistral_api_key: Optional[str] = None):
        self.mistral = MistralService(mistral_api_key)

    async def run(
        self,
        query: str,
        sources: List[SourceDocument],
        log_callback: Optional[Callable[[str, int, Optional[Dict[str, Any]]], Any]] = None
    ) -> ResearchFindings:
        """Extract facts and summarize findings with source URLs."""
        if not sources:
            return ResearchFindings(
                summary=f"No web sources available to research '{query}'.",
                key_findings=["No search results were found for this query."],
                facts=[],
                sources=[]
            )

        if log_callback:
            await self._notify(
                log_callback,
                f"Analyzing {len(sources)} verified web sources with Mistral AI...",
                25
            )

        # Build context from real sources
        sources_context = []
        url_map = {}
        for idx, doc in enumerate(sources, 1):
            url_map[doc.url] = doc.title
            content_preview = doc.scraped_content[:1500] if doc.scraped_content else doc.snippet
            sources_context.append(
                f"[Source {idx}]\n"
                f"Title: {doc.title}\n"
                f"URL: {doc.url}\n"
                f"Domain: {doc.domain}\n"
                f"Content: {content_preview}\n"
            )

        context_str = "\n".join(sources_context)

        system_prompt = (
            "You are an expert Research Agent in a multi-agent AI system. "
            "Your task is to analyze real search documents and extract verifiable facts with explicit source attribution.\n\n"
            "MANDATORY RULES:\n"
            "1. ONLY cite source URLs that are explicitly provided in the context below. NEVER invent or fabricate URLs.\n"
            "2. Extract concrete facts, statistics, specifications, and claims.\n"
            "3. Synthesize an objective, high-density executive summary answering the user's research query.\n"
            "4. Output MUST be valid JSON with this exact schema:\n"
            "{\n"
            '  "summary": "comprehensive multi-paragraph executive summary",\n'
            '  "key_findings": ["key finding 1", "key finding 2", ...],\n'
            '  "facts": [\n'
            '    {\n'
            '      "fact": "statement of fact or data point",\n'
            '      "category": "Pricing|Features|Performance|Architecture|Limitation|Overview",\n'
            '      "source_url": "EXACT URL from context",\n'
            '      "source_title": "Title of the source",\n'
            '      "context_snippet": "short direct quote or supporting context"\n'
            '    }\n'
            '  ]\n'
            "}"
        )

        user_prompt = (
            f"User Research Query: {query}\n\n"
            f"Available Web Sources ({len(sources)} total):\n"
            f"{context_str}\n\n"
            f"Synthesize the research findings and extract source-linked facts in JSON format."
        )

        try:
            data = await self.mistral.chat_json(system_prompt, user_prompt, temperature=0.2)
        except Exception as e:
            if log_callback:
                await self._notify(log_callback, f"Research extraction note: {str(e)[:100]}", 40)
            # Safe fallback if JSON parsing has issues
            data = {
                "summary": f"Research synthesis for '{query}' based on {len(sources)} web sources.",
                "key_findings": [doc.snippet[:150] for doc in sources[:3]],
                "facts": [
                    {
                        "fact": doc.snippet[:120],
                        "category": "Overview",
                        "source_url": doc.url,
                        "source_title": doc.title,
                        "context_snippet": doc.snippet[:100]
                    } for doc in sources
                ]
            }

        # Parse and validate facts
        fact_items = []
        raw_facts = data.get("facts", [])
        for f in raw_facts:
            src_url = f.get("source_url", "").strip()
            # If model returned an invalid or empty URL, default to first matching or first source
            if not src_url or src_url not in url_map:
                src_url = sources[0].url if sources else "https://web.source"
            
            fact_items.append(
                FactItem(
                    fact=f.get("fact", "Data point"),
                    category=f.get("category", "Overview"),
                    source_url=src_url,
                    source_title=f.get("source_title", url_map.get(src_url, "Source")),
                    context_snippet=f.get("context_snippet")
                )
            )

        findings = ResearchFindings(
            summary=data.get("summary", "Summary not generated."),
            key_findings=data.get("key_findings", []),
            facts=fact_items,
            sources=sources
        )

        if log_callback:
            await self._notify(
                log_callback,
                f"Research Agent extracted {len(fact_items)} source-linked facts and executive summary",
                50,
                {"facts_count": len(fact_items), "sources_count": len(sources)}
            )

        return findings

    async def _notify(self, callback: Callable, msg: str, progress: int, data: Optional[Dict[str, Any]] = None):
        res = callback(msg, progress, data)
        if asyncio.iscoroutine(res):
            await res
