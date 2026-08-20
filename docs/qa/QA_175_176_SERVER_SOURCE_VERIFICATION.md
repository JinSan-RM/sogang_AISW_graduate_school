# QA 175/176 server source verification

Snapshot date: 2026-08-20 (Asia/Seoul)

This is redacted, read-only evidence for the targeted legacy attachment repair. It proves what was
observed at the snapshot time; it is not proof that a later host is ready for production. No raw
attachment content, private source URL, credential, database write, container restart, or file
mutation was included in this check.

## Source and parent mapping

The private attachment directory was enumerated by exact storage ID. `file`, `stat`, and
`sha256sum` were run on the eight selected files. The article workbook was parsed inside the
deployed backend image, and the current database was queried read-only for the matching
`metadata.legacy_write_id`/`metadata.legacy_article_id` posts.

| Storage ID | Type | Bytes | SHA-256 | Legacy article ID | Live post ID | Status |
| --- | --- | ---: | --- | --- | ---: | --- |
| `10946091` | HWP | 114688 | `2f198efabf3c940f0e197340cf77316ca6a866e65182218a751f8bd5b46d7957` | `6471114` | 414 | published, not deleted |
| `12621604` | ZIP | 844720 | `8f1d200554d13fd46755d5e124d9f51d67670703f70f78bc7e37831f5a9ed2e1` | `6912953` | 370 | published, not deleted |
| `12621345` | ZIP | 1683076 | `2744bc7da9f2fe2b8da84f2895211661274357df9274cab16d6012810dbcc3b7` | `6892628` | 365 | published, not deleted |
| `12358989` | ZIP | 1463503 | `d9d7aeac4ed9facb438c78ecadb9e4091806b26a49127c28091e36c17ccef18a` | `6829594` | 360 | published, not deleted |
| `10946120` | ZIP | 113885 | `c7e2832f7214a84670231e7cb9e04f8d74be71e74576cc810bc96d89af65f750` | `6471121` | 683 | published, not deleted |
| `12359030` | TXT | 1025 | `1a6a6cd16f8045dabec5e6be75e846e2c5bdb82d326c7948622f2c1737d54e5f` | `6829611` | 362 | published, not deleted |
| `12359031` | TXT | 670 | `bb0e15ce70289485e24d352b88195560dd108546ce47cc5bb44d254c85ffd0de` | `6829611` | 362 | published, not deleted |
| `12358946` | IPYNB | 19498 | `b49832254f049c1df01b6d9fdef4bba91f4586c0cb8c6ee0b54e179953e0870e` | `6829569` | 359 | published, not deleted |

The eight rows map to seven live posts; the two TXT files intentionally share post 362. The source
formats were independently recognized as Hancom HWP 5.0, four ZIP archives, two UTF-8 text files,
and one Jupyter-compatible JSON notebook.

## Current media state before repair

- Storage ID `10946091` has media row 603 linked to post 414, but it is stored as
  `legacy-10946091.doc`, has `application/msword`, and its original filename has no extension.
- The stored `.doc` bytes and the private `.hwp` source both have SHA-256
  `2f198efabf3c940f0e197340cf77316ca6a866e65182218a751f8bd5b46d7957`. This confirms a metadata
  and filename error rather than a different Word document.
- The other seven selected storage IDs had no matching `MediaAsset` row at snapshot time.

The approved repair therefore preserves media row 603, its existing post link, and
`legacy-10946091.doc` byte-for-byte. The serving backend corrects only its download response MIME
and filename. The other seven sources are copied exactly and receive new media rows and post links;
the procedure does not update existing posts or legacy import ledger rows.

## Reproducible check shape

The operator used these read-only command shapes, with exact paths and IDs from the protected
migration location:

```bash
file <eight exact source files>
sha256sum <eight exact source files>

# Parse only fileStorageId, writeId, and sheet from the article workbook.
docker run --rm --network none --user 0:0 \
  --volume /srv/aisw-import/incoming:/migration/input:ro \
  aisw-production-backend python - < redacted-read-only-workbook-query.py

# Query only post ID/status/deleted_at and media/link metadata from the running backend.
docker exec -i aisw-production-backend-1 python - < redacted-read-only-db-query.py
```

Before apply, rerun the documented dry-run in `OPERATIONS.md`. Its named `qa-175-176` repair set
must reproduce the same eight storage-to-article mappings and source hashes; any difference changes
the plan fingerprint and blocks apply.
