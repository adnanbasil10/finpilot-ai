"""
Cache utility functions for FinPilot AI.
Provides get/set/delete helpers with JSON serialization and TTL management.
"""

import json
import logging
from typing import Any
from app.redis import get_redis_client

logger = logging.getLogger(__name__)

# Default TTL: 5 minutes
DEFAULT_TTL = 300


def cache_get(key: str) -> Any | None:
    """
    Retrieve a cached value by key.
    Returns the deserialized Python object, or None if not found / expired.
    """
    try:
        client = get_redis_client()
        data = client.get(key)
        if data is not None:
            logger.debug(f"Cache HIT: {key}")
            return json.loads(data)
        logger.debug(f"Cache MISS: {key}")
        return None
    except Exception as e:
        logger.warning(f"Cache read error for key={key}: {e}")
        return None


def cache_set(key: str, value: Any, ttl: int = DEFAULT_TTL) -> None:
    """
    Store a value in cache with the given TTL (seconds).
    The value is JSON-serialized before storage.
    """
    try:
        client = get_redis_client()
        client.setex(key, ttl, json.dumps(value, default=str))
        logger.debug(f"Cache SET: {key} (TTL={ttl}s)")
    except Exception as e:
        logger.warning(f"Cache write error for key={key}: {e}")


def cache_delete(key: str) -> None:
    """Delete a single cache entry by exact key."""
    try:
        client = get_redis_client()
        client.delete(key)
        logger.debug(f"Cache DELETE: {key}")
    except Exception as e:
        logger.warning(f"Cache delete error for key={key}: {e}")


def cache_invalidate_pattern(pattern: str) -> None:
    """
    Delete all cache entries matching a glob pattern.
    Example: cache_invalidate_pattern("user:abc:txn:*")

    Uses SCAN to avoid blocking Redis on large key spaces.
    """
    try:
        client = get_redis_client()
        cursor = 0
        deleted = 0
        while True:
            cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                client.delete(*keys)
                deleted += len(keys)
            if cursor == 0:
                break
        if deleted > 0:
            logger.debug(f"Cache INVALIDATE: {pattern} ({deleted} keys)")
    except Exception as e:
        logger.warning(f"Cache invalidation error for pattern={pattern}: {e}")
