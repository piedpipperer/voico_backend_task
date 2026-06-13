import math
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import update
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.modules.calls.schema import Call, CallLabel, CallSortBy, CallStatus, SortOrder


class CallRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, call_id: uuid.UUID) -> Optional[Call]:
        result = await self.session.exec(select(Call).where(Call.id == call_id))
        return result.first()

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
    ) -> tuple[list[Call], int, int, dict[str, int]]:
        query = self._apply_filters(
            select(Call),
            status=status,
            caller_name=caller_name,
            phone_number=phone_number,
            label=label,
            min_duration_seconds=min_duration_seconds,
            max_duration_seconds=max_duration_seconds,
        )
        count_query = self._apply_filters(
            select(func.count()).select_from(Call),
            status=status,
            caller_name=caller_name,
            phone_number=phone_number,
            label=label,
            min_duration_seconds=min_duration_seconds,
            max_duration_seconds=max_duration_seconds,
        )

        count_result = await self.session.exec(count_query)
        total = count_result.one()

        counts: dict[str, int] = {}
        for s in CallStatus:
            c = (
                await self.session.exec(
                    self._apply_filters(
                        select(func.count()).select_from(Call),
                        status=s,
                        caller_name=caller_name,
                        phone_number=phone_number,
                        label=label,
                        min_duration_seconds=min_duration_seconds,
                        max_duration_seconds=max_duration_seconds,
                    )
                )
            ).one()
            counts[s.value] = c

        offset = (page - 1) * page_size
        query = (
            query.order_by(self._build_sort_expression(sort_by, sort_order), Call.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )  # type: ignore[attr-defined]
        result = await self.session.exec(query)
        calls = list(result.all())

        total_pages = math.ceil(total / page_size) if total > 0 else 1
        return calls, total, total_pages, counts

    async def update(self, call: Call) -> Call:
        call.updated_at = datetime.utcnow()
        self.session.add(call)
        await self.session.flush()
        await self.session.refresh(call)
        return call

    async def expire_stale_in_progress_calls(self, threshold_seconds: int) -> int:
        now = datetime.utcnow()
        stale_before = now - timedelta(seconds=threshold_seconds)

        result = await self.session.exec(
            update(Call)
            .where(Call.status == CallStatus.in_progress)
            .where(Call.started_at < stale_before)
            .values(status=CallStatus.failed, updated_at=now)
        )
        return result.rowcount or 0

    def _apply_filters(
        self,
        query,
        *,
        status: Optional[CallStatus],
        caller_name: Optional[str],
        phone_number: Optional[str],
        label: Optional[CallLabel],
        min_duration_seconds: Optional[int],
        max_duration_seconds: Optional[int],
    ):
        if status is not None:
            query = query.where(Call.status == status)
        if caller_name:
            query = query.where(Call.caller_name.ilike(f"%{caller_name}%"))
        if phone_number:
            query = query.where(Call.phone_number.ilike(f"%{phone_number}%"))
        if label is not None:
            query = query.where(Call.label == label)
        if min_duration_seconds is not None:
            query = query.where(Call.duration_seconds >= min_duration_seconds)
        if max_duration_seconds is not None:
            query = query.where(Call.duration_seconds <= max_duration_seconds)

        return query

    def _build_sort_expression(
        self,
        sort_by: Optional[CallSortBy],
        sort_order: Optional[SortOrder],
    ):
        if sort_by is None:
            return Call.created_at.desc()

        sort_column = getattr(Call, sort_by.value)
        if sort_order == SortOrder.desc:
            return sort_column.desc()
        return sort_column.asc()
