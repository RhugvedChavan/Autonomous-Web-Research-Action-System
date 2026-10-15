import os
from pathlib import Path
from typing import Dict, Any, List
from dotenv import load_dotenv

# Locate and load .env from either backend directory or root directory
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
ENV_PATH_BACKEND = BASE_DIR / ".env"
ENV_PATH_ROOT = ROOT_DIR / ".env"

if ENV_PATH_ROOT.exists():
    load_dotenv(dotenv_path=ENV_PATH_ROOT, override=True)
if ENV_PATH_BACKEND.exists():
    load_dotenv(dotenv_path=ENV_PATH_BACKEND, override=True)


class Settings:
    """Application runtime configuration."""
    def __init__(self):
        self._reload()

    def _reload(self):
        if ENV_PATH_ROOT.exists():
            load_dotenv(dotenv_path=ENV_PATH_ROOT, override=True)
        if ENV_PATH_BACKEND.exists():
            load_dotenv(dotenv_path=ENV_PATH_BACKEND, override=True)
        self.MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "").strip().strip('"').strip("'")
        self.TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip().strip('"').strip("'")
        self.MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest").strip().strip('"').strip("'")
        self.PLAYWRIGHT_HEADLESS = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() in ("true", "1", "yes")
        
        try:
            self.MAX_SEARCH_RESULTS = int(os.getenv("MAX_SEARCH_RESULTS", "5"))
        except ValueError:
            self.MAX_SEARCH_RESULTS = 5

        try:
            self.API_TIMEOUT_SECONDS = int(os.getenv("API_TIMEOUT_SECONDS", "45"))
        except ValueError:
            self.API_TIMEOUT_SECONDS = 45

        try:
            self.PORT = int(os.getenv("PORT", "8000"))
        except ValueError:
            self.PORT = 8000

    @property
    def is_mistral_configured(self) -> bool:
        return bool(self.MISTRAL_API_KEY and self.MISTRAL_API_KEY != "your_mistral_api_key_here")

    @property
    def is_tavily_configured(self) -> bool:
        return bool(self.TAVILY_API_KEY and self.TAVILY_API_KEY != "your_tavily_api_key_here")

    @property
    def is_fully_configured(self) -> bool:
        return self.is_mistral_configured and self.is_tavily_configured

    def get_setup_status(self) -> Dict[str, Any]:
        """Returns safe status without leaking secret keys."""
        self._reload()
        missing = []
        messages = []

        if not self.is_mistral_configured:
            missing.append("MISTRAL_API_KEY")
            messages.append("Mistral AI API key is missing. Add MISTRAL_API_KEY to backend/.env (Sign up free at https://console.mistral.ai/)")

        if not self.is_tavily_configured:
            missing.append("TAVILY_API_KEY")
            messages.append("Tavily Search API key is missing. Add TAVILY_API_KEY to backend/.env (Get free credits at https://app.tavily.com/)")

        return {
            "is_fully_configured": self.is_fully_configured,
            "mistral_configured": self.is_mistral_configured,
            "tavily_configured": self.is_tavily_configured,
            "missing_keys": missing,
            "setup_messages": messages,
            "mistral_model": self.MISTRAL_MODEL,
            "max_search_results": self.MAX_SEARCH_RESULTS,
            "playwright_enabled": True
        }


settings = Settings()
