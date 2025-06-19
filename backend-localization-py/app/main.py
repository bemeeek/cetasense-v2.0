from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uuid
import os

from .db import get_connection
from .models import LocalizeRequest, create_lokalisasi_table
from .tasks import localize_task
from .setup_redis import redis_client
from datetime import datetime

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure table exists on startup
def on_startup():
    create_lokalisasi_table()

app.add_event_handler("startup", on_startup)

@app.post("/localize", status_code=202)
def enqueue(req: LocalizeRequest):
    job_id = uuid.uuid4().hex
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO lokalisasi_jobs (id, id_data, id_ruangan, id_metode, status, created_at, updated_at)"
                " VALUES (%s,%s,%s,%s,'queued',%s,%s)",
                (job_id, req.id_data, req.id_ruangan, req.id_metode, datetime.now(), datetime.now())
            )
            conn.commit()
        localize_task.apply_async(args=[job_id], task_id=job_id) # type: ignore
        return {"job_id": job_id, "status": "queued"}
    finally:
        conn.close()

@app.get("/status/{job_id}")
def get_status(job_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT status, hasil_x, hasil_y FROM hasil_lokalisasi WHERE id=%s",
                (job_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Job not found")
        resp = {"status": row['status']} # type: ignore
        if row['status'] == 'done': # type: ignore
            resp.update({"hasil_x": row['hasil_x'], "hasil_y": row['hasil_y']})     # type: ignore
        return resp
    finally:
        conn.close()