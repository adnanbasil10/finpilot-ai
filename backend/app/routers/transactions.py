"""
Transactions router – CRUD operations for user transactions.
Includes Redis caching with automatic invalidation.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    PaginatedTransactions,
)
from app.auth.dependencies import get_current_user
from app.services.cache import cache_get, cache_set, cache_invalidate_pattern

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def _cache_key(user_id: str, page: int, per_page: int, txn_type: str | None, category: str | None) -> str:
    """Build a deterministic cache key for transaction listing."""
    return f"user:{user_id}:txn:p{page}:pp{per_page}:t{txn_type or 'all'}:c{category or 'all'}"


def _invalidate_user_cache(user_id: str) -> None:
    """Invalidate all cached transaction data for a user."""
    cache_invalidate_pattern(f"user:{user_id}:txn:*")
    cache_invalidate_pattern(f"user:{user_id}:budgets:*")


@router.get("", response_model=PaginatedTransactions)
def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    type: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List transactions with pagination, filtering, and Redis caching."""
    key = _cache_key(current_user.id, page, per_page, type, category)

    # Try cache first
    cached = cache_get(key)
    if cached is not None:
        return PaginatedTransactions(**cached)

    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)

    total = query.count()
    transactions = (
        query.order_by(Transaction.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    result = PaginatedTransactions(
        items=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )

    # Cache the result for 5 minutes
    cache_set(key, result.model_dump(), ttl=300)

    return result


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new transaction and invalidate related caches."""
    txn = Transaction(
        user_id=current_user.id,
        amount=payload.amount,
        type=payload.type,
        category=payload.category,
        description=payload.description,
        date=payload.date,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    _invalidate_user_cache(current_user.id)
    return txn


@router.put("/{txn_id}", response_model=TransactionResponse)
def update_transaction(
    txn_id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a transaction and invalidate related caches."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == txn_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(txn, key, val)

    db.commit()
    db.refresh(txn)

    _invalidate_user_cache(current_user.id)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    txn_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a transaction and invalidate related caches."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == txn_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    db.delete(txn)
    db.commit()

    _invalidate_user_cache(current_user.id)
