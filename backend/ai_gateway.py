import json as json_lib
import logging
import os
import time
from typing import Any, Dict, Iterable, List, Optional

from openai import OpenAI


AI_PROFILE = {
    "chat": "auto",
    "cooking": "auto",
    "recipe": "auto/smart",
    "recipe_generation": "auto/smart",
    "recipe_extraction": "auto",
    "meal_planner": "auto/smart",
    "nutrition": "auto/smart",
    "vision": "auto",
    "ocr": "auto",
    "barcode": "auto",
    "coding": "auto/coding",
}


logger = logging.getLogger("foodvault.ai")


class AIGateway:
    """FoodVault's only AI gateway.

    All AI traffic must go through OmniRoute's OpenAI-compatible endpoint.
    FoodVault sends only routing models such as "auto" and "auto/smart";
    OmniRoute is responsible for provider selection and failover.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[int] = None,
        retries: int = 2,
    ):
        # Use 127.0.0.1 rather than localhost: OmniRoute listens on IPv4 only,
        # and localhost may resolve to ::1 first, causing connection errors.
        self.base_url = base_url or os.getenv("OMNIROUTE_BASE_URL", "http://127.0.0.1:20128/v1")
        self.api_key = api_key or os.getenv("OMNIROUTE_API_KEY", "")
        # OmniRoute's "auto" routing can take 30-40s on cold starts, so the
        # timeout must be well above that.
        self.timeout = timeout if timeout is not None else int(os.getenv("OMNIROUTE_TIMEOUT", "120"))
        self.retries = retries
        self.client = (
            OpenAI(api_key=self.api_key, base_url=self.base_url, timeout=self.timeout, max_retries=0)
            if self.api_key
            else None
        )
        logger.info(
            "ai_gateway_configured gateway=omniroute base_url=%s enabled=%s timeout_seconds=%s retries=%s",
            self.base_url,
            self.enabled,
            self.timeout,
            self.retries,
        )

    @property
    def enabled(self) -> bool:
        return self.client is not None

    def ping(self, timeout: float = 5.0) -> bool:
        """Cheap reachability check against OmniRoute (lists models with a short timeout)."""
        if not self.client:
            return False
        try:
            self.client.with_options(timeout=timeout).models.list()
            return True
        except Exception as exc:
            logger.warning("ai_gateway_ping_failed gateway=omniroute base_url=%s error=%r", self.base_url, exc)
            return False

    def _model_extra(self, response: Any) -> Dict[str, Any]:
        extra = getattr(response, "model_extra", None)
        return extra if isinstance(extra, dict) else {}

    def _usage_dict(self, response: Any) -> Dict[str, Any]:
        usage = getattr(response, "usage", None)
        if not usage:
            return {}
        if hasattr(usage, "model_dump"):
            return usage.model_dump()
        if isinstance(usage, dict):
            return usage
        return {
            "prompt_tokens": getattr(usage, "prompt_tokens", None),
            "completion_tokens": getattr(usage, "completion_tokens", None),
            "total_tokens": getattr(usage, "total_tokens", None),
        }

    def _metadata(self, response: Any) -> Dict[str, Any]:
        extra = self._model_extra(response)
        usage = self._usage_dict(response)

        route = extra.get("route") if isinstance(extra.get("route"), dict) else {}
        extra_usage = extra.get("usage") if isinstance(extra.get("usage"), dict) else {}

        provider = (
            getattr(response, "provider", None)
            or getattr(response, "selected_provider", None)
            or extra.get("provider")
            or extra.get("selected_provider")
            or extra.get("omniroute_provider")
            or extra.get("route_provider")
            or route.get("provider")
        )

        cost = (
            getattr(response, "cost", None)
            or extra.get("cost")
            or extra.get("total_cost")
            or extra_usage.get("cost")
        )

        return {
            "provider": provider or "unknown",
            "usage": usage,
            "cost": cost,
        }

    def _log_success(self, model: str, response: Any, latency_ms: int) -> None:
        meta = self._metadata(response)
        usage = meta["usage"]
        logger.info(
            "ai_request_success gateway=omniroute model=%s routed_model=%s provider=%s latency_ms=%s prompt_tokens=%s completion_tokens=%s total_tokens=%s cost=%s",
            model,
            getattr(response, "model", None),
            meta["provider"],
            latency_ms,
            usage.get("prompt_tokens"),
            usage.get("completion_tokens"),
            usage.get("total_tokens"),
            meta["cost"],
        )

    def _run_with_retries(self, operation_name: str, model: str, fn):
        if not self.client:
            raise RuntimeError("OmniRoute is not configured. Set OMNIROUTE_API_KEY.")

        last_error = None
        attempts = self.retries + 1
        for attempt in range(1, attempts + 1):
            start = time.perf_counter()
            try:
                response = fn()
                latency_ms = int((time.perf_counter() - start) * 1000)
                self._log_success(model, response, latency_ms)
                return response
            except Exception as exc:
                last_error = exc
                latency_ms = int((time.perf_counter() - start) * 1000)
                logger.warning(
                    "ai_request_failed gateway=omniroute operation=%s model=%s attempt=%s/%s latency_ms=%s error=%s",
                    operation_name,
                    model,
                    attempt,
                    attempts,
                    latency_ms,
                    repr(exc),
                )
                if attempt < attempts:
                    time.sleep(min(0.5 * attempt, 2.0))
        raise last_error

    def chat(
        self,
        messages: List[Dict[str, Any]],
        model: str = AI_PROFILE["chat"],
        max_tokens: int = 1500,
        temperature: Optional[float] = None,
        response_format: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> str:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            **kwargs,
        }
        if temperature is not None:
            payload["temperature"] = temperature
        if response_format is not None:
            payload["response_format"] = response_format

        response = self._run_with_retries(
            "chat",
            model,
            lambda: self.client.chat.completions.create(**payload),
        )
        return response.choices[0].message.content.strip()

    def stream(
        self,
        messages: List[Dict[str, Any]],
        model: str = AI_PROFILE["chat"],
        max_tokens: int = 1500,
        temperature: Optional[float] = None,
        **kwargs,
    ) -> Iterable[Any]:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "stream": True,
            **kwargs,
        }
        if temperature is not None:
            payload["temperature"] = temperature

        return self._run_with_retries(
            "stream",
            model,
            lambda: self.client.chat.completions.create(**payload),
        )

    def vision(
        self,
        prompt: str,
        image_url: str,
        model: str = AI_PROFILE["vision"],
        max_tokens: int = 1500,
        **kwargs,
    ) -> str:
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ]
        return self.chat(messages=messages, model=model, max_tokens=max_tokens, **kwargs)

    def embeddings(
        self,
        input: Any,
        model: str = AI_PROFILE["chat"],
        **kwargs,
    ) -> Any:
        response = self._run_with_retries(
            "embeddings",
            model,
            lambda: self.client.embeddings.create(model=model, input=input, **kwargs),
        )
        return response.data

    def reason(
        self,
        messages: List[Dict[str, Any]],
        model: str = AI_PROFILE["recipe"],
        max_tokens: int = 2000,
        **kwargs,
    ) -> str:
        return self.chat(messages=messages, model=model, max_tokens=max_tokens, **kwargs)

    def json(
        self,
        messages: List[Dict[str, Any]],
        model: str = AI_PROFILE["chat"],
        max_tokens: int = 1500,
        **kwargs,
    ) -> Any:
        content = self.chat(
            messages=messages,
            model=model,
            max_tokens=max_tokens,
            response_format={"type": "json_object"},
            **kwargs,
        )
        return json_lib.loads(content)
