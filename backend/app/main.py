import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.calls.router import router as calls_router
from app.modules.calls.tasks import run_stale_call_expiry_loop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    stale_call_task = asyncio.create_task(run_stale_call_expiry_loop())
    try:
        yield
    finally:
        stale_call_task.cancel()
        with suppress(asyncio.CancelledError):
            await stale_call_task


app = FastAPI(
    title=settings.app_name,
    description="Backend API for the Voico Calls Dashboard",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calls_router, prefix="/api")


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}
