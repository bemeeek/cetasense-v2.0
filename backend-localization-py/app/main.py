from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
import uuid
import os
import threading
import json
import asyncio
from typing import Optional
from datetime import datetime
import logging
import celery
import uvicorn # type: ignore
import signal
from .rabbit_consumer import signal_handler

from .db import get_connection, get_db_connection, transaction
from .models import LocalizeRequest, create_lokalisasi_table
from .tasks import localize_task
from .setup_redis import redis_client
from .rabbit_consumer import main as consume_rabbit

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

app = FastAPI(
    title="CetaSense Localization API",
    description="API for localization tasks using CetaSense",
    version="1.0.0",
)

# CORS configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

consumer_thread: Optional[threading.Thread] = None

def startup_event():
    """
    Startup event to initialize the database and start the RabbitMQ consumer.
    """
    global consumer_thread
    consumer_thread = threading.Thread(target=consume_rabbit, daemon=True)
    consumer_thread.start()
    logger.info("RabbitMQ consumer thread started.")

def on_startup():
    """
    FastAPI startup event handler.
    Initializes the database and starts the RabbitMQ consumer.
    """
    try :
        create_lokalisasi_table()
        startup_event()
        logger.info("CetaSense Localization API started successfully.")
    except Exception as e:
        logger.error(f"Error starting CetaSense Localization API: {e}")
        raise

app.add_event_handler("startup", on_startup)

@app.get("/health", response_model=dict)
def health_check():
    """
    Health check endpoint.
    """
    health_status = {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": {}
    }

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result:
                    health_status["service"]["database"] = "ok"
                else:
                    health_status["service"]["database"] = "error"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["service"]["database"] = "error"

    try:
        redis_client.ping()
        health_status["service"]["redis"] = "healthy"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["service"]["redis"] = "unhealthy"

    if consumer_thread and consumer_thread.is_alive():
        health_status["service"]["rabbitmq_consumer"] = "healthy"
    else:
        health_status["service"]["rabbitmq_consumer"] = "unhealthy"
        health_status["status"] = "degraded"

    status_code = 200 if health_status["status"] == "ok" else 503
    return Response(content=json.dumps(health_status), media_type="application/json", status_code=status_code)

@app.post("/localize", response_model=LocalizeRequest, status_code=202)
def enqueue(req: LocalizeRequest):
    """
    Enqueue a localization request.
    """
    job_id = str(uuid.uuid4()).hex # type: ignore # Generate a unique job ID

    try:
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
            localize_task.apply_async(args=[job_id], task_id=job_id)  # type: ignore
            logger.info(f"Job {job_id} inserted and task queued")

            return {"job_id": job_id, "status": "queued", "created_at": datetime.now().isoformat()}
        
    except HTTPException as e:
        raise
    except Exception as e:
        logger.error(f"Error processing localization request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
@app.get("/status/{job_id}", response_model=dict)
def get_status(job_id: str):
    """
    Get the status of a localization job.
    """
    cache_key = f"lokalisasi_job_status:{job_id}"
    cached_data = redis_client.get(cache_key)

    if cached_data and cached_data.get("status"):
        response = {
            "job_id": job_id,
            "status": cached_data["status"],
            "created_at": cached_data.get("created_at"),
            "updated_at": cached_data.get("updated_at"),
            "from_cache": True
        }

        if cached_data["status"] == "done":
            response.update({
                "hasil_x": float(cached_data.get("hasil_x", 0)),
                "hasil_y": float(cached_data.get("hasil_y", 0)),
            })
        elif cached_data["status"] == "error":
            response["error_message"] = cached_data.get("error_message", "Unknown error")

        return response
    
    try:
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

                return response
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving job status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/jobs")
def list_jobs(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    List all localization jobs.
    """
    try :
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
                    lj.id_ruangan
                    r.nama_ruangan,
                    ml.metode
                    FROM lokalisasi_jobs lj
                    LEFT JOIN ruangan r ON lj.id_ruangan = r.id
                    LEFT JOIN metode_lokalisasi ml ON lj.id_metode = ml.id
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

                total = cursor.fetchone()['total']

                return {
                    "jobs": [job['id'] for job in jobs],
                    "status": [job['status'] for job in jobs],
                    "created_at": [job['created_at'].isoformat() if job['created_at'] else None for job in jobs],
                    "updated_at": [job['updated_at'].isoformat() if job['updated_at'] else None for job in jobs],
                    "ruangan": [job['nama_ruangan'] for job in jobs],
                    "metode": [job['metode'] for job in jobs],
                }
    except Exception as e:
        logger.error(f"Error listing jobs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/stream/{job_id}")
async def stream_job_updates(job_id: str):
    """Server-sent events endpoint for real-time job updates"""
    async def event_generator():
        # Subscribe to Redis channel
        pubsub = redis_client.pubsub()
        channel = f"lok_notify:{job_id}"
        pubsub.subscribe(channel)
        
        try:
            # Send initial status
            status = get_status(job_id)
            yield f"data: {json.dumps(status)}\n\n"
            
            # Listen for updates
            while True:
                message = pubsub.get_message(timeout=1.0)
                
                if message and message['type'] == 'message':
                    yield f"data: {message['data']}\n\n"
                    
                    # Check if job is complete
                    data = json.loads(message['data'])
                    if data.get('status') in ['done', 'failed']:
                        break
                
                # Send heartbeat every 30 seconds
                await asyncio.sleep(0.1)
                
        except asyncio.CancelledError:
            pass
        finally:
            pubsub.unsubscribe(channel)
            pubsub.close()
    
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
def cancel_job(job_id: str):
    """Cancel a queued job"""
    try:
        with transaction() as conn:
            with conn.cursor() as cursor:
                # Check current status
                cursor.execute("SELECT status FROM lokalisasi_jobs WHERE id=%s", (job_id,))
                row = cursor.fetchone()
                
                if not row:
                    raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
                
                if row['status'] != 'queued':
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
        
        return {"job_id": job_id, "status": "cancelled"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel job")
    
@app.get("/stats")
def get_statistics():
    """Get system statistics"""
    try:
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
        
        return {
            "job_counts": status_counts,
            "avg_processing_time_seconds": avg_duration,
            "success_rate_24h": float(success_rate) if success_rate else 0.0,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)
    
    