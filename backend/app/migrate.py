from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.database import engine


LEGACY_PHASE1_REVISION = "0001_phase1_init"
_MISSING = object()


@dataclass(frozen=True, order=True)
class ColumnSignature:
    type_name: str
    length: int | None
    nullable: bool | None
    server_default: str | None
    autoincrement: bool | None


@dataclass(frozen=True, order=True)
class ForeignKeySignature:
    constrained_columns: tuple[str, ...]
    referred_table: str
    referred_columns: tuple[str, ...]
    ondelete: str | None


@dataclass(frozen=True)
class TableSignature:
    columns: tuple[tuple[str, ColumnSignature], ...]
    primary_key: tuple[str, ...]
    foreign_keys: tuple[ForeignKeySignature, ...]
    unique_constraints: tuple[tuple[str, ...], ...]


ColumnDefinition = (
    tuple[str, str, int | None, bool]
    | tuple[str, str, int | None, bool, str]
)


def _expected_columns(
    table_name: str,
    *definitions: ColumnDefinition,
) -> tuple[tuple[str, ColumnSignature], ...]:
    columns = []
    for definition in definitions:
        name, type_name, length, nullable, *default_values = definition
        server_default = default_values[0] if default_values else None
        if name == "id":
            server_default = server_default or f"sequence:{table_name}_id_seq"
        columns.append(
            (
                name,
                ColumnSignature(
                    type_name=type_name,
                    length=length,
                    nullable=nullable,
                    server_default=server_default,
                    autoincrement=name == "id",
                ),
            )
        )
    return tuple(sorted(columns))


def _foreign_key(
    constrained_column: str,
    referred_table: str,
    referred_column: str = "id",
    *,
    ondelete: str | None = None,
) -> ForeignKeySignature:
    return ForeignKeySignature(
        constrained_columns=(constrained_column,),
        referred_table=referred_table,
        referred_columns=(referred_column,),
        ondelete=ondelete,
    )


def _expected_table(
    columns: tuple[tuple[str, ColumnSignature], ...],
    *,
    foreign_keys: tuple[ForeignKeySignature, ...] = (),
    unique_constraints: tuple[tuple[str, ...], ...] = (),
) -> TableSignature:
    return TableSignature(
        columns=columns,
        primary_key=("id",),
        foreign_keys=tuple(sorted(foreign_keys)),
        unique_constraints=tuple(sorted(tuple(sorted(columns)) for columns in unique_constraints)),
    )


# This is the complete structural signature produced by 0001_phase1_init.py.
# Constraint names and PostgreSQL's implicit NO ACTION text are intentionally
# excluded because reflection can represent those differently without changing
# the schema. Everything that changes data shape or referential behavior is
# compared.
LEGACY_PHASE1_SIGNATURE: Mapping[str, TableSignature] = {
    "users": _expected_table(
        _expected_columns(
            "users",
            ("id", "integer", None, False),
            ("username", "varchar", 50, False),
            ("password_hash", "varchar", 255, False),
            ("nickname", "varchar", 50, False),
            ("major", "varchar", 100, True),
            ("phone", "varchar", 20, True),
            ("company", "varchar", 100, True),
            ("job_title", "varchar", 100, True),
            ("position", "varchar", 100, True),
            ("email", "varchar", 100, False),
            ("profile_image_url", "varchar", 500, True),
            ("role", "varchar", 20, False, "string:user"),
            ("is_active", "boolean", None, False, "boolean:true"),
            ("created_at", "timestamp", None, False, "now"),
            ("updated_at", "timestamp", None, False, "now"),
        ),
        unique_constraints=(("username",), ("email",)),
    ),
    "boards": _expected_table(
        _expected_columns(
            "boards",
            ("id", "integer", None, False),
            ("name", "varchar", 100, False),
            ("slug", "varchar", 100, False),
            ("category", "varchar", 50, False),
            ("description", "text", None, True),
            ("sort_order", "integer", None, False, "integer:0"),
            ("is_active", "boolean", None, False, "boolean:true"),
            ("created_at", "timestamp", None, False, "now"),
        ),
        unique_constraints=(("slug",),),
    ),
    "posts": _expected_table(
        _expected_columns(
            "posts",
            ("id", "integer", None, False),
            ("board_id", "integer", None, False),
            ("author_id", "integer", None, False),
            ("title", "varchar", 200, False),
            ("content", "text", None, False),
            ("is_pinned", "boolean", None, False, "boolean:false"),
            ("is_notice", "boolean", None, False, "boolean:false"),
            ("view_count", "integer", None, False, "integer:0"),
            ("like_count", "integer", None, False, "integer:0"),
            ("comment_count", "integer", None, False, "integer:0"),
            ("created_at", "timestamp", None, False, "now"),
            ("updated_at", "timestamp", None, False, "now"),
        ),
        foreign_keys=(
            _foreign_key("board_id", "boards"),
            _foreign_key("author_id", "users"),
        ),
    ),
    "comments": _expected_table(
        _expected_columns(
            "comments",
            ("id", "integer", None, False),
            ("post_id", "integer", None, False),
            ("author_id", "integer", None, False),
            ("parent_id", "integer", None, True),
            ("content", "text", None, False),
            ("created_at", "timestamp", None, False, "now"),
            ("updated_at", "timestamp", None, False, "now"),
        ),
        foreign_keys=(
            _foreign_key("post_id", "posts", ondelete="CASCADE"),
            _foreign_key("author_id", "users"),
            _foreign_key("parent_id", "comments", ondelete="CASCADE"),
        ),
    ),
    "likes": _expected_table(
        _expected_columns(
            "likes",
            ("id", "integer", None, False),
            ("user_id", "integer", None, False),
            ("post_id", "integer", None, False),
            ("created_at", "timestamp", None, False, "now"),
        ),
        foreign_keys=(
            _foreign_key("user_id", "users"),
            _foreign_key("post_id", "posts", ondelete="CASCADE"),
        ),
        unique_constraints=(("user_id", "post_id"),),
    ),
    "bookmarks": _expected_table(
        _expected_columns(
            "bookmarks",
            ("id", "integer", None, False),
            ("user_id", "integer", None, False),
            ("post_id", "integer", None, False),
            ("created_at", "timestamp", None, False, "now"),
        ),
        foreign_keys=(
            _foreign_key("user_id", "users"),
            _foreign_key("post_id", "posts", ondelete="CASCADE"),
        ),
        unique_constraints=(("user_id", "post_id"),),
    ),
}


def _normalize_column_type(column_type: object) -> tuple[str, int | None]:
    raw_type_name = getattr(column_type, "__visit_name__", None) or type(column_type).__name__
    normalized_name = str(raw_type_name).strip().lower().replace("_", " ")
    normalized_name = re.sub(r"\s*\([^)]*\)\s*$", "", normalized_name)
    aliases = {
        "int": "integer",
        "int4": "integer",
        "integer": "integer",
        "string": "varchar",
        "varchar": "varchar",
        "character varying": "varchar",
        "text": "text",
        "bool": "boolean",
        "boolean": "boolean",
        "datetime": "timestamp",
        "timestamp": "timestamp",
        "timestamp without time zone": "timestamp",
    }
    type_name = aliases.get(normalized_name, normalized_name)
    if type_name == "timestamp" and bool(getattr(column_type, "timezone", False)):
        type_name = "timestamp with time zone"

    raw_length = getattr(column_type, "length", None)
    if raw_length is None:
        rendered_type = str(column_type)
        length_match = re.search(r"\(\s*(\d+)\s*\)", rendered_type)
        raw_length = length_match.group(1) if length_match is not None else None
    try:
        length = int(raw_length) if raw_length is not None else None
    except (TypeError, ValueError):
        length = None
    return type_name, length


def _normalize_nullable(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if value in (0, 1):
        return bool(value)
    return None


def _normalize_autoincrement(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "1"}:
            return True
        if normalized in {"false", "no", "0"}:
            return False
    return None


def _strip_outer_parentheses(value: str) -> str:
    expression = value.strip()
    while expression.startswith("(") and expression.endswith(")"):
        depth = 0
        in_quote = False
        encloses_entire_expression = True
        index = 0
        while index < len(expression):
            character = expression[index]
            if character == "'":
                if in_quote and index + 1 < len(expression) and expression[index + 1] == "'":
                    index += 2
                    continue
                in_quote = not in_quote
            elif not in_quote:
                if character == "(":
                    depth += 1
                elif character == ")":
                    depth -= 1
                    if depth == 0 and index != len(expression) - 1:
                        encloses_entire_expression = False
                        break
            index += 1
        if not encloses_entire_expression or depth != 0 or in_quote:
            break
        expression = expression[1:-1].strip()
    return expression


def _normalize_sequence_name(value: str) -> str:
    parts = [part.strip().strip('"') for part in value.split(".")]
    if len(parts) == 2 and parts[0].lower() == "public":
        parts = parts[1:]
    return ".".join(parts)


def _normalize_server_default(value: object) -> str | None:
    if value is _MISSING:
        return "missing"
    if value is None:
        return None

    expression = _strip_outer_parentheses(str(value))
    sequence_match = re.fullmatch(
        r"nextval\(\s*'(?P<sequence>[^']+)'\s*::\s*(?:pg_catalog\.)?regclass\s*\)",
        expression,
        flags=re.IGNORECASE,
    )
    if sequence_match is not None:
        sequence_name = _normalize_sequence_name(sequence_match.group("sequence"))
        return f"sequence:{sequence_name}"

    if re.fullmatch(r"(?:now\(\s*\)|current_timestamp(?:\(\s*\))?)", expression, flags=re.IGNORECASE):
        return "now"

    boolean_match = re.fullmatch(
        r"\(?\s*'?(?P<value>true|false|t|f)'?\s*\)?"
        r"(?:\s*::\s*(?:pg_catalog\.)?(?:bool|boolean))?",
        expression,
        flags=re.IGNORECASE,
    )
    if boolean_match is not None:
        boolean_value = boolean_match.group("value").lower() in {"true", "t"}
        return f"boolean:{str(boolean_value).lower()}"

    integer_match = re.fullmatch(
        r"\(?\s*'?(?P<value>[+-]?\d+)'?\s*\)?"
        r"(?:\s*::\s*(?:pg_catalog\.)?(?:int|int4|integer))?",
        expression,
        flags=re.IGNORECASE,
    )
    if integer_match is not None:
        return f"integer:{int(integer_match.group('value'))}"

    string_match = re.fullmatch(
        r"'(?P<value>(?:''|[^'])*)'"
        r"(?:\s*::\s*(?:pg_catalog\.)?(?:varchar|character\s+varying|text)(?:\(\d+\))?)?",
        expression,
        flags=re.IGNORECASE,
    )
    if string_match is not None:
        string_value = string_match.group("value").replace("''", "'")
        return f"string:{string_value}"

    return f"expression:{expression}"


def _normalize_column_names(value: object) -> tuple[str, ...]:
    if not isinstance(value, (list, tuple, set, frozenset)):
        return ()
    return tuple(sorted(str(column_name) for column_name in value))


def _normalize_ondelete(value: object) -> str | None:
    if value is None:
        return None
    normalized = " ".join(str(value).strip().upper().split())
    return None if normalized in {"", "NO ACTION"} else normalized


def _inspect_table_signature(inspector, table_name: str) -> TableSignature:
    primary_key_info = inspector.get_pk_constraint(table_name) or {}
    primary_key = _normalize_column_names(
        primary_key_info.get("constrained_columns", primary_key_info.get("column_names"))
    )

    columns = []
    for column in inspector.get_columns(table_name):
        type_name, length = _normalize_column_type(column.get("type"))
        columns.append(
            (
                str(column.get("name")),
                ColumnSignature(
                    type_name=type_name,
                    length=length,
                    nullable=_normalize_nullable(column.get("nullable")),
                    server_default=_normalize_server_default(column.get("default", _MISSING)),
                    autoincrement=_normalize_autoincrement(column.get("autoincrement")),
                ),
            )
        )

    foreign_keys = []
    for foreign_key in inspector.get_foreign_keys(table_name) or ():
        options = foreign_key.get("options") or {}
        referred_table = str(foreign_key.get("referred_table"))
        referred_schema = foreign_key.get("referred_schema")
        if referred_schema and str(referred_schema).lower() != "public":
            referred_table = f"{referred_schema}.{referred_table}"
        foreign_keys.append(
            ForeignKeySignature(
                constrained_columns=_normalize_column_names(foreign_key.get("constrained_columns")),
                referred_table=referred_table,
                referred_columns=_normalize_column_names(foreign_key.get("referred_columns")),
                ondelete=_normalize_ondelete(options.get("ondelete", foreign_key.get("ondelete"))),
            )
        )

    unique_constraints = []
    for unique_constraint in inspector.get_unique_constraints(table_name) or ():
        column_names = unique_constraint.get(
            "column_names",
            unique_constraint.get("constrained_columns"),
        )
        unique_constraints.append(_normalize_column_names(column_names))

    return TableSignature(
        columns=tuple(sorted(columns)),
        primary_key=primary_key,
        foreign_keys=tuple(sorted(foreign_keys)),
        unique_constraints=tuple(sorted(unique_constraints)),
    )


def _signature_mismatches(
    observed: Mapping[str, TableSignature],
) -> list[str]:
    mismatches = []
    for table_name, expected_table in LEGACY_PHASE1_SIGNATURE.items():
        observed_table = observed[table_name]
        if observed_table.columns != expected_table.columns:
            mismatches.append(f"{table_name}.columns")
        if observed_table.primary_key != expected_table.primary_key:
            mismatches.append(f"{table_name}.primary_key")
        if observed_table.foreign_keys != expected_table.foreign_keys:
            mismatches.append(f"{table_name}.foreign_keys")
        if observed_table.unique_constraints != expected_table.unique_constraints:
            mismatches.append(f"{table_name}.unique_constraints")
    return mismatches


def detect_unversioned_legacy_revision(inspector) -> str | None:
    """Return the only schema revision safe to stamp automatically.

    Empty and already-versioned databases need no stamp. Any other unversioned
    shape must stop: guessing a newer revision could silently skip required
    migrations and leave production data on a partially upgraded schema.
    """

    tables = frozenset(inspector.get_table_names())
    if not tables or "alembic_version" in tables:
        return None

    expected_tables = frozenset(LEGACY_PHASE1_SIGNATURE)
    mismatches: list[str] = []
    if tables == expected_tables:
        observed_signature = {
            table_name: _inspect_table_signature(inspector, table_name)
            for table_name in sorted(tables)
        }
        mismatches = _signature_mismatches(observed_signature)
        if not mismatches:
            return LEGACY_PHASE1_REVISION

    missing_tables = sorted(expected_tables - tables)
    unexpected_tables = sorted(tables - expected_tables)
    details = []
    if missing_tables:
        details.append(f"missing tables: {', '.join(missing_tables)}")
    if unexpected_tables:
        details.append(f"unexpected tables: {', '.join(unexpected_tables)}")
    if not details:
        details.append(f"schema mismatch in: {', '.join(mismatches)}")

    detail_text = "; ".join(details)
    raise RuntimeError(
        "Refusing to stamp an unversioned database with an unknown schema "
        f"({detail_text}). Back up the database, compare it with Alembic revisions, "
        "and stamp an explicitly verified revision before restarting."
    )


def run_migrations(*, inspector=None, config: Config | None = None) -> None:
    database_inspector = inspector if inspector is not None else inspect(engine)
    alembic_config = config if config is not None else Config("alembic.ini")
    legacy_revision = detect_unversioned_legacy_revision(database_inspector)
    if legacy_revision is not None:
        command.stamp(alembic_config, legacy_revision)
    command.upgrade(alembic_config, "head")


def main() -> None:
    run_migrations()


if __name__ == "__main__":
    main()
