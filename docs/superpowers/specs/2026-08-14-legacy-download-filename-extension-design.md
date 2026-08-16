# Legacy Download Filename Extension Design

## Problem

Issue 130 reports that attachments on post 400 do not download correctly. Production verification showed that both signed downloads complete, but the response filenames are `legacy-15811068` and `legacy-15811070` without extensions. Their payloads are valid PDF and DOCX files, so Windows cannot associate the saved files with the correct applications.

The signed media route passes `media.original_filename` directly to `FileResponse`. Migrated rows can contain a placeholder original filename without a suffix even though `media.content_type` and the stored file contents identify the type.

## Chosen Behavior

- Keep the existing attachment-click and signed-download flow.
- Keep valid original filenames unchanged.
- When the download filename has no suffix, append the canonical extension for the normalized media content type.
- Use the same MIME-to-extension allowlist already used by upload validation.
- If the content type is unknown, preserve the existing filename rather than guessing.
- Do not update database rows, attachment labels, screen layout, or native/web navigation behavior.

For the reported files, the download names become `legacy-15811068.pdf` and `legacy-15811070.docx`.

## Components and Data Flow

1. The client resolves the existing signed media URL and navigates to it.
2. The signed media route authorizes the signature and locates the file exactly as today.
3. A backend filename helper normalizes `media.content_type` and checks `media.original_filename`.
4. If the filename lacks a suffix and the MIME type has a supported canonical extension, the helper appends it.
5. `FileResponse` uses the corrected name in `Content-Disposition`, causing the browser to save a directly openable file.

## Error Handling

Authorization, missing-file, signature, and storage errors remain unchanged. The filename fallback is conservative: unsupported MIME types keep the stored original filename and do not block a valid download.

## Testing

- Add a focused backend regression test proving a suffix-less PDF filename downloads with `.pdf`.
- Add a focused backend regression test proving a suffix-less DOCX filename downloads with `.docx`.
- Confirm an existing filename with a valid suffix is preserved.
- Run the media/security backend tests and the broader backend test suite appropriate to the change.
- Recheck the production-equivalent browser download after deployment; local automated tests verify response headers before deployment.

## Out of Scope

- Renaming migrated database records.
- Replacing `legacy-*` placeholder basenames with reconstructed historical names.
- UI changes.
- Changing the existing signed URL or access-control model.
