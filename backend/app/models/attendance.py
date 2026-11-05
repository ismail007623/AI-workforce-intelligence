import enum
from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class CheckInStatus(str, enum.Enum):
    present = "present"
    late = "late"
    absent = "absent"


class CheckOutStatus(str, enum.Enum):
    on_time = "on_time"
    early_left = "early_left"


class NotificationStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"
    skipped = "skipped"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("employee_id", "date", name="uq_employee_date"),)

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    date = Column(Date, nullable=False, index=True)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    check_in_status = Column(Enum(CheckInStatus), nullable=True)
    check_out_status = Column(Enum(CheckOutStatus), nullable=True)
    late_minutes = Column(Integer, nullable=False, default=0)
    early_leave_minutes = Column(Integer, nullable=False, default=0)

    employee = relationship("Employee", back_populates="attendance_records")
    notifications = relationship("NotificationLog", back_populates="attendance_record")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    attendance_id = Column(Integer, ForeignKey("attendance_records.id"), nullable=False)
    type = Column(String(50), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(Enum(NotificationStatus), nullable=False)
    message = Column(Text, nullable=False)

    attendance_record = relationship("AttendanceRecord", back_populates="notifications")
