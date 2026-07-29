from __future__ import annotations

import argparse

from app.admin_bootstrap import promote_initial_admin
from app.config import settings
from app.database import SessionLocal


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Promote one existing active member as the first production administrator. "
            "The command refuses to run after any active administrator exists."
        )
    )
    parser.add_argument("--email", required=True, help="Email of an existing active member.")
    args = parser.parse_args()

    if settings.app_environment.lower() != "production":
        raise RuntimeError("Initial administrator bootstrap is allowed only with APP_ENVIRONMENT=production.")

    with SessionLocal() as db:
        user_id = promote_initial_admin(db, email=args.email)

    print({"status": "completed", "promoted_user_id": user_id})


if __name__ == "__main__":
    main()
