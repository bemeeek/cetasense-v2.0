from datetime import datetime, timezone
import json
import traceback
from uuid import uuid4
from celery import Celery
from .setup_celery import celery
from .db import get_connection, transaction, get_db_connection
from .minio_helper import get_object
from .setup_redis import redis_client
import logging
from dotenv import load_dotenv
import os
from python.localize import run_localization
import pymysql.cursors
import tempfile


load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

NOTIFY_CHANNEL_BASE = os.getenv("NOTIFY_CHANNEL_BASE", "lok_notify")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 3600))  # Default to 1 hour
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "bismillahta")

def cache_status(job_id: str, status: str, x: float = None, y: float = None, error: str = None): # type: ignore
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
        "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")  # Store the timestamp in ISO format
    }
    if x is not None and y is not None:
        payload.update({"hasil_x": x, "hasil_y": y})  # type: ignore
    if error is not None:
        payload["error"] =  error
    try:
        redis_client.hset(key, mapping=payload)
        redis_client.expire(key, CACHE_TTL_SECONDS)  # Set TTL for the key
    except Exception as e:
        logger.error(f"Error caching status for job {job_id}: {e}")

def notify_pubsub(job_id: str, status: str, x: float = None, y: float = None, error: str = None): # type: ignore
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
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
    if x is not None and y is not None:
        msg.update({"hasil_x": x, "hasil_y": y}) # type: ignore
    if error is not None:
        msg["error"] = error
    try:
        redis_client.publish(channel, json.dumps(msg))
        logger.info(f"Published message to {channel}: {msg}")
    except Exception as e:
        logger.error(f"Error publishing message to {channel}: {e}")
        # Handle the error (e.g., retry, log, etc.)


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def localize_task(self, job_id: str):
    logger.info(f"Starting localization task for job {job_id}")
    try:
        # ———————————————— UPDATE STATUS —————————————————————————
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT status FROM lokalisasi_jobs WHERE id=%s FOR UPDATE",
                    (job_id,)
                )
                job = cur.fetchone()
                if not job:
                    raise ValueError(f"Job {job_id} tidak ditemukan")
                
                if job['status'] != 'queued':
                    logger.warning(f"Job {job_id} is not in 'queued' status, current status: {job['status']}")
                    return {
                        "status": job['status'],
                        "message": f"Job {job_id} is already in status '{job['status']}'"
                    }
                cur.execute(
                    "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                    ("running", datetime.now(), job_id)
                )
        
        cache_status(job_id, "running")
        notify_pubsub(job_id, "running")
        logger.info(f"Job {job_id} status updated to 'running'")

        with get_db_connection() as conn:
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
        try:
            csv_bytes   = get_object(MINIO_BUCKET_NAME, data_path)
            model_bytes = get_object(MINIO_BUCKET_NAME, model_path)
            logger.info(f"Job {job_id}: downloaded {len(csv_bytes)}B CSV, {len(model_bytes)}B model")

        except Exception as e:
            logger.error("Job %s: failed to download files: %s", job_id, e)
            raise

        try:
            csv_file_path = None
            model_file_path = None
            with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as csv_file:
                csv_file.write(csv_bytes)
                csv_file_path = csv_file.name
            
            with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as model_file:
                model_file.write(model_bytes)
                model_file_path = model_file.name

            result = run_localization(
                csv_file_path,
                model_file_path
            )
            x, y = result['x'], result['y'] # type: ignore

            logger.info(f"Job {job_id}: localization result: x={x}, y={y}")
        
        except Exception as e:
            logger.error("Job %s: localization failed: %s", job_id, e)
            # —————————————————————————
            # On error → status FAILED
            # —————————————————————————
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                    ("failed", datetime.now(timezone.utc), job_id)
                )
            conn.commit()
            cache_status(job_id, "failed", error=str(e))
        finally:
            # Clean up temporary files
            try :
                if csv_file_path: # type: ignore
                    os.remove(csv_file_path)
                if model_file_path: # type: ignore
                    os.remove(model_file_path)
            except Exception as cleanup_error:
                logger.error(f"Error cleaning up temporary files for job {job_id}: {cleanup_error}")
            logger.info(f"Temporary files cleaned up for job {job_id}")

        # —————————————————————————
        # Insert hasil_lokalisasi
        # —————————————————————————
        hasil_id = str(uuid4())  # Generate a new UUID for the result
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO hasil_lokalisasi "
                    "(id, hasil_x, hasil_y, id_data, id_metode, id_ruangan, job_id, created_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (hasil_id, x, y, data_id, metode_id, ruangan_id, job_id, datetime.now()) # type: ignore
                )

                cur.execute(
                    "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                    ("done", datetime.now(timezone.utc), job_id)
                )

            conn.commit()
        cache_status(job_id, "done", x=x, y=y) # type: ignore
        notify_pubsub(job_id, "done", x=x, y=y) # type: ignore
        logger.info(f"Job {job_id} completed successfully with result: x={x}, y={y}") # type: ignore
        return {
            "status": "done",
            "hasil_x": x,   # type: ignore
            "hasil_y": y,   # type: ignore
            "job_id": job_id
        }
    
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"Error in localization task for job {job_id}: {error_msg}\n{traceback.format_exc()}")

        try :
            with transaction() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                        ("failed", datetime.now(timezone.utc), job_id)
                    )
            cache_status(job_id, "failed", error=error_msg)
            notify_pubsub(job_id, "failed", error=error_msg)
            logger.info(f"Job {job_id} status updated to 'failed'")
        except Exception as db_error:
            logger.error(f"Failed to update job {job_id} status in database: {db_error}")