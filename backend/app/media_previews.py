"""Protected, disposable JPEG display copies; source files stay untouched."""

from __future__ import annotations

import os
from pathlib import Path
from threading import BoundedSemaphore
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError
from pillow_heif import register_heif_opener

from app.errors import AppException


register_heif_opener(thumbnails=False, depth_images=False, aux_images=False, decode_threads=1)

MAX_PREVIEW_EDGE = 2048
MAX_SOURCE_PIXELS = 50_000_000
_conversion_slot = BoundedSemaphore(1)


def is_heif(content_type: str) -> bool:
    return content_type.split(";", 1)[0].strip().lower() in {"image/heic", "image/heif"}


def preview_path(source: Path) -> Path:
    return source.with_name(f"{source.name}.display-v1.jpg")


def _is_current(target: Path, source: Path) -> bool:
    try:
        return target.stat().st_size > 0 and target.stat().st_mtime_ns >= source.stat().st_mtime_ns
    except FileNotFoundError:
        return False


def ensure_jpeg_preview(source: Path) -> Path:
    target = preview_path(source)
    if _is_current(target, source):
        return target
    # Bound decoded-image memory and avoid duplicate conversions within a worker.
    # Multiple processes still publish only complete files through os.replace.
    with _conversion_slot:
        if _is_current(target, source):
            return target
        temporary = target.with_name(f".{target.name}.{uuid4().hex}.tmp")
        try:
            try:
                with Image.open(source) as image:
                    if image.format != "HEIF" or image.width * image.height > MAX_SOURCE_PIXELS:
                        raise ValueError("Unsupported image or decoded image exceeds the pixel limit")
                    with ImageOps.exif_transpose(image) as oriented:
                        oriented.thumbnail((MAX_PREVIEW_EDGE, MAX_PREVIEW_EDGE), Image.Resampling.LANCZOS)
                        with oriented.convert("RGBA") as rgba:
                            rgb = Image.new("RGB", rgba.size, "white")
                            try:
                                rgb.paste(rgba, mask=rgba.getchannel("A"))
                                rgb.save(
                                    temporary, format="JPEG", quality=88, optimize=True,
                                    icc_profile=oriented.info.get("icc_profile"),
                                )
                            finally:
                                rgb.close()
            except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError, RuntimeError) as exc:
                raise AppException(
                    status_code=415, message="The image could not be converted for display.",
                    code="MEDIA_CONVERSION_FAILED",
                ) from exc
            if not source.is_file():
                raise AppException(status_code=404, message="Media file not found.", code="NOT_FOUND")
            os.replace(temporary, target)
            # Account deletion stages the source before its sidecar. Check after
            # publication too, covering deletion between the first check and replace.
            if not source.is_file():
                target.unlink(missing_ok=True)
                raise AppException(status_code=404, message="Media file not found.", code="NOT_FOUND")
        finally:
            temporary.unlink(missing_ok=True)
    return target
