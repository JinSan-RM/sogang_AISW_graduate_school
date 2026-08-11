from __future__ import annotations

from dataclasses import dataclass


DELETED_USER_NICKNAME = "Deleted user"


@dataclass(frozen=True)
class AuthorDisplay:
    nickname: str
    cohort: str | None


def resolve_author_display(
    *,
    live_nickname: str | None,
    live_cohort: str | None,
    snapshot_nickname: str | None,
    snapshot_cohort: str | None,
) -> AuthorDisplay:
    """Prefer a live profile and fall back to the immutable writing-time snapshot."""

    if live_nickname is not None:
        return AuthorDisplay(nickname=live_nickname, cohort=live_cohort)
    return AuthorDisplay(
        nickname=snapshot_nickname or DELETED_USER_NICKNAME,
        cohort=snapshot_cohort,
    )
