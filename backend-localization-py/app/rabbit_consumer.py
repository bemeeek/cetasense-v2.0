import os, json
import pika # type: ignore
from app.db import get_connection, transaction, with_db_retry
from .tasks import localize_task
import time
from datetime import datetime
from .models import LocalizeRequest
from pydantic import ValidationError
import logging
import signal
import sys

from .simple_step_metrics import (
    init_steps_metrics, 
    step, 
    set_request_id, 
    generate_request_id,
    StepTimer
)

METRICS_FILE = os.getenv("METRICS_FILE", "step_metrics.csv")  # Use the same file as Golang
SERVICE_NAME = "rabbitmq_consumer"
DEBUG_METRICS = os.getenv("DEBUG_METRICS", "false").lower() == "true"

# Configure logging
logger = logging.getLogger(__name__)

# RABBIT_URL = os.getenv("amqp://guest:guest@localhost:5672//")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE_NAME", "lok_requests")  # Default to 'lok_requests' if not set

prefetch = int(os.getenv("RABBITMQ_PREFETCH", 1))  # Default to 1 if not set

class RabbitMQConsumer:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.should_stop = False

        try:
            # FIXED: Explicit service name initialization
            init_steps_metrics(METRICS_FILE, SERVICE_NAME, DEBUG_METRICS)
            logger.info(f"✅ RabbitMQ Consumer step metrics initialized: {SERVICE_NAME}")
            
            # Test logging immediately
            test_req_id = generate_request_id()
            step(test_req_id, "RABBITMQ_CONSUMER_INIT", 0.0)
            logger.info(f"📊 Test metric logged for {SERVICE_NAME}")
            
        except Exception as e:
            logger.error(f"Failed to initialize step metrics: {e}")

    def connect(self):
        host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        port = int(os.getenv("RABBITMQ_PORT", 5672))
        username = os.getenv("RABBITMQ_DEFAULT_USER", "rabbit")
        password = os.getenv("RABBITMQ_DEFAULT_PASS", "secret123")

        logger.info(f"Connecting to RabbitMQ at {host}:{port} with user {username}")

        try:
            credentials = pika.PlainCredentials(username, password)
            params = pika.ConnectionParameters(
                host=host,
                port=port,
                virtual_host="/",
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300,
        )
            self.connection = pika.BlockingConnection(params)
            self.channel = self.connection.channel()
            self.channel.queue_declare(queue=QUEUE_NAME, durable=True)
            self.channel.basic_qos(prefetch_count=prefetch)
            logger.info(f"Connected to RabbitMQ at {host}:{port}, waiting for messages in {QUEUE_NAME}...")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
    
    def process_message(self, ch, method, properties, body):
        req_id = None
        task_start_time = time.time()
        try :
            try :
                data = json.loads(body)
                req_id = generate_request_id()
                set_request_id(req_id)

                # 2) Baru log START dengan req_id yang sudah tersedia
                step(req_id, "RABBITMQ_CONSUMER_PROCESS_MESSAGE_START", 0.0)
                job_id = data.get("job_id")
                if not job_id:
                    logger.warning("Received message without job_id, skipping")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                id_data = data.get("id_data")
                if not id_data:
                    logger.warning("Received message without id_data, skipping")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                id_metode = data.get("id_metode")
                if not id_metode:
                    logger.warning("Received message without id_metode, skipping")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                id_ruangan = data.get("id_ruangan")
                if not id_ruangan:
                    logger.warning("Received message without id_ruangan, skipping")
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return
                created_at = datetime.now()
            except (json.JSONDecodeError, ValueError) as e:
                logger.error(f"Failed to decode message body: {e}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return
            total_task_time = (time.time() - task_start_time) * 1000
            step(req_id, "RABBITMQ_CONSUMER_MESSAGE_SUCCESS", total_task_time)  # Log success step
            logger.info(f"Received job_id={job_id}, id_data={id_data}, id_metode={id_metode}, id_ruangan={id_ruangan}, created_at={created_at}")

            @with_db_retry(max_retries=3, delay=2)
            def insert_job():
                with StepTimer(req_id, "INSERT_JOB_TO_MARIADB"):
                    with transaction() as conn:
                        with conn.cursor() as cursor:
                            cursor.execute(
                                "SELECT id FROM lokalisasi_jobs WHERE id=%s",
                                (job_id,)
                            )
                            if cursor.fetchone():
                                logger.warning(f"Job {job_id} already exists, skipping insert")
                                return
                            cursor.execute(
                                "INSERT INTO lokalisasi_jobs (id, id_data, id_metode, id_ruangan, status, created_at, updated_at)"
                                " VALUES (%s,%s,%s,%s,'queued',%s,%s)",
                                (job_id, id_data, id_metode, id_ruangan, created_at, created_at)
                            )
                            return True
            
            if insert_job():
                localize_task.apply_async(args=[job_id], task_id=job_id) # type: ignore
                logger.info(f"Job {job_id} inserted and task queued")

            ch.basic_ack(delivery_tag=method.delivery_tag)
            total_task_time = (time.time() - task_start_time) * 1000
            step(req_id, "RABBITMQ_CONSUMER_PROCESS_MESSAGE_SUCCESS", total_task_time)  # Log success
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag)

    def start_consuming(self):
        self.channel.basic_consume( # type: ignore
            queue=QUEUE_NAME,
            on_message_callback=self.process_message,
        )
        logger.info(f"[*] Waiting for messages in {QUEUE_NAME}. To exit press CTRL+C")

        try:
            self.channel.start_consuming() # type: ignore
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            self.channel.stop_consuming() # type: ignore
    
    def stop(self):
        logger.info("Stopping RabbitMQ consumer...")
        self.should_stop = True

        if self.channel:
            self.channel.stop_consuming()
        if self.connection and not self.connection.is_closed:
            self.connection.close()
        
        logger.info("RabbitMQ consumer stopped")

def signal_handler(signal, frame):
    logger.info("Signal received, stopping consumer...")
    sys.exit(0)

def main():
    consumer = RabbitMQConsumer()

    while True:
        try:
            consumer.connect()
            consumer.start_consuming()
        except pika.exceptions.ConnectionClosedByBroker as e: # type: ignore
            logger.error(f"Connection closed by broker: {e}")
            time.sleep(5)  # type: ignore # Wait before reconnecting
        except pika.exceptions.AMQPConnectionError as e: # type: ignore
            logger.error(f"AMQP connection error: {e}")
            time.sleep(5)  # type: ignore # Wait before reconnecting
        except pika.exceptions.ChannelClosed as e: # type: ignore
            logger.error(f"Channel closed: {e}")
            time.sleep(5) # type: ignore # Wait before reconnecting
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received, stopping consumer...")
            consumer.stop()
            break
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            time.sleep(5)  # type: ignore # Wait before reconnecting

            consumer.stop()

if __name__ == "__main__":
    main()