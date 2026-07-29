"""Run idempotent event reminders and Expo receipt synchronization.

Schedule this command once per day after the database migration has completed.
"""

import argparse
from datetime import date, datetime, timedelta
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal
from app.account_deletion import purge_expired_account_deletion_receipts
from app.push import sync_push_receipts
from app.routers.events import _dispatch_for_date
from app.models.rate_limit import RateLimitBucket
from app.security import utc_now


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", help="Reminder base date in YYYY-MM-DD; defaults to today in Asia/Seoul")
    args = parser.parse_args()
    target_date = date.fromisoformat(args.date) if args.date else datetime.now(ZoneInfo("Asia/Seoul")).date()

    db = SessionLocal()
    try:
        reminders = _dispatch_for_date(db, target_date)
        receipts = sync_push_receipts(db)
        removed_account_deletion_receipts = purge_expired_account_deletion_receipts(db)
        removed_rate_limits = db.query(RateLimitBucket).filter(
            RateLimitBucket.updated_at < utc_now() - timedelta(days=2)
        ).delete(synchronize_session=False)
        db.commit()
        print(
            {
                "reminders": reminders,
                "receipts": receipts,
                "removed_rate_limits": removed_rate_limits,
                "removed_account_deletion_receipts": removed_account_deletion_receipts,
            }
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
