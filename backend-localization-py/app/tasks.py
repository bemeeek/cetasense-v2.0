from datetime import datetime, timezone
import json
from uuid import uuid4
from celery import Celery
from .setup_celery import celery
from .db import get_connection
from .minio_helper import get_object
from .setup_redis import redis_client
import logging
from dotenv import load_dotenv
import os
from python.localize import run_localization
# ________________________________________
# Test endpoint variables
# ________________________________________
import random
import time
# ________________________________________



load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

NOTIFY_CHANNEL_BASE = os.getenv("NOTIFY_CHANNEL_BASE", "lok_notify")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 3600))  # Default to 1 hour
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "bismillahta")

def cache_status(job_id: str, status: str, x: float = None, y: float = None): # type: ignore
    """
    Cache the status of a localization job in Redis.

    Args:
        job_id (str): The unique identifier for the job.
        status (str): The current status of the job (e.g., 'running', 'done', 'failed').
        payload.update({"hasil_x": x, "hasil_y": y})
        y (float, optional): The Y coordinate result, if available.
    """
    key = f"lok_status:{job_id}"
    payload = {
        "status":status,
        "updated_at": datetime.now(timezone.utc).isoformat()  # Store the timestamp in ISO format
    }
    if x is not None and y is not None:
        payload.update({"hasil_x": x, "hasil_y": y})  # type: ignore
    try:
        redis_client.hset(key, mapping=payload)
        redis_client.expire(key, CACHE_TTL_SECONDS)  # Set TTL for the key
    except Exception as e:
        logger.error(f"Error caching status for job {job_id}: {e}")

# def notify_pubsub(job_id: str, status: str, x: float = None, y: float = None): # type: ignore
#     """Notify job status via Redis Pub/Sub."""
#     msg = {
#         "job_id": job_id,
#         "status": status,
#         "timestamp": datetime.now(timezone.utc).isoformat()}
#     redis_client.publish("lok_notify", json.dumps(msg))

def notify_pubsub(job_id: str, status: str, x: float = None, y: float = None): # type: ignore
    """
    Notify job status via Redis Pub/Sub.
    Args:
        job_id (str): The unique identifier for the job.
        status (str): The current status of the job (e.g., 'running', 'done', 'failed').
        x (float, optional): The X coordinate result, if available.
        y (float, optional): The Y coordinate result, if available.
    """
    channel = f"{NOTIFY_CHANNEL_BASE}:{job_id}"
    msg = {
        "job_id": job_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if x is not None and y is not None:
        msg.update({"hasil_x": x, "hasil_y": y}) # type: ignore
    try:
        redis_client.publish(channel, json.dumps(msg))
        logger.info(f"Published message to {channel}: {msg}")
    except Exception as e:
        logger.error(f"Error publishing message to {channel}: {e}")
        # Handle the error (e.g., retry, log, etc.)


@celery.task(bind=True)
def localize_task(self, job_id: str):
    logger.info(f"Starting localization task for job {job_id}")
    conn = get_connection()
    try:
        # —————————————————————————
        # Update status→ RUNNING
        # —————————————————————————
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE lokalisasi_jobs SET status=%s WHERE id=%s",
                ("running", job_id)
            )
        conn.commit()
        cache_status(job_id, "running")
        notify_pubsub(job_id, "running")

        # —————————————————————————
        # Ambil metadata file dari DB
        # —————————————————————————
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                lj.id_data,
                lj.id_metode,
                lj.id_ruangan,
                dc.object_path AS data_path,
                ml.path_file AS model_path
                FROM lokalisasi_jobs lj
                JOIN data_csv dc
                ON lj.id_data = dc.id
                JOIN metodelokalisasi ml
                ON lj.id_metode = ml.id
                WHERE lj.id = %s
            """, (job_id,))
            row = cur.fetchone()
            
        if not row:
            raise ValueError(f"Job {job_id} tidak ditemukan")

        data_id    = row['id_data']
        metode_id  = row['id_metode']
        ruangan_id = row['id_ruangan']
        data_path  = row['data_path']   # misal "Data-Parameter/spotfile3.csv"
        model_path = row['model_path']  # misal "Models/lok_v1.pkl"
        # —————————————————————————
        # Download CSV & model
        # —————————————————————————
        csv_bytes   = get_object(MINIO_BUCKET_NAME, data_path)
        model_bytes = get_object(MINIO_BUCKET_NAME, model_path)

        logger.info("Job %s: downloaded %dB CSV, %dB model", job_id, len(csv_bytes), len(model_bytes))

        time.sleep(1 + random.random() * 2)   # delay 1–3 detik
        x = round(random.uniform(0, 10), 3)
        y = round(random.uniform(0, 10), 3)
        logger.info("Job %s: simulated result x=%s, y=%s", job_id, x, y)

        # —————————————————————————
        # Simpan hasil ke tabel hasil_lokalisasi
        # —————————————————————————
        hasil_id = uuid4().hex
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO hasil_lokalisasi "
                "(id, hasil_x, hasil_y, id_data, id_metode, id_ruangan) "
                "VALUES (%s,%s,%s,%s,%s,%s)",
                (hasil_id, x, y, data_id, metode_id, ruangan_id)
            )
            # Update job jadi DONE + FK ke hasil
            cur.execute(
                "UPDATE lokalisasi_jobs "
                "SET status=%s, updated_at=%s "
                "WHERE id=%s",
                ("done", datetime.now(), job_id)
            )
        conn.commit()
        cache_status(job_id, "done", x, y)
        notify_pubsub(job_id, "done", x, y)
        logger.info(f"Localization task for job {job_id} completed successfully")

        return {"x": x, "y": y}

    except Exception as e:
        logger.error(f"Error occurred during localization task for job {job_id}: {e}")
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