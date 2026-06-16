import asyncio
import logging

from app.core.config import settings
from app.core.db import async_session
from app.modules.calls.repository import CallRepository

logger = logging.getLogger(__name__)


async def expire_stale_calls_once() -> int:
    async with async_session() as session:
        repository = CallRepository(session)
        expired_count = await repository.expire_stale_in_progress_calls(
            threshold_seconds=settings.stale_call_threshold_seconds
        )
        await session.commit()

    logger.info(
        "Stale call expiry run completed: expired=%s threshold_seconds=%s",
        expired_count,
        settings.stale_call_threshold_seconds,
    )
    return expired_count


async def run_stale_call_expiry_loop() -> None:
    while True:
        try:
            await expire_stale_calls_once()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Stale call expiry run failed")

        await asyncio.sleep(settings.stale_call_check_interval_seconds)
