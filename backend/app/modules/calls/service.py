import logging
import uuid
from typing import Optional

from fastapi import HTTPException
from fastapi import status as http_status

from app.modules.calls.ai import CallAIEnricher
from app.modules.calls.repository import CallRepository
from app.modules.calls.schema import (
    CallCounts,
    CallLabel,
    CallResponse,
    CallSortBy,
    CallStatus,
    PaginatedCallsResponse,
    SortOrder,
    UpdateCallNotesRequest,
    WebhookCallPayload,
)

logger = logging.getLogger(__name__)


class CallService:
    def __init__(self, repository: CallRepository) -> None:
        self.repository = repository
        self.ai_enricher = CallAIEnricher()

    async def list_calls(
        self,
        status: Optional[CallStatus],
        caller_name: Optional[str],
        phone_number: Optional[str],
        label: Optional[CallLabel],
        min_duration_seconds: Optional[int],
        max_duration_seconds: Optional[int],
        sort_by: Optional[CallSortBy],
        sort_order: Optional[SortOrder],
        page: int,
        page_size: int,
    ) -> PaginatedCallsResponse:
        if (
            min_duration_seconds is not None
            and max_duration_seconds is not None
            and min_duration_seconds > max_duration_seconds
        ):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="min_duration_seconds cannot be greater than max_duration_seconds",
            )

        calls, total, total_pages, counts = await self.repository.list_calls(
            status=status,
            caller_name=caller_name.strip() if caller_name else None,
            phone_number=phone_number.strip() if phone_number else None,
            label=label,
            min_duration_seconds=min_duration_seconds,
            max_duration_seconds=max_duration_seconds,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
        return PaginatedCallsResponse(
            data=[CallResponse.model_validate(c, from_attributes=True) for c in calls],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            counts=CallCounts(
                in_progress=counts.get("in_progress", 0),
                success=counts.get("success", 0),
                failed=counts.get("failed", 0),
            ),
        )

    async def get_call(self, call_id: uuid.UUID) -> CallResponse:
        call = await self.repository.get_by_id(call_id)
        if call is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Call not found"
            )
        return CallResponse.model_validate(call, from_attributes=True)

    async def update_call_notes(
        self, call_id: uuid.UUID, payload: UpdateCallNotesRequest
    ) -> CallResponse:
        call = await self.repository.get_by_id(call_id)
        if call is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Call not found"
            )

        call.notes = payload.notes
        updated_call = await self.repository.update(call)
        return CallResponse.model_validate(updated_call, from_attributes=True)

    async def process_webhook_call(self, payload: WebhookCallPayload) -> CallResponse:
        call = await self.repository.get_by_id(payload.call_id)
        if call is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="Call not found"
            )

        call.status = payload.status
        call.duration_seconds = payload.duration_seconds
        call.raw_transcript = payload.raw_transcript
        call.ended_at = payload.ended_at
        if payload.status in {CallStatus.success, CallStatus.failed}:
            call.summary = None
            call.label = None

            if payload.raw_transcript:
                enrichment = await self.ai_enricher.enrich_call(payload.raw_transcript)
                if enrichment is not None:
                    call.summary = enrichment.summary
                    call.label = enrichment.label

        updated_call = await self.repository.update(call)
        return CallResponse.model_validate(updated_call, from_attributes=True)
