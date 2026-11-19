from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import MessageCreate, ChatResponse, ChatSessionResponse, MessageResponse
from app.security import get_current_user
from app.sentiment import analyze_sentiment
from app.config import settings
import app.models as models

router = APIRouter()

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are MindEase, a compassionate and empathetic AI mental health companion.
Your role is to:
- Listen actively and validate feelings without judgment
- Provide evidence-based coping strategies (breathing exercises, grounding techniques, journaling prompts)
- Encourage professional help when the user shows signs of serious distress
- Track emotional patterns and reflect them back gently
- Be warm, supportive, and non-clinical in tone

Important guidelines:
- Never diagnose mental health conditions
- Always recommend professional help for crisis situations
- Keep responses concise (3-5 sentences unless more detail is needed)
- End responses with a gentle question to encourage continued expression
- If the user mentions self-harm or suicide, provide crisis hotline information immediately (iCall: 9152987821)"""

# ── Fallback responses when OpenAI is unavailable ────────────────────────────

_FALLBACKS: dict[str, str] = {
    "sadness": (
        "I hear that you're going through a difficult time right now, and I want you to know that it's completely valid to feel this way. "
        "Reaching out is a brave and important step. Would you like to talk more about what's been weighing on you?"
    ),
    "anxiety": (
        "It sounds like you're feeling quite overwhelmed. Let's try a quick grounding exercise together — "
        "take a slow breath in for 4 counts, hold for 4, then exhale for 4. "
        "Anxiety can feel intense, but it does pass. What's been on your mind lately?"
    ),
    "anger": (
        "I can sense that something has really frustrated or upset you, and those feelings are completely understandable. "
        "Sometimes expressing what happened can help release some of that tension. Would you like to share more about the situation?"
    ),
    "joy": (
        "It's wonderful to hear that you're feeling positive! Celebrating good moments is so important for mental wellbeing. "
        "What's been bringing you this joy today?"
    ),
    "hope": (
        "It's great that you're feeling hopeful — that's a powerful emotion that can carry us through tough times. "
        "What's been helping you feel this way?"
    ),
    "fear": (
        "It sounds like something is really worrying you right now. That's a natural response, and you don't have to face it alone. "
        "Can you tell me more about what's frightening you?"
    ),
    "neutral": (
        "Thank you for sharing with me. I'm here to listen and support you. "
        "How have you been feeling overall lately, and is there anything specific on your mind?"
    ),
}


def _fallback_response(emotion: str) -> str:
    return _FALLBACKS.get(emotion, _FALLBACKS["neutral"])


# ── OpenAI helper ─────────────────────────────────────────────────────────────

def _openai_response(history: list[models.Message]) -> str | None:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=300,
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception:
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/send", response_model=ChatResponse)
def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Resolve or create session
    if message.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == message.session_id,
            models.ChatSession.user_id == current_user.id,
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        title = message.content[:50] + ("..." if len(message.content) > 50 else "")
        session = models.ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)

    # Sentiment analysis
    emotion, sentiment_score, confidence = analyze_sentiment(message.content)

    # Persist user message
    user_msg = models.Message(
        session_id=session.id,
        role="user",
        content=message.content,
        sentiment_score=sentiment_score,
        emotion=emotion,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Persist mood entry
    db.add(models.MoodEntry(
        user_id=current_user.id,
        mood_score=sentiment_score,
        emotion=emotion,
        emotion_confidence=confidence,
        session_id=session.id,
    ))
    db.commit()

    # Build conversation history for context
    history = (
        db.query(models.Message)
        .filter(models.Message.session_id == session.id)
        .order_by(models.Message.created_at)
        .all()
    )

    # Generate AI reply
    ai_content = _openai_response(history) or _fallback_response(emotion)

    # Persist assistant message
    assistant_msg = models.Message(
        session_id=session.id,
        role="assistant",
        content=ai_content,
        sentiment_score=0.3,
        emotion="supportive",
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatResponse(
        session_id=session.id,
        user_message=MessageResponse.model_validate(user_msg),
        assistant_message=MessageResponse.model_validate(assistant_msg),
        emotion_detected=emotion,
        sentiment_score=sentiment_score,
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
def get_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.created_at.desc())
        .all()
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}
