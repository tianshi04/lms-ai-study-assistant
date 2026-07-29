from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from .base import Base

class CourseInteraction(Base):
    __tablename__ = "course_interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    course_id = Column(Integer, index=True, nullable=False)
    interaction_type = Column(String(50), nullable=False) # 'view', 'enroll', 'complete'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
