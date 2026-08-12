# Legacy migration source files

This directory is the local-only input location for the one-time legacy data importer.
The raw workbooks and CSV exports may contain personal data and must not be committed to
this public repository.

Obtain the approved source files from the authorized private storage and place them here
before running `backend/scripts/import_legacy_articles.py`:

- `board_articles_ver3.xlsx`
- `comments.xlsx`
- `board_articles(구분).xlsx`
- `정보통신대학원 어플 작성글.csv`

Keep generated media and import reports outside the repository as well. The importer
requires an explicit database URL and separates `--dry-run` from `--apply`.

The GCP single-VM rehearsal does not copy these files into the checkout. It
uses the private `/srv/aisw-import/incoming` staging directory, the approved
source manifest, and the fail-closed wrapper documented in
[`docs/GCP_IP_PRODUCTION_DEPLOYMENT.md`](../docs/GCP_IP_PRODUCTION_DEPLOYMENT.md).
