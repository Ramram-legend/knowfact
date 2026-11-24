"""
routes/ai_assistant.py — API endpoints for the KnowFact AI Search Assistant.

POST /api/ai/ask         — Ask natural language question to find solutions, tasks, or procedures
GET  /api/ai/suggestions — Dynamic starter prompts based on visible knowledge base entries
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ai_assistant import (
    AIAssistantRequest,
    AIAssistantResponse,
    AISuggestionsResponse,
    ask_assistant,
    get_dynamic_suggestions,
)
from auth import get_current_active_user
from database import get_db
from models import User

router = APIRouter(prefix="/api/ai", tags=["ai-assistant"])


@router.post("/ask", response_model=AIAssistantResponse)
def ask_ai_assistant(
    payload: AIAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Conversational AI search assistant that finds relevant solutions, tasks,
    and procedures and returns a grounded summary with actionable steps.
    """
    return ask_assistant(db=db, current_user=current_user, req=payload)


@router.get("/suggestions", response_model=AISuggestionsResponse)
def get_ai_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Return personalized starter prompts grounded in the visible fiches."""
    return get_dynamic_suggestions(db=db, current_user=current_user)
