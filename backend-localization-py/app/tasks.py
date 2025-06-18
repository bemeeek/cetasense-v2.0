from datetime import datetime, timezone
import json
import subprocess
from uuid import uuid4
from celery import Celery
from .setup_celery import celery
from .db import get_connection
from .minio_helper import get_object
from .setup_redis import redis_client
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

def cache_status(job_id: str, status: str, x: float = None, y: float = None): # type: ignore
    """Cache job status in Redis."""
    fields = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()}
    if x is not None and y is not None:
        redis_client.hset(job_id, mapping={"hasil_x": x, "hasil_y": y})
    redis_client.xadd(f"lok_status:{job_id}", {"job_id": job_id, "status": status, "timestamp": datetime.now(timezone.utc).isoformat()})

def notify_pubsub(job_id: str, status: str, x: float = None, y: float = None): # type: ignore
    """Notify job status via Redis Pub/Sub."""
    msg = {
        "job_id": job_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()}
    redis_client.publish("lok_notify", json.dumps(msg))

@celery.task(bind=True)
def localize_task(self, job_id: str):
    conn = get_connection()
    try:
        # —————————————————————————
        # Update status→ RUNNING
        # —————————————————————————
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                ("running", datetime.now(timezone.utc), job_id)
            )
        conn.commit()
        cache_status(job_id, "running")
        notify_pubsub(job_id, "running")

        # —————————————————————————
        # Ambil metadata file dari DB
        # —————————————————————————
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id_data, id_metode, id_ruangan FROM lokalisasi_jobs WHERE id=%s",
                (job_id,)
            )
            job = cur.fetchone()
        data_id, metode_id, ruangan_id = job['id_data'], job['id_metode'], job['id_ruangan']  # type: ignore

        # —————————————————————————
        # Download CSV & model
        # —————————————————————————
        csv_bytes   = get_object("data_csv", f"{data_id}.csv")
        model_bytes = get_object("model",    f"{metode_id}.pkl")
        with open("/tmp/data.csv",  "wb") as f: f.write(csv_bytes)
        with open("/tmp/model.pkl", "wb") as f: f.write(model_bytes)

        # —————————————————————————
        # Jalankan script pemosisian
        # —————————————————————————
        out = subprocess.check_output([
            "python3", "python/localize.py",
            "--data_path",  "/tmp/data.csv",
            "--model_path", "/tmp/model.pkl"
        ])
        res = json.loads(out)
        x, y = res["X"], res["Y"]

        # —————————————————————————
        # Simpan hasil ke tabel hasil_lokalisasi
        # —————————————————————————
        hasil_id = uuid4().hex
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO hasil_lokalisasi "
                "(id, hasil_x, hasil_y, id_data, id_metode, id_ruangan, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (hasil_id, x, y, data_id, metode_id, ruangan_id, datetime.now(timezone.utc))
            )
            # Update job jadi DONE + FK ke hasil
            cur.execute(
                "UPDATE lokalisasi_jobs "
                "SET status=%s, updated_at=%s, id_hasil_lokalisasi=%s "
                "WHERE id=%s",
                ("done", datetime.now(timezone.utc), hasil_id, job_id)
            )
        conn.commit()
        cache_status(job_id, "done", x, y)
        notify_pubsub(job_id, "done", x, y)

        return {"x": x, "y": y}

    except Exception:
        # —————————————————————————
        # On error → status FAILED
        # —————————————————————————
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                ("failed", datetime.now(timezone.utc), job_id)
            )
        conn.commit()
        cache_status(job_id, "failed")
        notify_pubsub(job_id, "failed")
        raise

    finally:
        conn.close()