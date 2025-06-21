from celery import Celery
import os

BROKER = os.getenv("CELERY_BROKER_URL")
BACKEND = os.getenv("CELERY_RESULT_BACKEND", BROKER)

celery = Celery(
    "localizer",
    broker=os.getenv("CELERY_BROKER_URL", BROKER),
    backend=os.getenv("CELERY_RESULT_BACKEND", BACKEND),
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=3,
    task_concurrency=4
)

