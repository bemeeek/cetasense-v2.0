from sqlalchemy import Column, Integer, String, ForeignKey, CHAR, DateTime
import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base
from enum import Enum

class JobStatus(Enum):
    QUEUED  = "queued"
    RUNNING = "running"
    DONE    = "done"
    FAILED  = "failed"

class LokalisasiJob(Base):
    __tablename__ = "lokalisasi_jobs"

    id = Column(CHAR(36), 
                primary_key=True, 
                default=lambda: str(uuid.uuid4()), 
                server_default=func.uuid_generate_v4(),
                unique=True, 
                nullable=False)
    data_id = Column(CHAR(36), ForeignKey("data_csv.id"), nullable=False)
    

