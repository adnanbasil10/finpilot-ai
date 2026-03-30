"""
AI-powered financial insights service using OpenRouter API.
Uses the OpenAI-compatible SDK to generate spending analysis and recommendations.
"""

import json
import logging
from openai import OpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_ai_client() -> OpenAI:
    """Initialize the OpenRouter-compatible OpenAI client."""
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.OPENROUTER_API_KEY,
    )


def generate_spending_insights(transactions_data: list[dict]) -> dict:
    """
    Analyze user transactions and return structured financial insights.

    Args:
        transactions_data: List of transaction dicts with amount, type, category, date.

    Returns:
        Dict with 'summary', 'highlights', and 'recommendations'.
    """
    if not transactions_data:
        return {
            "summary": "No transactions found for this period.",
            "highlights": [],
            "recommendations": ["Start tracking your income and expenses to get personalized insights."],
        }

    # Build a concise data summary for the prompt
    total_income = sum(t["amount"] for t in transactions_data if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions_data if t["type"] == "expense")

    category_spending: dict[str, float] = {}
    for t in transactions_data:
        if t["type"] == "expense":
            category_spending[t["category"]] = (
                category_spending.get(t["category"], 0) + t["amount"]
            )

    prompt = f"""You are a professional financial advisor AI. Analyze the following personal finance data and provide actionable insights.

## Financial Data (Monthly)
- Total Income: ${total_income:,.2f}
- Total Expenses: ${total_expense:,.2f}
- Net Savings: ${total_income - total_expense:,.2f}
- Savings Rate: {((total_income - total_expense) / total_income * 100) if total_income > 0 else 0:.1f}%

## Spending by Category:
{json.dumps(category_spending, indent=2)}

## Transaction Count: {len(transactions_data)}

---

Respond in valid JSON with exactly this structure:
{{
  "summary": "A 2-3 sentence overview of their financial health this month.",
  "highlights": ["3-5 key observations about their spending patterns"],
  "recommendations": ["3-5 specific, actionable recommendations to improve finances"]
}}

Be specific. Reference actual numbers. Be encouraging but honest."""

    content = ""
    try:
        client = get_ai_client()
        response = client.chat.completions.create(
            model=settings.OPENROUTER_MODEL,
            messages=[
                {"role": "system", "content": "You are FinPilot AI, an expert financial advisor. Always respond with valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=1000,
            timeout=30,
        )

        raw = response.choices[0].message.content
        if not raw:
            raise ValueError("AI returned empty response")
        content = raw.strip()

        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3].strip()
        if content.startswith("json"):
            content = content[4:].strip()

        result = json.loads(content)
        return {
            "summary": result.get("summary", "Analysis complete."),
            "highlights": result.get("highlights", []),
            "recommendations": result.get("recommendations", []),
        }

    except json.JSONDecodeError:
        logger.warning("AI returned non-JSON response, using raw text")
        return {
            "summary": content or "Analysis could not be completed.",
            "highlights": [],
            "recommendations": [],
        }
    except Exception as e:
        logger.error(f"AI service error: {e}")
        return {
            "summary": "AI analysis is temporarily unavailable. Please try again later.",
            "highlights": [],
            "recommendations": ["Ensure your OpenRouter API key is configured correctly."],
        }
