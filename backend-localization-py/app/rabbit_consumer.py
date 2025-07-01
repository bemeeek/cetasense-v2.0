import os, json
import pika
from app.db import get_connection, transaction, with_db_retry
from .tasks import localize_task
from datetime import datetime, time
from .models import LocalizeRequest
from pydantic import ValidationError
import logging
import signal
import sys

# Configure logging
logger = logging.getLogger(__name__)

# RABBIT_URL = os.getenv("amqp://guest:guest@localhost:5672//")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE_NAME")

class RabbitMQConsumer:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.should_stop = False
    def connect(self):
        host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        port = int(os.getenv("RABBITMQ_PORT", 5672))
        username = os.getenv("RABBITMQ_DEFAULT_USER", "rabbit")
        password = os.getenv("RABBITMQ_DEFAULT_PASS", "secret123")

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
        self.channel.basic_qos(prefetch_count=1)
        logger.info(f"Connected to RabbitMQ at {host}:{port}, waiting for messages in {QUEUE_NAME}...")
    
    def process_message(self, ch, method, properties, body):
        try :
            try :
                data = json.loads(body)
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
            logger.info(f"Received job_id={job_id}, id_data={id_data}, id_metode={id_metode}, id_ruangan={id_ruangan}, created_at={created_at}")

            @with_db_retry(max_retries=3, delay=2)
            def insert_job():
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