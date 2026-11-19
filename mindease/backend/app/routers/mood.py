from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas import MoodEntryCreate, MoodEntryResponse
from app.security import get_current_user
import app.models as models

router = APIRouter()


@router.get("/entries", response_model=List[MoodEntryResponse])
def get_mood_entries(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == current_user.id)
        .order_by(models.MoodEntry.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/entries", response_model=MoodEntryResponse, status_code=201)
def create_mood_entry(
    entry: MoodEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mood = models.MoodEntry(
        user_id=current_user.id,
        mood_score=entry.mood_score,
        emotion=entry.emotion,
        notes=entry.notes,
    )
    db.add(mood)
    db.commit()
    db.refresh(mood)
    return mood
