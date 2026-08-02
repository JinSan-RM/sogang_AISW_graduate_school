[CmdletBinding()]
param(
    [ValidateSet("Export", "Verify", "Restore")]
    [string]$Action = "Verify",
    [string]$SnapshotDirectory = ".codex-tmp\qa-data-snapshot",
    [string]$SourceContainer = "aisw_app_renewal-db-1",
    [string]$SourceDatabase = "",
    [string]$SourceDatabaseUser = "postgres",
    [string]$PublicMediaDirectory = "",
    [string]$PrivateMediaDirectory = "",
    [string]$EnvFile = ".env.qa"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$temporaryRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot ".codex-tmp"))
$composeBaseFile = Join-Path $repoRoot "docker-compose.yml"
$composeQaFile = Join-Path $repoRoot "docker-compose.qa.yml"
$snapshot = if ([IO.Path]::IsPathRooted($SnapshotDirectory)) {
    [IO.Path]::GetFullPath($SnapshotDirectory)
} else {
    [IO.Path]::GetFullPath((Join-Path $repoRoot $SnapshotDirectory))
}

function Assert-SafeIdentifier {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if ($Value -notmatch "^[A-Za-z0-9_.-]+$") {
        throw "$Label contains unsupported characters."
    }
}

function Resolve-ExistingDirectory {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    if (-not $Path) {
        throw "$Label is required for Export."
    }
    $candidate = if ([IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $repoRoot $Path }
    if (-not (Test-Path -LiteralPath $candidate -PathType Container)) {
        throw "$Label does not exist: $candidate"
    }
    return (Resolve-Path -LiteralPath $candidate).Path
}

function Resolve-QaEnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $candidate = if ([IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $repoRoot $Path }
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        return (Resolve-Path -LiteralPath $candidate).Path
    }
    if ($Path -eq ".env.qa") {
        return (Resolve-Path -LiteralPath (Join-Path $repoRoot ".env.qa.example")).Path
    }
    throw "QA environment file does not exist: $candidate"
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

function Invoke-BestEffortDocker {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $previousPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5 can promote harmless native stderr progress to
        # NativeCommandError when the script-wide preference is Stop.
        $ErrorActionPreference = "Continue"
        $null = & docker @Arguments 2>&1
    } catch {
        # Cleanup must not replace the original export/restore result.
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Get-TreeSummary {
    param([Parameter(Mandatory = $true)][string]$Path)

    $files = @(Get-ChildItem -LiteralPath $Path -File -Recurse)
    $totalBytes = if ($files.Count -gt 0) {
        [long](($files | Measure-Object -Property Length -Sum).Sum)
    } else {
        [long]0
    }
    return @{
        files = $files.Count
        bytes = $totalBytes
    }
}

function Get-Manifest {
    $manifestPath = Join-Path $snapshot "manifest.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Snapshot manifest does not exist: $manifestPath"
    }
    return Get-Content -LiteralPath $manifestPath -Raw -Encoding utf8 | ConvertFrom-Json
}

function Assert-SnapshotHashes {
    $manifest = Get-Manifest
    foreach ($artifact in @("database.dump", "public-media.tar", "private-media.tar")) {
        $artifactPath = Join-Path $snapshot $artifact
        if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) {
            throw "Snapshot artifact does not exist: $artifactPath"
        }
        $expected = [string]$manifest.artifacts.$artifact.sha256
        $actual = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $expected) {
            throw "Snapshot hash mismatch: $artifact"
        }
    }
    Write-Host "Snapshot hashes are valid: $snapshot"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not installed or is not available on PATH."
}
if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
    throw "tar.exe is not installed or is not available on PATH."
}
if (-not ($snapshot -eq $temporaryRoot -or $snapshot.StartsWith($temporaryRoot + [IO.Path]::DirectorySeparatorChar))) {
    throw "SnapshotDirectory must stay inside the repository .codex-tmp directory."
}

if ($Action -eq "Export") {
    if (-not $SourceDatabase) {
        throw "SourceDatabase is required for Export."
    }
    Assert-SafeIdentifier -Value $SourceContainer -Label "SourceContainer"
    Assert-SafeIdentifier -Value $SourceDatabase -Label "SourceDatabase"
    Assert-SafeIdentifier -Value $SourceDatabaseUser -Label "SourceDatabaseUser"
    $publicMedia = Resolve-ExistingDirectory -Path $PublicMediaDirectory -Label "PublicMediaDirectory"
    $privateMedia = Resolve-ExistingDirectory -Path $PrivateMediaDirectory -Label "PrivateMediaDirectory"

    if (Test-Path -LiteralPath $snapshot) {
        if (@(Get-ChildItem -LiteralPath $snapshot -Force).Count -gt 0) {
            throw "SnapshotDirectory must be empty for Export: $snapshot"
        }
    } else {
        New-Item -ItemType Directory -Path $snapshot | Out-Null
    }

    $databaseDump = Join-Path $snapshot "database.dump"
    $publicArchive = Join-Path $snapshot "public-media.tar"
    $privateArchive = Join-Path $snapshot "private-media.tar"
    $containerDump = "/tmp/aisw-qa-export-$PID.dump"
    try {
        Invoke-External -FilePath "docker" -Arguments @(
            "exec", $SourceContainer, "pg_dump", "-U", $SourceDatabaseUser,
            "-d", $SourceDatabase, "-Fc", "--no-owner", "--no-privileges", "-f", $containerDump
        )
        Invoke-External -FilePath "docker" -Arguments @(
            "cp", "${SourceContainer}:${containerDump}", $databaseDump
        )
    } finally {
        Invoke-BestEffortDocker -Arguments @("exec", $SourceContainer, "rm", "-f", $containerDump)
    }

    Invoke-External -FilePath "tar.exe" -Arguments @("-C", $publicMedia, "-cf", $publicArchive, ".")
    Invoke-External -FilePath "tar.exe" -Arguments @("-C", $privateMedia, "-cf", $privateArchive, ".")

    $publicSummary = Get-TreeSummary -Path $publicMedia
    $privateSummary = Get-TreeSummary -Path $privateMedia
    $artifacts = @{}
    foreach ($artifact in @("database.dump", "public-media.tar", "private-media.tar")) {
        $artifactPath = Join-Path $snapshot $artifact
        $artifacts[$artifact] = @{
            bytes = (Get-Item -LiteralPath $artifactPath).Length
            sha256 = (Get-FileHash -LiteralPath $artifactPath -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
    $manifest = @{
        format = 1
        purpose = "local-desktop-qa-only"
        created_at_utc = [DateTime]::UtcNow.ToString("o")
        git_commit = (& git -C $repoRoot rev-parse HEAD).Trim()
        source_container = $SourceContainer
        source_database = $SourceDatabase
        public_media = $publicSummary
        private_media = $privateSummary
        artifacts = $artifacts
    }
    [IO.File]::WriteAllText(
        (Join-Path $snapshot "manifest.json"),
        ($manifest | ConvertTo-Json -Depth 6),
        [Text.UTF8Encoding]::new($false)
    )
    Assert-SnapshotHashes
    Write-Host "QA snapshot exported. It contains review data and must not be treated as a production dump."
    exit 0
}

if (-not (Test-Path -LiteralPath $snapshot -PathType Container)) {
    throw "SnapshotDirectory does not exist: $snapshot"
}
Assert-SnapshotHashes
if ($Action -eq "Verify") {
    exit 0
}

$resolvedEnvFile = Resolve-QaEnvFile -Path $EnvFile
$composeArgs = @(
    "compose", "--env-file", $resolvedEnvFile,
    "-p", "aisw_p0qa",
    "-f", $composeBaseFile,
    "-f", $composeQaFile
)

# Restore is intentionally fixed to the isolated QA project and database. It
# never targets the source database or a production Compose environment.
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @("config", "--quiet"))
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @("up", "-d", "--wait", "--wait-timeout", "120", "db"))
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @("stop", "backend", "frontend-web", "notification-worker"))

$dbContainer = (& docker @composeArgs ps -q db).Trim()
if (-not $dbContainer -or $dbContainer -notmatch "^[a-f0-9]+$") {
    throw "Unable to resolve the isolated QA database container."
}
$targetDatabase = "sogang_app_qa"
$containerDump = "/tmp/aisw-qa-restore-$PID.dump"
try {
    Invoke-External -FilePath "docker" -Arguments @("cp", (Join-Path $snapshot "database.dump"), "${dbContainer}:${containerDump}")
    Invoke-External -FilePath "docker" -Arguments @(
        "exec", $dbContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
        "-c", "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'sogang_app_qa' AND pid <> pg_backend_pid();"
    )
    Invoke-External -FilePath "docker" -Arguments @("exec", $dbContainer, "dropdb", "-U", "postgres", "--if-exists", $targetDatabase)
    Invoke-External -FilePath "docker" -Arguments @("exec", $dbContainer, "createdb", "-U", "postgres", $targetDatabase)
    Invoke-External -FilePath "docker" -Arguments @(
        "exec", $dbContainer, "pg_restore", "-U", "postgres", "-d", $targetDatabase,
        "--no-owner", "--no-privileges", "--exit-on-error", $containerDump
    )
} finally {
    Invoke-BestEffortDocker -Arguments @("exec", $dbContainer, "rm", "-f", $containerDump)
}

Invoke-External -FilePath "docker" -Arguments ($composeArgs + @("build", "backend"))
$restoreScript = @"
find /data/media -mindepth 1 -delete
find /data/private-media -mindepth 1 -delete
tar -C /data/media -xf /snapshot/public-media.tar
tar -C /data/private-media -xf /snapshot/private-media.tar
python -m app.migrate
"@
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @(
    "run", "--rm", "--no-deps", "--volume", "${snapshot}:/snapshot:ro",
    "--entrypoint", "sh", "backend", "-ceu", $restoreScript
))
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @(
    "up", "-d", "--build", "--wait", "--wait-timeout", "300"
))
Invoke-External -FilePath "docker" -Arguments ($composeArgs + @(
    "exec", "-T", "db", "psql", "-U", "postgres", "-d", $targetDatabase,
    "-c", "SELECT version_num FROM alembic_version;"
))
Write-Host "QA snapshot restored and local QA is healthy: http://localhost:58081"
