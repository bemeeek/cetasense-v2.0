import os, json
import pika # type: ignore
from app.db import get_connection
from .tasks import localize_task
from datetime import datetime


RABBIT_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/%2F")
QUEUE_NAME = os.getenv("RABBITMQ_QUEUE", "lok_requests")

def main():
    host = os.getenv("RABBITMQ_HOST", "localhost")
    port = int(os.getenv("RABBITMQ_PORT", 5672))
    username = os.getenv("RABBITMQ_USER", "rabbit")
    password = os.getenv("RABBITMQ_PASSWORD", "secret123")

    credentials = pika.PlainCredentials(username, password)
    params = pika.ConnectionParameters(
        host=host,
        port=port,
        virtual_host="/",
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )
    conn = pika.BlockingConnection(params)
    ch = conn.channel()
    ch.queue_declare(queue=QUEUE_NAME, durable=True)
    ch.basic_qos(prefetch_count=1)
    print(f"Waiting for messages in {QUEUE_NAME}...")
    
    def callback(ch, method, properties, body):
        req = json.loads(body)
        job_id, id_data, id_metode, id_ruangan = req.get("job_id"), req.get("id_data"), req.get("id_metode"), req.get("id_ruangan")
        print(f"Received job_id={job_id}, id_data={id_data}, id_metode={id_metode}, id_ruangan={id_ruangan}")
        if not job_id:
            print("Received message without job_id, skipping")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return
        db = get_connection()
        with db.cursor() as cursor:
            cursor.execute(
                "INSERT INTO lokalisasi_jobs (id, id_data, id_metode, id_ruangan, status, created_at, updated_at)"
                " VALUES (%s,%s,%s,%s,'queued',%s,%s)",
                (job_id, id_data, id_metode, id_ruangan, datetime.now(), datetime.now())
            )
            db.commit()
            db.close()

        localize_task.apply_async(args=[job_id], task_id=job_id)  # type: ignore
        ch.basic_ack(delivery_tag=method.delivery_tag)
    ch.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)
    print(f"[*] Waiting for messages in {QUEUE_NAME}. To exit press CTRL+C")
    try:
        ch.start_consuming()
    except KeyboardInterrupt:
        print("Stopping consumer...")
    finally:
        conn.close()

if __name__ == "__main__":
    main()