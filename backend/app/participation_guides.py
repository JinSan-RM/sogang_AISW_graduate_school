from __future__ import annotations

import re


ADMIN_PARTICIPATION_BOARD_SLUGS = frozenset({"club-promo", "networking-programs"})

_PARTICIPATION_LINK_LINE = re.compile(
    r"^\s*(?:참여|가입|신청)\s*링크\s*(?::|：|-)?\s*(https?://\S+)\s*$",
    re.IGNORECASE,
)
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")


def normalize_participation_guide(
    board_slug: str,
    content: str,
    metadata: dict | None,
) -> tuple[str, dict | None]:
    """Keep participation URLs in CTA metadata, never as a duplicate body line."""

    if board_slug not in ADMIN_PARTICIPATION_BOARD_SLUGS:
        return content, metadata

    normalized_metadata = dict(metadata or {})
    application_url = str(normalized_metadata.get("application_url") or "").strip()
    retained_lines: list[str] = []
    extracted_url: str | None = None

    for line in content.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        match = _PARTICIPATION_LINK_LINE.fullmatch(line)
        if match:
            extracted_url = extracted_url or match.group(1)
            continue
        retained_lines.append(line)

    if not application_url and extracted_url:
        normalized_metadata["application_url"] = extracted_url

    visible_content = _EXCESS_BLANK_LINES.sub("\n\n", "\n".join(retained_lines)).strip()
    return visible_content, normalized_metadata or None
