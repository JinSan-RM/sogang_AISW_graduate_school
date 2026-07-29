"""Run notification jobs once per day in Asia/Seoul.

The underlying reminder and receipt jobs are idempotent. Running more than one
worker is safe, but production should keep a single scheduler replica.
"""

from datetime import datetime, timedelta
import os
from pathlib import Path
import subprocess
import sys
import time
from zoneinfo import ZoneInfo

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.monitoring import send_operational_alert

SEOUL = ZoneInfo("Asia/Seoul")


def _next_run(now: datetime, hour: int, minute: int) -> datetime:
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return target if target > now else target + timedelta(days=1)


def _run_once() -> None:
    completed = subprocess.run(
        [sys.executable, str(BACKEND_ROOT / "scripts" / "run_notification_jobs.py")],
        cwd=BACKEND_ROOT,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(f"notification job exited with {completed.returncode}")


def main() -> None:
    hour = int(os.getenv("NOTIFICATION_JOB_HOUR", "9"))
    minute = int(os.getenv("NOTIFICATION_JOB_MINUTE", "0"))
    run_on_start = os.getenv("NOTIFICATION_JOB_RUN_ON_START", "false").lower() == "true"
    if run_on_start:
        _run_once()

    while True:
        now = datetime.now(SEOUL)
        target = _next_run(now, hour, minute)
        print({"notification_scheduler_next_run": target.isoformat()}, flush=True)
        while True:
            remaining = (target - datetime.now(SEOUL)).total_seconds()
            if remaining <= 0:
                break
            time.sleep(min(remaining, 60))
        try:
            _run_once()
        except Exception as exc:
            print({"notification_scheduler_error": type(exc).__name__, "message": str(exc)}, flush=True)
            send_operational_alert(
                "worker.notification.failed",
                context={"error_type": type(exc).__name__},
            )
            time.sleep(300)


if __name__ == "__main__":
    main()
