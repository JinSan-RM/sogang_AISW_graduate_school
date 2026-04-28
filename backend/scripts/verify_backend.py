from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app


def main() -> None:
    schema = app.openapi()
    if not schema.get("openapi"):
        raise SystemExit("OpenAPI schema generation failed")
    print("Backend import and OpenAPI validation passed")


if __name__ == "__main__":
    main()
