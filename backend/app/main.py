"""
FinPilot AI – FastAPI application entry point.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.redis import get_redis_client, close_redis, redis_health_check
from app.auth.router import router as auth_router
from app.routers.transactions import router as transactions_router
from app.routers.budgets import router as budgets_router
from app.routers.insights import router as insights_router

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting…")
    # Warm up Redis connection pool
    try:
        get_redis_client()
        logger.info("✅ Redis connection established")
    except Exception as e:
        logger.warning(f"⚠️  Redis not available: {e}")
    yield
    # Shutdown
    close_redis()
    logger.info("👋 Shutting down…")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Personal Finance Platform",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(transactions_router)
app.include_router(budgets_router)
app.include_router(insights_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Deep health check – validates connectivity to PostgreSQL and Redis.
    Used by Docker HEALTHCHECK and Kubernetes liveness/readiness probes.
    """
    from app.database import engine

    checks = {"database": False, "redis": False}

    # ── Database check ───────────────────────────────────────────
    try:
        with engine.connect() as conn:
            conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            checks["database"] = True
    except Exception:
        pass

    # ── Redis check ──────────────────────────────────────────────
    checks["redis"] = redis_health_check()

    all_healthy = all(checks.values())

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content={
            "status": "healthy" if all_healthy else "degraded",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "checks": checks,
        },
    )
