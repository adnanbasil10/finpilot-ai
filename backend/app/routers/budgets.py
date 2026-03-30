"""
Budgets router – create and list monthly category budgets.
Includes Redis caching and optimized single-query spending calculation.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.schemas.budget import BudgetCreate, BudgetResponse
from app.auth.dependencies import get_current_user
from app.services.cache import cache_get, cache_set, cache_invalidate_pattern

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def _cache_key(user_id: str, month: int, year: int) -> str:
    return f"user:{user_id}:budgets:{year}-{month}"


@router.get("", response_model=list[BudgetResponse])
def list_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List budgets with calculated spending using a single optimized query."""
    key = _cache_key(current_user.id, month, year)

    # Try cache first
    cached = cache_get(key)
    if cached is not None:
        return [BudgetResponse(**b) for b in cached]

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.month == month,
            Budget.year == year,
        )
        .all()
    )

    if not budgets:
        cache_set(key, [], ttl=300)
        return []

    # ── Optimized: single query for ALL category spending ────────
    categories = [b.category for b in budgets]
    spending_rows = (
        db.query(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
        )
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == "expense",
            Transaction.category.in_(categories),
            func.extract("month", Transaction.date) == month,
            func.extract("year", Transaction.date) == year,
        )
        .group_by(Transaction.category)
        .all()
    )

    spending_map = {row.category: float(row.spent) for row in spending_rows}

    results = [
        BudgetResponse(
            id=b.id,
            category=b.category,
            limit_amount=b.limit_amount,
            month=b.month,
            year=b.year,
            spent=spending_map.get(b.category, 0.0),
        )
        for b in budgets
    ]

    # Cache for 5 minutes
    cache_set(key, [r.model_dump() for r in results], ttl=300)

    return results


@router.post("", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a budget for a category/month/year."""
    existing = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.category == payload.category,
            Budget.month == payload.month,
            Budget.year == payload.year,
        )
        .first()
    )

    if existing:
        existing.limit_amount = payload.limit_amount
        db.commit()
        db.refresh(existing)
        budget = existing
    else:
        budget = Budget(
            user_id=current_user.id,
            category=payload.category,
            limit_amount=payload.limit_amount,
            month=payload.month,
            year=payload.year,
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)

    # Invalidate budget cache for this period
    cache_invalidate_pattern(f"user:{current_user.id}:budgets:*")

    return BudgetResponse(
        id=budget.id,
        category=budget.category,
        limit_amount=budget.limit_amount,
        month=budget.month,
        year=budget.year,
        spent=0.0,
    )
