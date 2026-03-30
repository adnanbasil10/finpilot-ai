"""
AI Insights router – triggers analysis of user spending patterns.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.insights import InsightsRequest, InsightsResponse
from app.services.ai_service import generate_spending_insights
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/insights", tags=["AI Insights"])


@router.post("/analyze", response_model=InsightsResponse)
def analyze_spending(
    payload: InsightsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Analyze spending patterns for a given month using AI."""
    transactions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            func.extract("month", Transaction.date) == payload.month,
            func.extract("year", Transaction.date) == payload.year,
        )
        .all()
    )

    transactions_data = [
        {
            "amount": t.amount,
            "type": t.type,
            "category": t.category,
            "description": t.description or "",
            "date": t.date.isoformat(),
        }
        for t in transactions
    ]

    try:
        result = generate_spending_insights(transactions_data)
        return InsightsResponse(**result)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is temporarily unavailable. Please try again later.",
        )
