import math
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.modules.calls.schema import Call, CallStatus


class CallRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, call_id: uuid.UUID) -> Optional[Call]:
        result = await self.session.exec(select(Call).where(Call.id == call_id))
        return result.first()

    async def list_calls(
        self,
        status: Optional[CallStatus],
        page: int,
        page_size: int,
    ) -> tuple[list[Call], int, int, dict[str, int]]:
        query = select(Call)
        count_query = select(func.count()).select_from(Call)

        if status is not None:
            query = query.where(Call.status == status)
            count_query = count_query.where(Call.status == status)

        count_result = await self.session.exec(count_query)
        total = count_result.one()

        counts: dict[str, int] = {}
        for s in CallStatus:
            c = (
                await self.session.exec(
                    select(func.count()).select_from(Call).where(Call.status == s)
                )
            ).one()
            counts[s.value] = c

        offset = (page - 1) * page_size
        query = query.order_by(Call.created_at.desc()).offset(offset).limit(page_size)  # type: ignore[attr-defined]
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
