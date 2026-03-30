"""Pydantic schemas for Transactions."""

from datetime import date as DateType
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class TransactionType(str, Enum):
    INCOME = "income"
    EXPENSE = "expense"


# ── Requests ─────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Must be positive")
    type: TransactionType
    category: str = Field(..., min_length=1, max_length=50)
    description: str = Field("", max_length=255)
    date: DateType


class TransactionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    date: Optional[DateType] = None


# ── Responses ────────────────────────────────────────────────────
class TransactionResponse(BaseModel):
    id: str
    amount: float
    type: TransactionType
    category: str
    description: str
    date: DateType

    model_config = {"from_attributes": True, "use_enum_values": True}


class PaginatedTransactions(BaseModel):
    items: list[TransactionResponse]
    total: int
    page: int
    per_page: int
    pages: int
