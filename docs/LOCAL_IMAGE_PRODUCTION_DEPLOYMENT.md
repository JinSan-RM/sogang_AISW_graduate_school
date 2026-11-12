# Local builds and image-only production deployment

WP1/WP9 decision, 2026-11-12. Application builds and complete test suites run on
the developer's Docker host. The production VM only imports verified images,
validates runtime settings and starts containers. The selected VM size is
`e2-custom-medium-6144`: shared-core medium with 6GiB RAM. The existing reserved
public IP, PostgreSQL `172.18.0.2:5432`, disk, swap, ingress and durable volumes stay.

## 1. Build from committed source locally

Start Docker Desktop in Linux-container mode. Commit the intended changes first;
the builder rejects tracked modifications and exports only committed backend
files (plus frontend files for `all`). Untracked files and local dotenv files do
not enter the context. The output directory must be new.

```powershell
python scripts/build_production_images.py --services backend --output-dir .codex-tmp/releases/release-20261112
```

The PowerShell equivalent accepts an explicit Python executable:

```powershell
.\scripts\build-production-images.ps1 -Services backend -OutputDir .codex-tmp/releases/release-20261112 -Python .\backend\.venv\Scripts\python.exe
```

This builds one Linux/amd64 image for backend and notification worker, labels it
with the full Git revision, verifies its platform/ID/revision and exports:

- `images.tar`: standard Docker image archive.
- `images.tar.sha256`: archive checksum.
- `manifest.json`: schema version, Git revision, platform, archive checksum and
  exact service image tags/IDs.

Backend-only releases preserve the frontend image. For a frontend release use
`--services all --public-config <public-build.json>`. That JSON may contain only
these public settings; obtain their approved values from the current public
deployment profile, not by copying `.env.production`:

| JSON key | Frontend build argument |
| --- | --- |
| `PUBLIC_API_URL` | `EXPO_PUBLIC_API_URL` |
| `EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS` | same key, defaults to `120000` |
| `SUPPORT_URL` | `EXPO_PUBLIC_SUPPORT_URL` |
| `PRIVACY_POLICY_URL` | `EXPO_PUBLIC_PRIVACY_POLICY_URL` |
| `ACCOUNT_DELETION_URL` | `EXPO_PUBLIC_ACCOUNT_DELETION_URL` |
| `SUPPORT_EMAIL` | `EXPO_PUBLIC_SUPPORT_EMAIL` |
| `PUBLIC_OPERATOR_NAME` | `EXPO_PUBLIC_OPERATOR_NAME` |
| `PRIVACY_POLICY_EFFECTIVE_DATE` | `EXPO_PUBLIC_PRIVACY_EFFECTIVE_DATE` |
| `PRIVACY_POLICY_VERSION` | `EXPO_PUBLIC_PRIVACY_POLICY_VERSION` |

Do not include database, authentication, SMTP, alert-webhook or push credentials.
Tests run locally against disposable data; never point them at production.

## 2. Transfer and verify

Transfer the three artifact files over the existing authenticated SSH connection.
Use a release-specific private directory on the VM, for example
`/srv/aisw-releases/<full-revision>`. The manifest checksum detects incomplete or
corrupt transfers; trust comes from the local build and authenticated transfer.
Do not accept an unrelated archive and manifest as trusted merely because they
match each other.

The helper source/configuration must also be synchronized from the reviewed
commit before the first migration. Keep the operator-owned `.env.production`,
`.env.production.worker`, certificates and volume configuration intact.

On the VM, archive-only verification has no Docker or profile side effects:

```bash
cd /opt/aisw-app
sudo python3 scripts/import_production_images.py \
  --manifest /srv/aisw-releases/<full-revision>/manifest.json --check-archive
```

Before deployment, preserve the current image IDs/profile and checked database
backup using the established maintenance procedure. Keep the previous images
available for rollback; do not prune them during the release.

Then load the archive and generate the profile:

```bash
sudo python3 scripts/import_production_images.py \
  --manifest /srv/aisw-releases/<full-revision>/manifest.json
```

The importer checks SHA-256, service names, matching backend/worker images,
platform, revision labels and actual loaded IDs before atomically writing
`deploy/production-images.env`. It contains only the three immutable image IDs,
is ignored by Git, and preserves configured/current images for omitted services.
Image loading does not restart containers or run migrations.

## 3. Deploy without building

```bash
sudo bash scripts/production-domain.sh Config
sudo bash scripts/production-domain.sh Up
sudo bash scripts/production-domain.sh Smoke
```

`Config` uses an existing local backend image. `Up` preflights all required local
images before stopping services, then uses `--no-build --pull never`. Compose
`run` has no `--no-build` option; runtime checks first inspect the explicit local
image and use `--pull never`. Missing images fail before cutover. The production
`Build` action is rejected with directions to the local builder.

The same rules apply to IP-only, generic production and one-time legacy-import
entrypoints. The legacy importer still has its original destructive-operation
guards; changing image delivery does not authorize running it on populated data.
Fresh VMs must receive the verified images before Config or initial import.

For rollback, restore the saved three old IDs to `deploy/production-images.env`
and run Config/Up/Smoke again using the retained old images. If the helper source
itself failed, restore its saved files and use the captured original runtime
configuration with explicit old image IDs and no build/pull. Never replace the
private environment files with examples or remove durable volumes.

## 4. Resize the existing VM

After image-only deployment passes, stop the existing VM, set its machine type
to `e2-custom-medium-6144`, then start it. This requires service downtime. Confirm
the external address is reserved before stopping; this VM's `34.50.35.119` is
reserved. Do not delete/recreate the instance or its persistent disk.

Verify the actual machine type, roughly 6GiB guest RAM, existing 2GiB swap,
container health, both HTTPS origins, private DB address and backend DB access.
Inspect the new boot for OOM messages. If startup or service checks fail, stop
the VM and restore `e2-standard-2`, then start and verify the original capacity.

The capacity decision preserves more headroom than the predefined 4GiB
`e2-medium`; complete builds/tests remain off the VM. This is a first reduction,
not a guarantee against every future workload or a sustained load-test result.
