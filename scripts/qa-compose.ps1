[CmdletBinding()]
param(
    [ValidateSet("Config", "Up", "Ps", "Logs", "Down")]
    [string]$Action = "Up",
    [string]$EnvFile = ".env.qa"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$composeBaseFile = Join-Path $repoRoot "docker-compose.yml"
$composeQaFile = Join-Path $repoRoot "docker-compose.qa.yml"

function Resolve-QaEnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $candidate = if ([IO.Path]::IsPathRooted($Path)) {
        $Path
    } else {
        Join-Path $repoRoot $Path
    }
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
        return (Resolve-Path -LiteralPath $candidate).Path
    }
    if ($Path -eq ".env.qa") {
        $example = Join-Path $repoRoot ".env.qa.example"
        Write-Host "No .env.qa file found; using the loopback-only example configuration."
        return (Resolve-Path -LiteralPath $example).Path
    }
    throw "QA environment file does not exist: $candidate"
}

function Invoke-DockerCompose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE."
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not installed or is not available on PATH."
}

$resolvedEnvFile = Resolve-QaEnvFile -Path $EnvFile
$composeArgs = @(
    "--env-file", $resolvedEnvFile,
    "-p", "aisw_p0qa",
    "-f", $composeBaseFile,
    "-f", $composeQaFile
)

switch ($Action) {
    "Config" {
        Invoke-DockerCompose -Arguments ($composeArgs + @("config", "--quiet"))
        Write-Host "Local QA Compose configuration is valid."
    }
    "Up" {
        Invoke-DockerCompose -Arguments ($composeArgs + @("config", "--quiet"))
        Invoke-DockerCompose -Arguments ($composeArgs + @(
            "up", "-d", "--build", "--wait", "--wait-timeout", "300"
        ))
        Write-Host "Local QA is healthy: frontend http://localhost:58081, API http://localhost:58000"
    }
    "Ps" {
        Invoke-DockerCompose -Arguments ($composeArgs + @("ps", "-a"))
    }
    "Logs" {
        Invoke-DockerCompose -Arguments ($composeArgs + @(
            "logs", "--tail", "150", "backend", "frontend-web", "notification-worker"
        ))
    }
    "Down" {
        Invoke-DockerCompose -Arguments ($composeArgs + @("down", "--remove-orphans"))
        Write-Host "Local QA containers stopped. Database and media volumes were preserved."
    }
}
