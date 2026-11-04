import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class LateReasonStatus(str, enum.Enum):
    pending_ai_evaluation = "pending_ai_evaluation"
    evaluated = "evaluated"


class LateArrivalReason(Base):
    __tablename__ = "late_arrival_reasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    attendance_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("attendance_records.id"), unique=True, nullable=False
    )
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    late_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[LateReasonStatus] = mapped_column(
        Enum(LateReasonStatus), nullable=False, default=LateReasonStatus.pending_ai_evaluation
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evaluation: Mapped["LateReasonEvaluation | None"] = relationship(
        "LateReasonEvaluation", back_populates="late_reason", uselist=False
    )


class LateReasonEvaluation(Base):
    __tablename__ = "late_reason_evaluations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    late_reason_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("late_arrival_reasons.id"), unique=True, nullable=False
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    validity_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    pattern_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    pattern_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    late_reason: Mapped["LateArrivalReason"] = relationship(
        "LateArrivalReason", back_populates="evaluation"
    )


class EmployeeReliabilityScore(Base):
    __tablename__ = "employee_reliability_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(Integer, ForeignKey("employees.id"), unique=True, nullable=False)
    reliability_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    late_count_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    absence_count_month: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    weak_reason_count_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    invalid_reason_count_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
