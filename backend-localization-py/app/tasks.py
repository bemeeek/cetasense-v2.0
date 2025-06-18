from datetime import datetime
import json
import subprocess
from .setup_celery import celery
from .db import get_connection
from .minio_helper import get_object

@celery.task(bind=True)
def localize_task(self, job_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Fetch job
            cursor.execute("SELECT * FROM lokalisasi_jobs WHERE id=%s", (job_id,))
            job = cursor.fetchone()
            if not job:
                raise ValueError("Job not found")

            # Update status to RUNNING
            cursor.execute(
                "UPDATE lokalisasi_jobs SET status='running', updated_at=%s WHERE id=%s",
                (datetime.utcnow(), job_id)
            )
            conn.commit()

        # Download files
        csv = get_object("data_csv", f"{job['id_data']}.csv") # type: ignore
        model = get_object("model", f"{job['id_metode']}.pkl") # type: ignore

        with open("/tmp/data.csv", "wb") as f:
            f.write(csv)
        with open("/tmp/model.pkl", "wb") as f:
            f.write(model)

        # Run localization
        out = subprocess.check_output([
            "python3",
            "python/localize.py",
            "--data_path", "/tmp/data.csv",
            "--model_path", "/tmp/model.pkl"
        ])
        res = json.loads(out)

        # Save results
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE lokalisasi_jobs SET hasil_x=%s, hasil_y=%s, status='done', updated_at=%s WHERE id=%s",
                (res["x"], res["y"], datetime.utcnow(), job_id)
            )
            conn.commit()

        return {"job_id": job_id, "hasil_x": res["x"], "hasil_y": res["y"]}

    except Exception:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE lokalisasi_jobs SET status='failed', updated_at=%s WHERE id=%s",
                (datetime.utcnow(), job_id)
            )
            conn.commit()
        raise
    finally:
        conn.close()