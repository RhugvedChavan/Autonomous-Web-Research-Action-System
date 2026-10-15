import asyncio
import re
from typing import List, Optional, Callable, Dict, Any
from urllib.parse import urlparse
import httpx

from backend.config import settings
from backend.models import SourceDocument

try:
    from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class BrowserAgent:
    """Agent 1: Browser Agent
    Responsible for executing real-time web searches using the Tavily API and
    deep browser scraping of critical pages using Playwright.
    Never fabricates sources or simulates browsing without actual execution.
    """

    def __init__(self, tavily_api_key: Optional[str] = None):
        self.api_key = tavily_api_key or settings.TAVILY_API_KEY

    async def run(
        self,
        query: str,
        depth: str = "balanced",
        max_results: int = 5,
        log_callback: Optional[Callable[[str, int, Optional[Dict[str, Any]]], Any]] = None
    ) -> List[SourceDocument]:
        """Search websites and collect verified web content."""
        if not self.api_key or self.api_key == "your_tavily_api_key_here":
            raise ValueError(
                "Tavily Search API key is missing. Please set TAVILY_API_KEY in backend/.env "
                "(get a free API key at https://app.tavily.com/)"
            )

        if not query or not query.strip():
            raise ValueError("Research query cannot be empty.")

        query_clean = query.strip()

        if log_callback:
            await self._notify(log_callback, f"Initiating web search for: '{query_clean}'", 15)

        # 1. Search via Tavily REST API
        documents = await self._search_tavily(query_clean, depth=depth, max_results=max_results)

        if not documents:
            if log_callback:
                await self._notify(log_callback, "No web search results returned for query", 30)
            return []

        if log_callback:
            await self._notify(
                log_callback,
                f"Discovered {len(documents)} real web sources. Analyzing content...",
                40,
                {"found_count": len(documents), "sources": [d.url for d in documents]}
            )

        # 2. If depth is 'balanced' or 'deep' and Playwright is available, perform browser scraping on top links
        if depth in ("balanced", "deep") and PLAYWRIGHT_AVAILABLE and documents:
            pages_to_scrape = min(2 if depth == "balanced" else 3, len(documents))
            for i in range(pages_to_scrape):
                doc = documents[i]
                if log_callback:
                    await self._notify(
                        log_callback,
                        f"Opening browser to extract deep content from {doc.domain}...",
                        40 + int((i + 1) * (20 / pages_to_scrape)),
                        {"url": doc.url, "domain": doc.domain}
                    )
                scraped_text, err = await self._scrape_with_playwright(doc.url)
                if scraped_text:
                    doc.scraped_content = scraped_text[:3500]
                    doc.scrape_method = "playwright"
                elif err:
                    doc.error = f"Browser scrape notice: {err}"

        if log_callback:
            await self._notify(log_callback, f"Browser Agent completed data collection from {len(documents)} sources", 60)

        return documents

    async def _search_tavily(self, query: str, depth: str, max_results: int) -> List[SourceDocument]:
        """Perform search against Tavily API with timeout and rate limit resilience."""
        search_depth = "advanced" if depth == "deep" else "basic"
        url = "https://api.tavily.com/search"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": search_depth,
            "include_answer": True,
            "include_raw_content": depth == "deep",
            "max_results": max(1, min(max_results, 10))
        }

        async with httpx.AsyncClient(timeout=settings.API_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(url, json=payload)
                if response.status_code == 401:
                    raise ValueError("Invalid Tavily API key. Please check TAVILY_API_KEY in backend/.env")
                if response.status_code == 429:
                    raise RuntimeError("Tavily API rate limit exceeded. Please wait a moment or check your credits.")
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"Tavily search API error ({exc.response.status_code}): {exc.response.text}") from exc
            except httpx.RequestError as exc:
                raise RuntimeError(f"Unable to connect to Tavily search service: {str(exc)}") from exc

        raw_results = data.get("results", [])
        documents: List[SourceDocument] = []

        for item in raw_results:
            source_url = item.get("url", "").strip()
            if not source_url:
                continue

            parsed = urlparse(source_url)
            domain = parsed.netloc.replace("www.", "") or "web"
            title = item.get("title", "").strip() or domain
            content = item.get("content", "").strip()
            raw_content = item.get("raw_content", "")

            # Filter out generic empty snippets
            snippet = content if content else (raw_content[:400] if raw_content else "No preview available")

            documents.append(
                SourceDocument(
                    url=source_url,
                    title=title,
                    snippet=snippet[:500],
                    domain=domain,
                    scraped_content=raw_content[:2500] if raw_content else None,
                    scrape_method="tavily",
                    success=True
                )
            )

        return documents

    async def _scrape_with_playwright(self, url: str) -> tuple[Optional[str], Optional[str]]:
        """Safely fetch and clean full readable page content using Playwright headless browser."""
        if not PLAYWRIGHT_AVAILABLE:
            return None, "Playwright is not available in environment"

        browser = None
        playwright = None
        try:
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(
                headless=settings.PLAYWRIGHT_HEADLESS,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
            page = await context.new_page()

            # Navigate with strict timeout to prevent hung requests
            await page.goto(url, wait_until="domcontentloaded", timeout=10000)
            await asyncio.sleep(0.5)

            # Extract body text without scripts, styles, svgs
            text = await page.evaluate("""
                () => {
                    const clone = document.body.cloneNode(true);
                    const removeSelectors = ['script', 'style', 'noscript', 'svg', 'iframe', 'nav', 'footer', 'header', '.ad', '.ads'];
                    removeSelectors.forEach(sel => {
                        clone.querySelectorAll(sel).forEach(el => el.remove());
                    });
                    return clone.innerText || clone.textContent || '';
                }
            """)

            cleaned = re.sub(r'\s+', ' ', text).strip()
            return cleaned, None

        except PlaywrightTimeoutError:
            return None, "Browser navigation timed out after 10s (using search snippet)"
        except Exception as e:
            return None, f"Browser extract skipped: {str(e)[:120]}"
        finally:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
            if playwright:
                try:
                    await playwright.stop()
                except Exception:
                    pass

    async def _notify(self, callback: Callable, msg: str, progress: int, data: Optional[Dict[str, Any]] = None):
        res = callback(msg, progress, data)
        if asyncio.iscoroutine(res):
            await res
