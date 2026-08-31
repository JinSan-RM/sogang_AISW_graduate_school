from __future__ import annotations

import re


ADMIN_PARTICIPATION_BOARD_SLUGS = frozenset({"club-promo", "networking-programs"})

_PARTICIPATION_LINK_LINE = re.compile(
    r"^\s*(?:참여|가입|신청)\s*링크\s*(?::|：|-)?\s*(https?://\S+)\s*$",
    re.IGNORECASE,
)


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

    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    index = 0
    while index < len(lines):
        line = lines[index]
        match = _PARTICIPATION_LINK_LINE.fullmatch(line)
        if match:
            extracted_url = extracted_url or match.group(1)
            following_index = index + 1
            while following_index < len(lines) and not lines[following_index].strip():
                following_index += 1
            preceding_blanks = 0
            for retained_line in reversed(retained_lines):
                if retained_line.strip():
                    break
                preceding_blanks += 1
            following_blanks = following_index - index - 1
            retained_lines.extend([""] * max(0, following_blanks - preceding_blanks))
            index = following_index
            continue
        retained_lines.append(line)
        index += 1

    if extracted_url is None:
        return content, metadata

    if not application_url and extracted_url:
        normalized_metadata["application_url"] = extracted_url

    visible_content = "\n".join(retained_lines).strip("\n")
    return visible_content, normalized_metadata or None
