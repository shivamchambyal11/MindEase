from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ── Chat ──────────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str
    session_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sentiment_score: Optional[float]
    emotion: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Session"


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    session_id: int
    user_message: MessageResponse
    assistant_message: MessageResponse
    emotion_detected: str
    sentiment_score: float


# ── Mood ─────────────────────────────────────────────────────────────────────

class MoodEntryCreate(BaseModel):
    mood_score: float
    emotion: str
    notes: Optional[str] = None


class MoodEntryResponse(BaseModel):
    id: int
    mood_score: float
    emotion: str
    emotion_confidence: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────

class MoodTrend(BaseModel):
    date: str
    average_mood: float
    dominant_emotion: str
    entry_count: int


class AnalyticsSummary(BaseModel):
    total_sessions: int
    total_messages: int
    average_mood_score: float
    most_common_emotion: str
    mood_trend: str          # "improving" | "declining" | "stable"
    weekly_trends: List[MoodTrend]
