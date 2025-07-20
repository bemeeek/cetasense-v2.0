import os
import uuid
import logging
import threading
import signal
import time
import json
import asyncio
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import uvicorn #type: ignore

from .rabbit_consumer import signal_handler, main as consume_rabbit
from .db import get_connection, get_db_connection, transaction
from .models import LocalizeRequest, create_lokalisasi_table
from .tasks import localize_task
from .setup_redis import redis_client

# Load environment variables first
load_dotenv()

METRICS_FILE = os.getenv("METRICS_FILE", "/app/metrics/step_metrics.csv")

# Unique instance identifier for service and metrics
INSTANCE_ID = os.getenv("INSTANCE_ID", "py_api_unknown")
SERVICE_NAME = f"fastapi_{INSTANCE_ID}"

# Enable debug mode for troubleshooting
DEBUG_METRICS = os.getenv("DEBUG_METRICS", "false").lower() == "true"

_start_time = time.time()

class ElapsedFormatter(logging.Formatter):
    """Formatter that adds elapsed time since start in ms."""
    def format(self, record):
        elapsed_ms = (record.created - _start_time) * 1000
        record.elapsed = f"{elapsed_ms:.2f}ms"
        return super().format(record)

handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
handler.setFormatter(
    ElapsedFormatter('%(asctime)s - %(levelname)s - [%(elapsed)s] - %(message)s')
)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.handlers = []
logger.addHandler(handler)
from .simple_step_metrics import (
    init_steps_metrics,
    step,
    get_request_id,
    set_request_id,
    generate_request_id,
    StepTimer,
    async_step,
    AsyncStepTimer
)

# CRITICAL FIX: Initialize metrics IMMEDIATELY at module level
print(f"🚀 Initializing FastAPI metrics with service: {SERVICE_NAME}")
try:
    init_steps_metrics(METRICS_FILE, SERVICE_NAME, DEBUG_METRICS)
    logger.info(f"✅ FastAPI step metrics initialized: {SERVICE_NAME}")
    
    # Test logging immediately to verify it works
    test_req_id = generate_request_id()
    step(test_req_id, "FASTAPI_MODULE_INIT", 0.0)
    logger.info(f"📊 Test metric logged for {SERVICE_NAME}")
    
except Exception as e:
    logger.error(f"❌ Failed to initialize FastAPI step metrics: {e}")
    raise


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Lifespan event handler replaces on_event startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init metrics, DB, and start RabbitMQ consumer

    create_lokalisasi_table()
    logger.info("Database tables ensured.")

    # Start RabbitMQ consumer in a daemon thread
    consumer_thread = threading.Thread(target=consume_rabbit, daemon=True)
    consumer_thread.start()
    logger.info("RabbitMQ consumer thread started.")

    yield
    # Shutdown cleanup (if needed)

    shutdown_req_id = generate_request_id()
    step(shutdown_req_id, "FASTAPI_SHUTDOWN", 0.0)
    logger.info(f"🛑 FastAPI shutdown - Service: {SERVICE_NAME}")

# Instantiate FastAPI app with lifespan handler
app = FastAPI(
    title="CetaSense Localization API",
    description="API for localization tasks using CetaSense",
    version="1.0.0",
    lifespan=lifespan
)

# CORS settings
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# RabbitMQ consumer thread reference
consumer_thread: Optional[threading.Thread] = None


# FIXED: Improved middleware dengan proper error handling dan context management
@app.middleware("http")
async def steps_timing_middleware(request: Request, call_next):
    """Enhanced middleware untuk steps timing dengan proper context management"""
    
    # Generate or get request ID
    req_id = request.headers.get("X-Request-Id") or generate_request_id()
    
    # Set request ID context
    set_request_id(req_id)
    
    # Create route identifier
    method = request.method
    route = str(request.url.path)
    route_name = route.replace('/', '_').replace('-', '_').strip('_').upper()
    if not route_name:
        route_name = "ROOT"
    
    step_name_start = f"PYTHON_{method}_{route_name}_START"
    step_name_success = f"PYTHON_{method}_{route_name}_SUCCESS"
    step_name_error = f"PYTHON_{method}_{route_name}_ERROR"
    
    start_time = time.time()
    
    # Log start
    logger.info(f"➡️ [{req_id}] {method} {route} - START")
    start_ts = time.time()
    await async_step(req_id, step_name_start, 0.0)

    try:
        response = await call_next(request)
        duration = (time.time() - start_ts) * 1000
        # Log success
        await async_step(req_id, step_name_success, duration)
        logger.info(f"✅ [{req_id}] {method} {route} - SUCCESS ({duration:.2f}ms)")

        # Add headers
        response.headers.update({
            "X-Instance-ID": INSTANCE_ID,
            "X-Service-Type": SERVICE_NAME,
            "X-Request-Id": req_id,
        })
        return response

    except Exception as exc:
        duration = (time.time() - start_ts) * 1000
        await async_step(req_id, step_name_error, duration)
        logger.error(f"❌ [{req_id}] {method} {route} - ERROR ({duration:.2f}ms): {exc}")
        raise
    

# Health endpoint untuk load balancer
@app.get("/localize/health")
async def health_check(response: Response): 
    req_id = generate_request_id()

    try :
        await async_step(req_id, "HEALTH_CHECK_START", 0.0)
        if DEBUG_METRICS:
            logger.info(f"📊 Health check logged for {req_id}")
    except Exception as e:
        logger.error(f"❌ Failed to log health check start step: {e}")
    
    # Headers untuk nginx load balancer tracking
    response.headers["X-Instance-ID"] = INSTANCE_ID
    response.headers["X-Service-Type"] = SERVICE_NAME
    response.headers["X-Request-Id"] = req_id
    
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "instance": INSTANCE_ID,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.post("/localize", response_model=LocalizeRequest, status_code=202)
async def enqueue(req: LocalizeRequest):
    """
    Enqueue a localization request.
    """
    job_id = str(uuid.uuid4()).hex  # type: ignore
    req_id = get_request_id() or generate_request_id()
    set_request_id(req_id)
    await async_step(req_id, "ENQUEUE_LOCALIZATION_REQUEST_START", 0.0)
    task_start_time = time.time()
    logger.info(f"Enqueuing localization job {job_id} for request ID {req_id}")

    try:
        start_validate = time.time()
        async with AsyncStepTimer(req_id, "VALIDATE_AND_INSERT_JOB"):
            with transaction() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT id FROM data_csv WHERE id=%s", (req.id_data,)
                    )
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Data not found")
                    
                    cursor.execute(
                        "SELECT id FROM metodelokalisasi WHERE id=%s", (req.id_metode,)
                    )
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Metode not found")

                    cursor.execute(
                        "SELECT id FROM ruangan WHERE id=%s", (req.id_ruangan,)
                    )
                    if not cursor.fetchone():
                        raise HTTPException(status_code=404, detail="Ruangan not found")

                    cursor.execute(
                        "INSERT INTO lokalisasi_jobs (id, id_data, id_metode, id_ruangan, status, created_at, updated_at)"
                        " VALUES (%s, %s, %s, %s, 'queued', %s, %s)",
                        (job_id, req.id_data, req.id_metode, req.id_ruangan, datetime.now(), datetime.now())
                    )
        end_validate = time.time()
        logger.info(f"VALIDATE_AND_INSERT_JOB completed in {(end_validate - start_validate) * 1000:.2f}ms")

        start_queue = time.time()
        async with AsyncStepTimer(req_id, "QUEUE_CELERY_TASK"):
            localize_task.apply_async(args=[job_id], task_id=job_id)  # type: ignore
        end_queue = time.time()
        logger.info(f"QUEUE_CELERY_TASK completed in {(end_queue - start_queue) * 1000:.2f}ms")
        
        logger.info(f"Job {job_id} inserted and task queued")
        overall_duration = (time.time() - task_start_time) * 1000
        await async_step(req_id, "ENQUEUE_LOCALIZATION_REQUEST_SUCCESS", overall_duration)
        logger.info(f"ENQUEUE process completed in {overall_duration:.2f}ms")
        return {"job_id": job_id, "status": "queued", "created_at": datetime.now().isoformat()}
        
    except HTTPException as e:
        duration = (time.time() - task_start_time) * 1000
        await async_step(req_id, "ENQUEUE_LOCALIZATION_REQUEST_ERROR", duration)
        logger.info(f"ENQUEUE_LOCALIZATION_REQUEST_ERROR occurred after {duration:.2f}ms")
        raise
    except Exception as e:
        duration = (time.time() - task_start_time) * 1000
        await async_step(req_id, "ENQUEUE_LOCALIZATION_REQUEST_ERROR", duration)
        logger.error(f"Error processing localization request: {e} (after {duration:.2f}ms)")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.get("/status/{job_id}", response_model=dict)
async def get_status(job_id: str):
    """
    Get the status of a localization job.
    """
    req_id = get_request_id() or generate_request_id()

    cache_key = f"lok_status:{job_id}"
    task_start_time = time.time()
    await async_step(req_id, "GET_JOB_STATUS_START", 0)

    try:
        async with AsyncStepTimer(req_id, "CHECK_REDIS_CACHE"): # type: ignore
            redis_start = time.time()
            cached_data = redis_client.hgetall(cache_key)

            if cached_data:
                elapsed = (time.time() - redis_start) * 1000
                logger.info(f"[{req_id}] Redis cache lookup took {elapsed:.2f}ms for job {job_id}")
                response = {
                    "job_id": job_id,
                    "status": cached_data.get("status"),
                    "updated_at": cached_data.get("updated_at"),
                    "from_cache": True
                }
                if "hasil_x" in cached_data and "hasil_y" in cached_data:
                    response["hasil_x"] = float(cached_data["hasil_x"])
                    response["hasil_y"] = float(cached_data["hasil_y"])
                if "error" in cached_data:
                    response["error_message"] = cached_data["error"]

                step(req_id, "GET_JOB_STATUS_CACHE_HIT", (time.time() - task_start_time) * 1000)
                logger.info(f"[{req_id}] Redis cache hit processed in {(time.time() - task_start_time) * 1000:.2f}ms")
                return response

        async with AsyncStepTimer(req_id, "QUERY_DATABASE"): # type: ignore
            db_start = time.time()
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT 
                            lj.status,
                            lj.created_at,
                            lj.updated_at,
                            lj.error_message,
                            hl.hasil_x,
                            hl.hasil_y
                        FROM lokalisasi_jobs lj
                        LEFT JOIN hasil_lokalisasi hl ON hl.job_id = lj.id
                        WHERE lj.id = %s
                    """, (job_id,))

                    row = cursor.fetchone()
                    if not row:
                        elapsed = (time.time() - db_start) * 1000
                        logger.info(f"[{req_id}] Database query took {elapsed:.2f}ms and found no record for job {job_id}")
                        await async_step(req_id, "GET_JOB_STATUS_NOT_FOUND", (time.time() - task_start_time) * 1000)
                        raise HTTPException(status_code=404, detail="Job not found")

                    response = {
                        "job_id": job_id,
                        "status": row['status'],
                        "created_at": row['created_at'].isoformat() if row['created_at'] else None,
                        "updated_at": row['updated_at'].isoformat() if row['updated_at'] else None,
                        "from_cache": False
                    }

                    if row['status'] == 'done':
                        response.update({
                            "hasil_x": float(row['hasil_x']) if row['hasil_x'] is not None else 0.0,
                            "hasil_y": float(row['hasil_y']) if row['hasil_y'] is not None else 0.0,
                        })
                    elif row['status'] == 'error':
                        response["error_message"] = row['error_message'] or "Unknown error"

                    elapsed = (time.time() - db_start) * 1000
                    logger.info(f"[{req_id}] Database query completed in {elapsed:.2f}ms for job {job_id}")
                    await async_step(req_id, "GET_JOB_STATUS_SUCCESS", (time.time() - task_start_time) * 1000)
                    return response

    except HTTPException:
        await async_step(req_id, "GET_JOB_STATUS_ERROR", (time.time() - task_start_time) * 1000)
        logger.info(f"[{req_id}] HTTPException encountered after {(time.time() - task_start_time) * 1000:.2f}ms for job {job_id}")
        raise
    except Exception as e:
        await async_step(req_id, "GET_JOB_STATUS_ERROR", (time.time() - task_start_time) * 1000)
        logger.error(f"Error retrieving job status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/debug/metrics")
async def debug_metrics():
    """Debug endpoint untuk test metrics logging"""
    req_id = generate_request_id()
    
    try:
        await async_step(req_id, "DEBUG_METRICS_TEST", 0.0)
        
        # Test with StepTimer
        async with AsyncStepTimer(req_id, "DEBUG_TIMER_TEST"):
            await asyncio.sleep(0.1)  # Simulate work
        
        return {
            "status": "success",
            "req_id": req_id,
            "service": SERVICE_NAME,
            "metrics_file": METRICS_FILE,
            "debug_mode": DEBUG_METRICS
        }
    except Exception as e:
        logger.error(f"Debug metrics error: {e}")
        return {"status": "error", "error": str(e)}
    
@app.get("/jobs")
async def list_jobs(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    List all localization jobs.
    """
    req_id = get_request_id() or generate_request_id()
    set_request_id(req_id)
    
    task_start_time = time.time()
    await async_step(req_id, "LIST_JOBS_START", 0)
    
    try:
        async with AsyncStepTimer(req_id, "LIST_JOBS_QUERY"): # type: ignore
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    query = """
                        SELECT 
                        lj.id,
                        lj.status,
                        lj.created_at,
                        lj.updated_at,
                        lj.id_data,
                        lj.id_metode,
                        lj.id_ruangan,
                        r.nama_ruangan,
                        ml.metode
                        FROM lokalisasi_jobs lj
                        LEFT JOIN ruangan r ON lj.id_ruangan = r.id
                        LEFT JOIN metodelokalisasi ml ON lj.id_metode = ml.id
                    """
                    params = []

                    if status:
                        query += " WHERE lj.status = %s"
                        params.append(status)

                    query += " ORDER BY lj.created_at DESC LIMIT %s OFFSET %s"
                    params.extend([limit, offset])

                    cursor.execute(query, params)
                    jobs = cursor.fetchall()

                    count_query = """
                        SELECT COUNT(*) as total FROM lokalisasi_jobs
                    """
                    if status:
                        count_query += " WHERE status = %s"
                        cursor.execute(count_query, (status,))
                    else:
                        cursor.execute(count_query)
                    total_count = cursor.fetchone()['total']

                    await async_step(req_id, "LIST_JOBS_SUCCESS", (time.time() - task_start_time) * 1000)
                    return {
                        "jobs": [job['id'] for job in jobs],
                        "status": [job['status'] for job in jobs],
                        "created_at": [job['created_at'].isoformat() if job['created_at'] else None for job in jobs],
                        "updated_at": [job['updated_at'].isoformat() if job['updated_at'] else None for job in jobs],
                        "ruangan": [job['nama_ruangan'] for job in jobs],
                        "metode": [job['metode'] for job in jobs],
                        "total": total_count
                    }
    except Exception as e:
        await async_step(req_id, "LIST_JOBS_ERROR", (time.time() - task_start_time) * 1000)
        logger.error(f"Error listing jobs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/localize/stream/{job_id}")
async def stream_job_updates(job_id: str):
    """Server-sent events endpoint for real-time job updates"""
    async def event_generator():
        req_id = get_request_id() or generate_request_id()
        set_request_id(req_id)
        
        task_start_time = time.time()
        await async_step(req_id, "STREAM_JOB_UPDATES_START", 0)
        logger.info(f"STREAM_JOB_UPDATES START - req_id: {req_id}, job_id: {job_id}")
        
        # Subscribe to Redis channel
        pubsub = redis_client.pubsub()
        channel = f"lok_notify:{job_id}"
        pubsub.subscribe(channel)
        
        try:
            # Send initial status
            status = get_status(job_id)
            elapsed = (time.time() - task_start_time) * 1000
            logger.info(f"Initial status sent after {elapsed:.2f}ms for job {job_id}, req_id: {req_id}")
            yield f"data: {json.dumps(status)}\n\n"
            
            # Listen for updates
            while True:
                msg_start = time.time()
                msg = pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                if msg and msg['type'] == 'message':
                    data = msg['data']
                    if isinstance(data, (bytes, bytearray)):
                        data = data.decode('utf-8')
                    elapsed_msg = (time.time() - msg_start) * 1000
                    logger.info(f"Message received in {elapsed_msg:.2f}ms for job {job_id}, req_id: {req_id}")
                    yield f"data: {data}\n\n"
        except asyncio.CancelledError:
            elapsed = (time.time() - task_start_time) * 1000
            await async_step(req_id, "STREAM_JOB_UPDATES_CANCELLED", elapsed)
            logger.info(f"STREAM_JOB_UPDATES CANCELLED after {elapsed:.2f}ms for job {job_id}, req_id: {req_id}")
            pass
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()
            elapsed = (time.time() - task_start_time) * 1000
            await async_step(req_id, "STREAM_JOB_UPDATES_END", elapsed)
            logger.info(f"STREAM_JOB_UPDATES ended after {elapsed:.2f}ms for job {job_id}, req_id: {req_id}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.delete("/jobs/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a queued job"""
    req_id = get_request_id() or generate_request_id()
    
    task_start_time = time.time()
    await async_step(req_id, "CANCEL_JOB_START", 0)

    try:
        with AsyncStepTimer(req_id, "CANCEL_JOB_TRANSACTION"): # type: ignore
            with transaction() as conn:
                with conn.cursor() as cursor:
                    # Check current status
                    cursor.execute("SELECT status FROM lokalisasi_jobs WHERE id=%s", (job_id,))
                    row = cursor.fetchone()
                    
                    if not row:
                        await async_step(req_id, "CANCEL_JOB_NOT_FOUND", (time.time() - task_start_time) * 1000)
                        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
                    
                    if row['status'] != 'queued':
                        await async_step(req_id, "CANCEL_JOB_INVALID_STATUS", (time.time() - task_start_time) * 1000)
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Cannot cancel job with status '{row['status']}'"
                        )
                    
                    # Update status to cancelled
                    cursor.execute(
                        "UPDATE lokalisasi_jobs SET status=%s, updated_at=%s WHERE id=%s",
                        ("cancelled", datetime.now(), job_id)
                    )
        
        # Revoke Celery task
        celery.control.revoke(job_id, terminate=True) # type: ignore
        
        await async_step(req_id, "CANCEL_JOB_SUCCESS", (time.time() - task_start_time) * 1000)
        return {"job_id": job_id, "status": "cancelled"}
        
    except HTTPException:
        raise
    except Exception as e:
        await async_step(req_id, "CANCEL_JOB_ERROR", (time.time() - task_start_time) * 1000)
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel job")
    
@app.get("/stats")
async def get_statistics():
    """Get system statistics"""
    req_id = get_request_id()
    if not req_id:
        req_id = generate_request_id()
        set_request_id(req_id)
    
    task_start_time = time.time()
    step(req_id, "GET_STATISTICS_START", 0)
    
    try:
        with StepTimer(req_id, "GET_STATISTICS_QUERY"): # type: ignore
            with get_db_connection() as conn:
                with conn.cursor() as cursor:
                    # Get job statistics
                    cursor.execute("""
                        SELECT 
                            status,
                            COUNT(*) as count
                        FROM lokalisasi_jobs
                        GROUP BY status
                    """)
                    status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
                    
                    # Get recent completion times
                    cursor.execute("""
                        SELECT 
                            AVG(TIMESTAMPDIFF(SECOND, lj.created_at, lj.updated_at)) as avg_duration
                        FROM lokalisasi_jobs lj
                        WHERE lj.status = 'done'
                        AND lj.updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                    """)
                    avg_duration = cursor.fetchone()['avg_duration']
                    
                    # Get success rate
                    cursor.execute("""
                        SELECT 
                            COUNT(CASE WHEN status = 'done' THEN 1 END) * 100.0 / 
                            COUNT(CASE WHEN status IN ('done', 'failed') THEN 1 END) as success_rate
                        FROM lokalisasi_jobs
                        WHERE updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
                    """)
                    success_rate = cursor.fetchone()['success_rate']
        
        step(req_id, "GET_STATISTICS_SUCCESS", (time.time() - task_start_time) * 1000)
        return {
            "job_counts": status_counts,
            "avg_processing_time_seconds": avg_duration,
            "success_rate_24h": float(success_rate) if success_rate else 0.0,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        step(req_id, "GET_STATISTICS_ERROR", (time.time() - task_start_time) * 1000)
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        log_config=None,    # pakai logger Anda sendiri
        log_level="info",
    )