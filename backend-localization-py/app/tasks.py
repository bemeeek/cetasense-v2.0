from datetime import datetime, timezone
import json
import traceback
from uuid import uuid4
from typing import Dict, Any, Optional
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

from .simple_step_metrics import init_steps_metrics, step, set_request_id, get_request_id, StepTimer, generate_request_id

load_dotenv()

METRICS_FILE = os.getenv("METRICS_FILE", "step_metrics.csv")  # Use the same file as Golang
SERVICE_NAME = "celery_worker"
DEBUG_METRICS = os.getenv("DEBUG_METRICS", "false").lower() == "true"

try:
    init_steps_metrics(METRICS_FILE, SERVICE_NAME, DEBUG_METRICS)  # FILE YANG SAMA
    logging.info(f"✅ Tasks module step metrics initialized: {METRICS_FILE}")
except Exception as e:
    logging.error(f"Failed to initialize step metrics in tasks: {e}")

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

NOTIFY_CHANNEL_BASE = os.getenv("NOTIFY_CHANNEL_BASE", "lok_notify")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", 3600))
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "bismillahta")

def test_redis_connection():
    """Test Redis connection for debugging"""
    try:
        redis_client.ping()
        logger.info("✅ Python Redis connected successfully")
        
        # Test publish
        test_channel = "test_channel"
        test_msg = {"test": "connection_test", "timestamp": datetime.now().isoformat()}
        result = redis_client.publish(test_channel, json.dumps(test_msg))
        logger.info(f"✅ Published test message to {test_channel}, subscribers: {result}")
        
    except Exception as e:
        logger.error(f"❌ Python Redis error: {e}")

def cache_status(job_id: str, status: str, x: Optional[float] = None, y: Optional[float] = None, error: Optional[str] = None) -> None:
    """Cache the status of a localization job in Redis."""
    key = f"lok_status:{job_id}"
    payload: Dict[str, Any] = {
        "status": status,
        "updated_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }
    
    if x is not None and y is not None:
        result_data: Dict[str, float] = {"hasil_x": x, "hasil_y": y}
        payload.update(result_data)
    
    if error is not None:
        payload["error"] = error
    
    try:
        redis_client.hset(key, mapping=payload)
        redis_client.expire(key, CACHE_TTL_SECONDS)
        logger.info(f"📦 Cached status for job {job_id}: {status}")
    except Exception as e:
        logger.error(f"❌ Error caching status for job {job_id}: {e}")

# Di tasks.py, update function notify_pubsub
import time

def notify_pubsub(job_id: str, status: str, x: Optional[float] = None, y: Optional[float] = None, error: Optional[str] = None) -> None:
    """Notify job status via Redis Pub/Sub with retry mechanism."""
    req_id = generate_request_id()
    set_request_id(req_id)
    channel = f"{NOTIFY_CHANNEL_BASE}:{job_id}"

    msg: Dict[str, Any] = {
        "job_id": job_id,
        "status": status,
        "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    }

    if x is not None and y is not None:
        result_data: Dict[str, float] = {"hasil_x": x, "hasil_y": y}
        msg.update(result_data)

    if error is not None:
        msg["error"] = error

    try:
        # Log the sending of the status message
        logger.info(f"📡 Job {job_id}: Publishing status '{status}' to Redis")

        # Memulai pencatatan waktu untuk status
        start_time = time.time()  # Capture the start time

        # Mulai langkah untuk status
        step(req_id, f"NOTIFY_PUBSUB_{status.upper()}_START", 0.0)  # Placeholder step to mark the beginning

        # Notify for different statuses
        if status == "running":
            logger.info(f"Job {job_id} is running, preparing for localization.")
        elif status == "done":
            logger.info(f"Job {job_id} localization is done, result: x={x}, y={y}")
        elif status == "failed":
            logger.error(f"Job {job_id} failed with error: {error}")

        # Check Redis connection first
        redis_client.ping()

        # Retry mechanism for publishing
        max_retries = 5
        retry_delay = 0.5  # 500ms
        
        if status.lower() == "running":
            with StepTimer(req_id, "NOTIFY_PUBSUB_RETRY_LOOP"):
                for attempt in range(max_retries):
                    # Publish message
                    attempt_start = time.time()
                    result = redis_client.publish(channel, json.dumps(msg))
                    duration_ms = (time.time() - attempt_start) * 1000
                    step(req_id, f"NOTIFY_PUBSUB_ATTEMPT_{attempt + 1}", duration_ms)
                    logger.info(f"📡 [Attempt {attempt + 1}] Published to {channel}: {msg}")
                    logger.info(f"📊 Subscribers count: {result}")

                    with StepTimer(req_id, "NOTIFY_PUBSUB_WAIT"):
                        if result > 0:
                            logger.info(f"✅ Message delivered to {result} subscribers")
                            break
                        else:
                            if attempt < max_retries - 1:
                                logger.warning(f"⚠️  No subscribers for {channel}, retrying in {retry_delay}s...")
                                time.sleep(retry_delay)
                                retry_delay *= 1.5  # Exponential backoff
                            else:
                                logger.warning(f"⚠️  Final attempt: No subscribers for {channel}")
        else:
            for attempt in range(max_retries):
                result = redis_client.publish(channel, json.dumps(msg))
                if result > 0:
                    break
                time.sleep(retry_delay)

        # Hitung durasi total untuk proses notify dan catat pada akhir
        end_time = time.time()
        total_duration = (end_time - start_time) * 1000  # Durasi dalam milidetik
        step(req_id, f"NOTIFY_PUBSUB_{status.upper()}_END", total_duration)  # Langkah terakhir dengan durasi

    except Exception as e:
        logger.error(f"❌ Error publishing to {channel}: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")


def wait_for_subscriber(job_id: str, timeout_s=10):
    """Blocking wait until Go-gateway signals subscriber_ready."""
    ps = redis_client.pubsub()
    channel = f"subscriber_ready:{job_id}"
    ps.subscribe(channel)
    start = time.time()
    while time.time() - start < timeout_s:
        msg = ps.get_message(ignore_subscribe_messages=True, timeout=1.0)
        if msg and msg['type'] == 'message':
            return True
    return False


@celery.task(bind=True, max_retries=3, default_retry_delay=60)
def localize_task(self, job_id: str) -> Dict[str, Any]:
    logger.info(f"🚀 Starting localization task for job {job_id}")
    # generate a dedicated request‐ID for all metrics in this task
    req_id = generate_request_id()
    set_request_id(req_id)

    if DEBUG_METRICS:
        logger.info(f"📊 [{SERVICE_NAME}] Task {job_id} using req_id: {req_id}")
    # Test Redis connection at start
    test_redis_connection()

    logger.info(f"⏳ Waiting 2 seconds for potential subscribers...")
    time.sleep(2)
    
    task_start_time = time.time()
    step(req_id, "CELERY_LOCALIZE_TASK_START", 0.0)  # Log start step
    # Inisialisasi variabel untuk cleanup
    csv_file_path: Optional[str] = None
    model_file_path: Optional[str] = None
    
    try:
        # ===== UPDATE STATUS TO RUNNING =====
        with StepTimer(job_id, "UPDATE_JOB_STATUS"):
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
        logger.info(f"▶️  Job {job_id} status updated to 'running'")

        if wait_for_subscriber(job_id, timeout_s=10):
            logger.info(f"✅ Subscriber for job {job_id} is ready, proceeding with localization")
        else:
            logger.warning(f"⚠️  No subscriber ready for job {job_id}, proceeding with localization anyway")

        # ===== GET JOB DETAILS =====
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
                    JOIN data_csv dc ON lj.id_data = dc.id
                    JOIN metodelokalisasi ml ON lj.id_metode = ml.id
                    WHERE lj.id = %s
                """, (job_id,))
                row = cur.fetchone()

        if not row:
            raise ValueError(f"Job {job_id} tidak ditemukan")

        data_id = row['id_data']
        metode_id = row['id_metode']
        ruangan_id = row['id_ruangan']
        data_path = row['data_path']
        model_path = row['model_path']
        
        logger.info(f"📂 Job {job_id} details: data={data_path}, model={model_path}")
        
        # ===== DOWNLOAD FILES =====
        with StepTimer(req_id, "DOWNLOAD_CSV_FROM_MINIO"):
            csv_bytes = get_object(MINIO_BUCKET_NAME, data_path)
            model_bytes = get_object(MINIO_BUCKET_NAME, model_path)
            logger.info(f"⬇️  Job {job_id}: downloaded {len(csv_bytes)}B CSV, {len(model_bytes)}B model")

        # ===== CREATE TEMP FILES =====
        with StepTimer(req_id, "CREATE_TEMP_FILES"):
            with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as csv_file:
                csv_file.write(csv_bytes)
                csv_file_path = csv_file.name
        
        _, ext = os.path.splitext(model_path)
        suffix = ext if ext.lower() in (".pkl", ".py") else ".pkl"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as model_file:
            model_file.write(model_bytes)
            model_file_path = model_file.name

        logger.info(f"📁 Job {job_id}: temporary files created")

        # ===== RUN LOCALIZATION =====
        logger.info(f"🔍 Job {job_id}: starting localization process")
        with StepTimer(req_id, "RUN_LOCALIZATION"):
            result = run_localization(csv_file_path, model_file_path)
            x = result["x"]
            y = result["y"]
            logger.info(f"🎯 Job {job_id}: localization result: x={x}, y={y}")
        
        # ===== SAVE TO DATABASE =====
        hasil_id = str(uuid4())
        with StepTimer(req_id, "SAVE_TO_MARIADB_DATABASE"):
            with transaction() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO hasil_lokalisasi "
                        "(id, hasil_x, hasil_y, id_data, id_metode, id_ruangan) "
                        "VALUES (%s,%s,%s,%s,%s,%s)",
                        (hasil_id, x, y, data_id, metode_id, ruangan_id)
                    )
                    cur.execute(
                        "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                        ("done", datetime.now(timezone.utc), job_id)
                    )

        # ===== SUCCESS NOTIFICATION =====
        with StepTimer(req_id, "NOTIFY_SUCCESS"):
            cache_status(job_id, "done", x=x, y=y)
            notify_pubsub(job_id, "done", x=x, y=y)
            logger.info(f"✅ Job {job_id} completed successfully with result: x={x}, y={y}")

        total_task_time = (time.time() - task_start_time) * 1000
        step(req_id, "CELERY_LOCALIZE_TASK_SUCCESS", total_task_time)

        return {
            "status": "done",
            "x": x,
            "y": y,
            "job_id": job_id,
        }

    
    
            
    except Exception as e:
        # ===== ERROR HANDLING =====
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"❌ Error in localization task for job {job_id}: {error_msg}")
        logger.error(f"Full traceback: {traceback.format_exc()}")

        # Update job status to failed
        try:
            with transaction() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                        ("failed", datetime.now(timezone.utc), job_id)
                    )
            
            cache_status(job_id, "failed", error=error_msg)
            notify_pubsub(job_id, "failed", error=error_msg)
            logger.info(f"💥 Job {job_id} status updated to 'failed'")
            
        except Exception as db_error:
            logger.error(f"❌ Failed to update job {job_id} status in database: {db_error}")

        total_task_time = (time.time() - task_start_time) * 1000
        step(req_id, "CELERY_LOCALIZE_TASK_FAILED", total_task_time)
        return {
            "status": "failed",
            "error": error_msg,
            "job_id": job_id
        }

        
    finally:
        # ===== CLEANUP =====
        try:
            if csv_file_path and os.path.exists(csv_file_path):
                os.remove(csv_file_path)
                logger.debug(f"🗑️  Removed CSV file: {csv_file_path}")
            if model_file_path and os.path.exists(model_file_path):
                os.remove(model_file_path)
                logger.debug(f"🗑️  Removed model file: {model_file_path}")
            logger.info(f"🧹 Temporary files cleaned up for job {job_id}")
        except Exception as cleanup_error:
            logger.error(f"❌ Error cleaning up temporary files for job {job_id}: {cleanup_error}")