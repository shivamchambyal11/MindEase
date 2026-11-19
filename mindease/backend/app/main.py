from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, chat, mood, analytics

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MindEase API",
    description="AI-Powered Mental Health Companion — Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["Authentication"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["Chat"])
app.include_router(mood.router,      prefix="/api/mood",      tags=["Mood"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
def root():
    return {"message": "MindEase API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
