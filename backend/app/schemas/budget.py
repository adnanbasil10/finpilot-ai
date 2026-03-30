"""Pydantic schemas for Budgets."""

from pydantic import BaseModel, Field


# ── Requests ─────────────────────────────────────────────────────
class BudgetCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    limit_amount: float = Field(..., gt=0)
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)


# ── Responses ────────────────────────────────────────────────────
class BudgetResponse(BaseModel):
    id: str
    category: str
    limit_amount: float
    month: int
    year: int
    spent: float = 0.0  # calculated field

    model_config = {"from_attributes": True}
