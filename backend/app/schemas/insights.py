"""Pydantic schemas for AI Insights."""

from pydantic import BaseModel, Field


class InsightsRequest(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)


class InsightsResponse(BaseModel):
    summary: str
    highlights: list[str]
    recommendations: list[str]
