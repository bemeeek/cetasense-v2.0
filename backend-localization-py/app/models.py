import uuid
from enum import Enum
from datetime import datetime
from pydantic import BaseModel
from .db import get_connection

class JobStatus(str, Enum):
    QUEUED  = "queued"
    RUNNING = "running"
    DONE    = "done"
    FAILED  = "failed"

class LokalisasiJob(BaseModel):
    id: str
    id_data: str
    id_ruangan: str
    id_metode: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime

class LocalizeRequest(BaseModel):
    id_data: str
    id_ruangan: str
    id_metode: str

# Optional: create table if not exists
# Call once at startup

def create_lokalisasi_table():
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS lokalisasi_jobs (
                    id CHAR(36) PRIMARY KEY,
                    id_data CHAR(36) NOT NULL,
                    id_ruangan CHAR(36) NOT NULL,
                    id_metode CHAR(36) NOT NULL,
                    status ENUM('queued','running','done','failed') NOT NULL DEFAULT 'queued',
                    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    FOREIGN KEY (id_data) REFERENCES data_csv(id),
                    FOREIGN KEY (id_ruangan) REFERENCES ruangan(id),
                    FOREIGN KEY (id_metode) REFERENCES metodelokalisasi(id)
                )
                """
            )
            conn.commit()
    finally:
        conn.close()