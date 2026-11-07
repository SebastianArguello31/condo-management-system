import os
import sys
from pathlib import Path

from redis import Redis
from rq import Queue, SimpleWorker, Worker
from rq.timeouts import TimerDeathPenalty

backend_dir = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend_dir))

from app.core.config import Config

class WindowsWorker(SimpleWorker):
    death_penalty_class = TimerDeathPenalty

def main():
    connection = Redis.from_url(
        Config.REDIS_URL,
        socket_connect_timeout=5,
    )

    try:
        connection.ping()

        queue = Queue(
            "password-reset",
            connection=connection,
        )

        worker_class = WindowsWorker if os.name == "nt" else Worker

        worker = worker_class(
            [queue],
            connection=connection,
        )

        print("Worker iniciado. Esperando solicitudes de recuperación.")
        worker.work()
    finally:
        connection.close()

if __name__ == "__main__":
    main()