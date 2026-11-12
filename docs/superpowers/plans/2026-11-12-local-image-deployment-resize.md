# Local image deployment and 6GiB production VM

> **For agentic workers:** Execute the authorized WP1/WP9 tasks below with separate build/import verification and independent review before production changes.

**Goal:** Move application builds off production and resize the existing VM to
`e2-custom-medium-6144`, keeping the current application behavior and data.

**Architecture:** Build a clean committed Linux/amd64 source snapshot locally;
export Docker images plus revision/image-ID/checksum manifest; transfer over
the existing SSH connection; validate and load on production; persist pinned
image IDs in an ignored, non-secret profile. Existing production helpers consume
that profile, never build, and fail before stopping services if images are absent.

**Constraints:** No GitHub push. Preserve private environment files, credentials,
durable DB/media/certificate volumes, reserved IP `34.50.35.119`, DB fixed IP and
port, schema and frontend image today. Backend/worker use one locally built image.
Keep a verified DB backup and original image/config snapshots. On deployment or
resize failure, restore original images/config and/or `e2-standard-2` capacity.
Do not change IAM or Ops Agent configuration as part of this task.

- [ ] Implement and test local source-isolated image build/export, server archive
  import verification/profile generation, and no-build production helper behavior.
- [ ] Document commands, public build inputs, immutable references, secret handling,
  initial migration and rollback. Independently review the complete change.
- [ ] Commit the delivery change locally without pushing. Build backend locally,
  verify its source/revision and isolated application tests, and transfer archive.
- [ ] Back up the live DB and runtime configuration privately, load verified images,
  apply the new helpers/profile, deploy without a server build, and verify health,
  exact environment/mount/port preservation and fixed DB address.
- [ ] Confirm reserved public IP and original disk/config; stop the VM, change only
  machine type to `e2-custom-medium-6144`, start it, and verify RAM, swap, services,
  both HTTPS origins, database address, and absence of OOM during startup.
- [ ] Record exact results, limitations and backup evidence in `CODEX.md` and a
  dated QA report; commit the verification notes locally, without pushing.
