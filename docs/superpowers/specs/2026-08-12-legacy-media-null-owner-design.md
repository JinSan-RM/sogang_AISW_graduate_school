# Legacy Media Import Without a Seeded Administrator

Date: 2026-08-12

## Problem

The one-time production importer creates a fresh review database, applies all
migrations, and calls `seed_reference_data()`. Production policy deliberately
creates no demo or administrator account. However, `import_attachments()`
currently aborts every applied import unless any user with `role="admin"`
already exists. The GCP rehearsal therefore stops before review verification,
backup creation, or production restore.

## Constraints

- Production startup and migration must not create a synthetic user or grant an
  imported member administrator privileges.
- The approved import totals remain 685 posts, 247 comments, 196 inactive
  legacy users, 1,923 ledger records, 637 supported media files, and 11 explicitly
  archived unsupported files.
- Post attachment ownership must remain associated with the imported post
  author.
- Member-only media authorization, FAQ visibility, board-metadata visibility,
  and administrator-only mutual-aid evidence access must not change.
- Raw migration inputs and a failed review database must never be edited in
  place or silently reused.

## Decision

Remove the unconditional administrator lookup and failure from
`import_attachments()`.

When a supported media asset is created:

- If it belongs to an imported post, set `owner_id` to that post's author ID.
- If it belongs only to migrated special content such as an FAQ, cohort leader,
  past council, or archived mutual-aid record, set `owner_id` to `NULL`.

This uses the existing nullable `media_assets.owner_id` contract. The same
contract already preserves connected historical media after account deletion,
so nullable ownership does not require a schema migration.

Unsupported attachment types continue to create only an archived provenance
ledger record. They do not create a media asset and therefore do not need an
owner. The verified source produces exactly 25 such ownerless media assets.

## Authorization Behavior

- A linked post attachment inherits the post's read policy and keeps its author
  as owner.
- A public FAQ attachment remains readable through its FAQ relationship.
- Public cohort-leader and past-council media remain readable through board
  metadata references.
- Private migrated mutual-aid media with no owner remains inaccessible to
  members because private-media authorization rejects non-admin users before
  considering public relationships. Administrators retain unconditional media
  access.
- An unattached public media row with no recognized relationship is not exposed,
  because it has neither an owner match nor an authorized reference.

## Failure and Recovery Behavior

The existing one-time importer remains fail-closed. It must still verify source
hashes, exact row/file counts, database totals, media byte totals, and the media
manifest before restoring production. A failed review database and output
directory are inspected and removed only by exact resolved name; production
database and media volumes are not reset as part of this code change.

## Test Design

Add regression coverage that runs attachment import with no administrator:

1. A normal post attachment imports successfully and retains the post author's
   `owner_id`.
2. A supported FAQ attachment imports successfully with `owner_id=NULL`, creates
   its FAQ link, and remains readable through the existing FAQ authorization
   path.
3. An unsupported local attachment is archived in the ledger without creating
   a media row or requiring an administrator.

Run the focused legacy-import tests first, then the complete backend suite and
the public-IP production deployment tests. The VM rerun must again pass all
fixed import totals and the final production media manifest before certificate
issuance or application startup.

## Rejected Alternatives

- Creating a disabled synthetic administrator changes the approved user count,
  leaves an artificial privileged identity in production, and conflicts with
  the explicit initial-admin bootstrap policy.
- Promoting an imported legacy member assigns privilege without verified
  operator consent.
- Starting an empty public server and registering an administrator first is
  incompatible with the importer's requirement that the production database
  contain no public tables before the one-time restore.
