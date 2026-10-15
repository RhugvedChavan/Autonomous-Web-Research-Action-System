import json
import re
from typing import List, Dict, Any, Optional
import httpx

from backend.config import settings


class MistralService:
    """Robust client wrapper for Mistral AI API with JSON parsing and fallback support."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MISTRAL_API_KEY

    def _validate_key(self):
        if not self.api_key or self.api_key == "your_mistral_api_key_here":
            raise ValueError(
                "Mistral AI API key is missing. Please set MISTRAL_API_KEY in backend/.env "
                "(get a free key at https://console.mistral.ai/)"
            )

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        json_output: bool = True
    ) -> str:
        """Call Mistral chat completions endpoint with error resilience."""
        self._validate_key()

        url = "https://api.mistral.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": settings.MISTRAL_MODEL,
            "messages": messages,
            "temperature": temperature,
        }

        if json_output:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=settings.API_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 401:
                    raise ValueError("Invalid Mistral API key. Please check MISTRAL_API_KEY in backend/.env")
                if response.status_code == 429:
                    raise RuntimeError("Mistral AI rate limit exceeded. Please wait a moment or check your credits.")
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"Mistral AI API error ({exc.response.status_code}): {exc.response.text}") from exc
            except httpx.RequestError as exc:
                raise RuntimeError(f"Unable to connect to Mistral AI API: {str(exc)}") from exc

        try:
            content = data["choices"][0]["message"]["content"]
            return content
        except (KeyError, IndexError) as exc:
            raise RuntimeError(f"Unexpected response structure from Mistral AI: {data}") from exc

    async def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2
    ) -> Dict[str, Any]:
        """Convenience method for prompting Mistral and parsing strict JSON response."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        raw_text = await self.chat_completion(messages, temperature=temperature, json_output=True)
        return self.clean_and_parse_json(raw_text)

    @staticmethod
    def clean_and_parse_json(text: str) -> Dict[str, Any]:
        """Clean markdown fences and parse json string."""
        cleaned = text.strip()
        # Remove ```json ... ``` wrapper if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            # Attempt to locate first { and last }
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass
            raise RuntimeError(f"Failed to parse JSON response from Mistral AI: {str(exc)}\nRaw: {text[:250]}")
