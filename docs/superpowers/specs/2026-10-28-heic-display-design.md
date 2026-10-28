# HEIC display compatibility (WP5/WP9 P0)

The user selected preserving HEIC originals and serving JPEG display copies,
including existing uploads. The clarified incident affects web display; native
clients must keep working. Posts 991/990/989 contain HEIC media 1161/1160/1159;
the same bytes fail Chromium decoding while a PNG control displays correctly.

## Approach

Use the existing protected media domain. HEIC/HEIF access URLs resolve to a
signed JPEG preview endpoint. Keep the existing signed file endpoint for
original bytes. This server approach covers installed clients and old uploads;
client-only conversion would require native updates and repeat work per device.
No database, attachment, ownership, identity, or app-route changes are needed.

The implementation choices are: Pillow plus pillow-heif with bundled decoder
wheels; JPEG quality 88, maximum edge 2048, orientation applied, RGB output,
and no EXIF. Store a versioned sidecar next to the protected original. Generate
new upload previews eagerly and old previews lazily, using atomic writes and
bounded conversion concurrency. Reject corrupt/oversized decoded inputs without
partial files. Never fall back to returning incompatible HEIC from the preview.

Preview signatures bind the representation and expire under existing policy.
Original access remains available through an explicit original access request.
Private cache files remain in private storage; failed uploads and account
deletion/rollback include preview sidecars. Originals remain byte-identical.

## Verification

Test real encoded HEIC/HEIF, fresh and legacy files, signature expiry/tampering
and representation substitution, member/guest/private access, cache reuse and
concurrency, orientation/size limits, failed conversion cleanup and account
deletion rollback. Verify the three affected originals convert and the JPEGs
decode in Chromium. Run the backend suite and compile/import checks, frontend
typecheck, and dependency audit. Physical native-device testing is Phase 5 QA.
Deployment is a separate operational step after the candidate is reviewable.
