from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from backend.app.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    employees = relationship("Employee", back_populates="department")
    organization = relationship("Organization", back_populates="departments")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    employee_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)
    manager_id = Column(Integer, ForeignKey("employees.id"), nullable=True, index=True)

    department = relationship("Department", back_populates="employees")
    organization = relationship("Organization", back_populates="employees")
    attendance_records = relationship("AttendanceRecord", back_populates="employee")
