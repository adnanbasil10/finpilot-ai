"""
Redis connection module for FinPilot AI.
Provides a connection pool and dependency for FastAPI.
"""

import logging
import redis
from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ── Connection Pool ──────────────────────────────────────────────
_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    """Return the singleton Redis client, creating it on first call."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _redis_client


def close_redis() -> None:
    """Close the Redis connection pool (call on app shutdown)."""
    global _redis_client
    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


def redis_health_check() -> bool:
    """Return True if Redis is reachable."""
    try:
        client = get_redis_client()
        return client.ping()
    except Exception:
        return False
