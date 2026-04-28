from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine


def main() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    config = Config("alembic.ini")

    if "alembic_version" not in tables and "users" in tables:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "cohort" in user_columns and "media_assets" in tables:
            command.stamp(config, "head")
        else:
            command.stamp(config, "0001_phase1_init")

    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
