from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.database import get_db
from app.schemas import AnalyticsSummary, MoodTrend
from app.security import get_current_user
import app.models as models

router = APIRouter()


@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    uid = current_user.id

    total_sessions = db.query(func.count(models.ChatSession.id)).filter(
        models.ChatSession.user_id == uid
    ).scalar() or 0

    total_messages = (
        db.query(func.count(models.Message.id))
        .join(models.ChatSession)
        .filter(
            models.ChatSession.user_id == uid,
            models.Message.role == "user",
        )
        .scalar() or 0
    )

    avg_mood = db.query(func.avg(models.MoodEntry.mood_score)).filter(
        models.MoodEntry.user_id == uid
    ).scalar() or 0.0

    emotion_row = (
        db.query(
            models.MoodEntry.emotion,
            func.count(models.MoodEntry.emotion).label("cnt"),
        )
        .filter(models.MoodEntry.user_id == uid)
        .group_by(models.MoodEntry.emotion)
        .order_by(func.count(models.MoodEntry.emotion).desc())
        .first()
    )
    most_common_emotion = emotion_row[0] if emotion_row else "neutral"

    # Trend: compare last 7 days vs previous 7 days
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    recent_avg = db.query(func.avg(models.MoodEntry.mood_score)).filter(
        models.MoodEntry.user_id == uid,
        models.MoodEntry.created_at >= week_ago,
    ).scalar() or 0.0

    prev_avg = db.query(func.avg(models.MoodEntry.mood_score)).filter(
        models.MoodEntry.user_id == uid,
        models.MoodEntry.created_at >= two_weeks_ago,
        models.MoodEntry.created_at < week_ago,
    ).scalar() or 0.0

    if recent_avg > prev_avg + 0.1:
        mood_trend = "improving"
    elif recent_avg < prev_avg - 0.1:
        mood_trend = "declining"
    else:
        mood_trend = "stable"

    # Build 8-day chart data
    weekly_trends: list[MoodTrend] = []
    for i in range(7, -1, -1):
        day_start = now - timedelta(days=i + 1)
        day_end = now - timedelta(days=i)
        entries = (
            db.query(models.MoodEntry)
            .filter(
                models.MoodEntry.user_id == uid,
                models.MoodEntry.created_at >= day_start,
                models.MoodEntry.created_at < day_end,
            )
            .all()
        )
        if entries:
            day_avg = sum(e.mood_score for e in entries) / len(entries)
            emotions = [e.emotion for e in entries]
            dominant = max(set(emotions), key=emotions.count)
        else:
            day_avg = 0.0
            dominant = "neutral"

        weekly_trends.append(
            MoodTrend(
                date=day_start.strftime("%Y-%m-%d"),
                average_mood=round(day_avg, 2),
                dominant_emotion=dominant,
                entry_count=len(entries),
            )
        )

    return AnalyticsSummary(
        total_sessions=total_sessions,
        total_messages=total_messages,
        average_mood_score=round(float(avg_mood), 2),
        most_common_emotion=most_common_emotion,
        mood_trend=mood_trend,
        weekly_trends=weekly_trends,
    )
