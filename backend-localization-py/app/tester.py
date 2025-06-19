import uuid, json
import pika # type: ignore

# 1. Konfigurasi sesuai .env Anda
RABBIT_URL = "amqp://rabbit:secret123@localhost:5672/%2F"
QUEUE_NAME = "lok_requests"

# 2. Connect & deklarasi queue
params = pika.URLParameters(RABBIT_URL)
conn   = pika.BlockingConnection(params)
ch     = conn.channel()

# 3. Buat payload dengan job_id unik
job_id = uuid.uuid4().hex
payload = {
    "job_id":    job_id,
    "id_data":   "52dc68b4-1d83-4e11-bd6f-c632301155a6",
    "id_metode": "3d892871-8ba0-49ad-9829-549db1bb1169",
    "id_ruangan":"46fd1f97-5057-4001-8930-b22c55f33c8a"
}

# 4. Publish
ch.basic_publish(
    exchange="",
    routing_key=QUEUE_NAME,
    body=json.dumps(payload),
    properties=pika.BasicProperties(delivery_mode=2)  # persistent
)
print(f"Published job_id={job_id} to {QUEUE_NAME}")
conn.close()
