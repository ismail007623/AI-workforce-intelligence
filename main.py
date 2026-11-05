from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.database import Base, engine
from backend.app.models import (
    ChatMessage,
    EmployeeReliabilityScore,
    LateArrivalReason,
    LateReasonEvaluation,
    PolicyUpload,
    RefreshToken,
    User,
)
from backend.app.routers import attendance, dashboard, employees, policy
from backend.app.routers import auth
from backend.app.routers import policy_assistant


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="AI Workforce Attendance Intelligence",
    description="AI-powered HR attendance tracking and workforce insights",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(attendance.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(employees.router, prefix="/api/v1")
app.include_router(policy.router, prefix="/api/v1")
app.include_router(policy_assistant.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
