import logging
from typing import Optional

from openai import AsyncOpenAI
from pydantic import BaseModel

from app.core.config import settings
from app.modules.calls.schema import CallLabel

logger = logging.getLogger(__name__)


class CallEnrichmentResult(BaseModel):
    summary: str
    label: CallLabel


class CallAIEnricher:
    def __init__(self) -> None:
        self.client: Optional[AsyncOpenAI] = None
        if settings.openai_api_key:
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def enrich_call(self, raw_transcript: str) -> Optional[CallEnrichmentResult]:
        if self.client is None:
            logger.warning("Skipping call AI enrichment because OPENAI_API_KEY is not configured")
            return None

        try:
            response = await self.client.responses.parse(
                model="gpt-4o-mini",
                temperature=0.2,
                input=[
                    {
                        "role": "system",
                        "content": (
                            "You classify and summarize phone calls for a CRM. "
                            "Return a concise 2-3 sentence summary and exactly one label. "
                            "Use only these labels: Sales inquiry, Support, Complaint, "
                            "Appointment, Follow-up, Other."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Transcript:\n{raw_transcript}",
                    },
                ],
                text_format=CallEnrichmentResult,
            )
        except Exception:
            logger.exception("OpenAI call enrichment request failed")
            return None

        for output in response.output:
            if output.type != "message":
                continue

            for item in output.content:
                parsed = getattr(item, "parsed", None)
                if parsed is not None:
                    return parsed

                refusal = getattr(item, "refusal", None)
                if refusal:
                    logger.warning("OpenAI refused call enrichment request: %s", refusal)
                    return None

        logger.warning("OpenAI call enrichment returned no parsed output")
        return None
