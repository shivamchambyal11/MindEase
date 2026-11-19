"""
Emotion & sentiment analysis.
Primary: HuggingFace transformers (j-hartmann/emotion-english-distilroberta-base)
Fallback: keyword-based rule engine (no external dependencies)
"""
from typing import Tuple
import re

# ── Rule-based fallback ───────────────────────────────────────────────────────

EMOTION_KEYWORDS: dict[str, list[str]] = {
    "joy": [
        "happy", "great", "wonderful", "amazing", "love", "excited",
        "fantastic", "good", "glad", "cheerful", "delighted", "pleased",
        "joyful", "thrilled", "ecstatic",
    ],
    "sadness": [
        "sad", "depressed", "unhappy", "miserable", "hopeless", "lonely",
        "grief", "sorrow", "cry", "tears", "down", "blue", "heartbroken",
        "devastated", "empty",
    ],
    "anxiety": [
        "anxious", "worried", "nervous", "stressed", "overwhelmed",
        "panic", "scared", "tense", "uneasy", "dread", "apprehensive",
        "restless", "fear",
    ],
    "anger": [
        "angry", "furious", "mad", "frustrated", "irritated", "annoyed",
        "rage", "upset", "outraged", "bitter", "hostile",
    ],
    "hope": [
        "hope", "better", "improve", "trying", "working", "progress",
        "forward", "optimistic", "positive", "motivated", "determined",
    ],
    "neutral": [
        "okay", "fine", "alright", "normal", "usual", "average", "so-so",
    ],
}

EMOTION_SCORES: dict[str, float] = {
    "joy": 0.85,
    "hope": 0.50,
    "neutral": 0.0,
    "anxiety": -0.45,
    "sadness": -0.70,
    "anger": -0.60,
}


def _rule_based(text: str) -> Tuple[str, float, float]:
    text_lower = text.lower()
    counts: dict[str, int] = {e: 0 for e in EMOTION_KEYWORDS}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            if re.search(r"\b" + kw + r"\b", text_lower):
                counts[emotion] += 1

    dominant = max(counts, key=counts.get)
    if counts[dominant] == 0:
        dominant = "neutral"

    score = EMOTION_SCORES.get(dominant, 0.0)
    confidence = min(counts[dominant] * 0.2 + 0.5, 1.0)
    return dominant, score, confidence


# ── Transformer model (lazy-loaded) ──────────────────────────────────────────

_pipeline = None  # None = not attempted yet | "fallback" = unavailable


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        try:
            from transformers import pipeline as hf_pipeline
            _pipeline = hf_pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                top_k=1,
            )
        except Exception:
            _pipeline = "fallback"
    return _pipeline


_TRANSFORMER_SCORE: dict[str, float] = {
    "joy": 0.85,
    "surprise": 0.30,
    "neutral": 0.0,
    "fear": -0.50,
    "sadness": -0.70,
    "disgust": -0.60,
    "anger": -0.60,
}


def analyze_sentiment(text: str) -> Tuple[str, float, float]:
    """
    Returns (emotion: str, sentiment_score: float[-1,1], confidence: float[0,1])
    """
    pipe = _get_pipeline()
    if pipe == "fallback":
        return _rule_based(text)

    try:
        result = pipe(text[:512])
        # result shape: [[{"label": ..., "score": ...}]]
        item = result[0]
        if isinstance(item, list):
            item = item[0]
        emotion = item.get("label", "neutral").lower()
        confidence = float(item.get("score", 0.5))
        score = _TRANSFORMER_SCORE.get(emotion, 0.0)
        return emotion, score, confidence
    except Exception:
        return _rule_based(text)
