[CmdletBinding()]
param(
    [ValidateSet("Config", "Up", "Ps", "Logs", "Build")]
    [string]$Action = "Up",
    [string]$EnvFile = ".env.production",
    [string]$WorkerEnvFile = ".env.production.worker"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Action -eq "Build") {
    throw "Production builds are disabled. Use the local build script and import its images."
}

$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$composeBaseFile = Join-Path $repoRoot "docker-compose.yml"
$composeFile = Join-Path $repoRoot "docker-compose.production.example.yml"

function Resolve-RequiredFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $candidate = if ([IO.Path]::IsPathRooted($Path)) {
        $Path
    } else {
        Join-Path $repoRoot $Path
    }
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "$Label file does not exist: $candidate"
    }
    return (Resolve-Path -LiteralPath $candidate).Path
}

function Read-DotEnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $values = @{}
    foreach ($rawLine in [IO.File]::ReadAllLines($Path)) {
        $line = $rawLine.Trim()
        if ($line.Length -eq 0 -or $line.StartsWith("#")) {
            continue
        }
        if ($line.StartsWith("export ")) {
            $line = $line.Substring(7).TrimStart()
        }
        $separator = $line.IndexOf("=")
        if ($separator -lt 1) {
            continue
        }
        $name = $line.Substring(0, $separator).Trim()
        if ($name -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
            continue
        }
        $value = $line.Substring($separator + 1).Trim()
        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]
            if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        $values[$name] = $value
    }
    return $values
}

function Get-EffectiveValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][hashtable]$Values,
        [string]$Default = ""
    )

    $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ($null -ne $processValue) {
        return $processValue
    }
    if ($Values.ContainsKey($Name)) {
        return [string]$Values[$Name]
    }
    return $Default
}

function Invoke-DockerCompose {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE."
    }
}

function Set-TemporaryProcessValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][hashtable]$OriginalValues
    )

    if (-not $OriginalValues.ContainsKey($Name)) {
        $OriginalValues[$Name] = [Environment]::GetEnvironmentVariable($Name, "Process")
    }
    [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
}

function Test-ProductionImageReference {
    param([AllowEmptyString()][string]$Value)

    if ($Value.StartsWith("sha256:")) {
        return $Value -cmatch '^sha256:[a-f0-9]{64}$'
    }
    return $Value -cmatch '^([a-z0-9]+([._-][a-z0-9]+)*(:[0-9]+)?/)*[a-z0-9]+([._-][a-z0-9]+)*(:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?(@sha256:[a-f0-9]{64})?$'
}

function Read-ProductionImageProfile {
    $setting = [Environment]::GetEnvironmentVariable("PRODUCTION_IMAGES_ENV_FILE", "Process")
    $profilePath = if ($setting) { $setting } else { "deploy/production-images.env" }
    if (-not [IO.Path]::IsPathRooted($profilePath)) {
        $profilePath = Join-Path $repoRoot $profilePath
    }
    $values = @{}
    if (Test-Path -LiteralPath $profilePath) {
        if (-not (Test-Path -LiteralPath $profilePath -PathType Leaf)) {
            throw "Production image profile must be a regular file."
        }
        foreach ($rawLine in [IO.File]::ReadAllLines($profilePath)) {
            $line = $rawLine.Trim()
            if (-not $line -or $line.StartsWith("#")) { continue }
            $separator = $line.IndexOf("=")
            if ($separator -lt 1) { throw "Invalid production image profile entry." }
            $key = $line.Substring(0, $separator)
            $value = $line.Substring($separator + 1)
            if ($key -cnotin @("PRODUCTION_BACKEND_IMAGE", "PRODUCTION_WORKER_IMAGE", "PRODUCTION_FRONTEND_IMAGE")) {
                throw "Production image profile contains an unsupported key."
            }
            if ($values.ContainsKey($key)) { throw "Production image profile contains a duplicate image key." }
            if (-not (Test-ProductionImageReference -Value $value)) {
                throw "Invalid image reference in production image profile."
            }
            $values[$key] = $value
        }
    } elseif ($setting) {
        throw "Configured production image profile does not exist."
    }
    return $values
}

function Assert-LocalProductionImages {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $images = @(& docker compose @Arguments config --images)
    if ($LASTEXITCODE -ne 0 -or $images.Count -eq 0) {
        throw "Unable to resolve required production images."
    }
    foreach ($image in $images) {
        if (-not $image) { continue }
        & docker image inspect $image *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "A required production image is not available locally. Import the verified local build before deploying."
        }
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI is not installed or is not available on PATH."
}

$resolvedEnvFile = Resolve-RequiredFile -Path $EnvFile -Label "Production environment"
$resolvedWorkerEnvFile = Resolve-RequiredFile -Path $WorkerEnvFile -Label "Production worker environment"
$envValues = Read-DotEnvFile -Path $resolvedEnvFile
$enabledText = (Get-EffectiveValue -Name "CLOUDFLARE_ENABLED" -Values $envValues -Default "false").Trim().ToLowerInvariant()
if ($enabledText -notin @("true", "false")) {
    throw "CLOUDFLARE_ENABLED must be exactly true or false."
}
$cloudflareEnabled = $enabledText -eq "true"

$originalProcessValues = @{}
try {
    $imageValues = Read-ProductionImageProfile
    foreach ($key in @("PRODUCTION_BACKEND_IMAGE", "PRODUCTION_WORKER_IMAGE", "PRODUCTION_FRONTEND_IMAGE")) {
        $value = [Environment]::GetEnvironmentVariable($key, "Process")
        if ($null -eq $value -and $imageValues.ContainsKey($key)) {
            $value = [string]$imageValues[$key]
            Set-TemporaryProcessValue -Name $key -Value $value -OriginalValues $originalProcessValues
        }
        if ($null -ne $value -and -not (Test-ProductionImageReference -Value $value)) {
            throw "Invalid production image reference for $key."
        }
    }
    Set-TemporaryProcessValue -Name "PRODUCTION_ENV_FILE" -Value $resolvedEnvFile -OriginalValues $originalProcessValues
    Set-TemporaryProcessValue -Name "PRODUCTION_WORKER_ENV_FILE" -Value $resolvedWorkerEnvFile -OriginalValues $originalProcessValues
    Set-TemporaryProcessValue -Name "CLOUDFLARE_ENABLED" -Value $enabledText -OriginalValues $originalProcessValues

    $baseArgs = @(
        "--env-file", $resolvedEnvFile,
        "-f", $composeBaseFile,
        "-f", $composeFile
    )
    $desiredArgs = @($baseArgs)

    if ($cloudflareEnabled) {
        $desiredArgs += @("--profile", "cloudflare")

        if ($Action -in @("Config", "Up")) {
            $tokenSetting = (Get-EffectiveValue -Name "CLOUDFLARE_TUNNEL_TOKEN_FILE" -Values $envValues).Trim()
            if (-not $tokenSetting) {
                throw "CLOUDFLARE_TUNNEL_TOKEN_FILE is required when CLOUDFLARE_ENABLED=true."
            }
            $tokenFile = Resolve-RequiredFile -Path $tokenSetting -Label "Cloudflare tunnel token"
            $token = [IO.File]::ReadAllText($tokenFile).Trim()
            if (-not $token -or $token -match "[`r`n]") {
                throw "Cloudflare tunnel token file must contain one non-empty token line."
            }
            Set-TemporaryProcessValue -Name "CLOUDFLARE_TUNNEL_TOKEN_FILE" -Value $tokenFile -OriginalValues $originalProcessValues

            $trustProxy = (Get-EffectiveValue -Name "RATE_LIMIT_TRUST_PROXY" -Values $envValues).Trim().ToLowerInvariant()
            if ($trustProxy -ne "true") {
                throw "RATE_LIMIT_TRUST_PROXY must be true when CLOUDFLARE_ENABLED=true."
            }
            $tunnelIp = (Get-EffectiveValue -Name "CLOUDFLARE_TUNNEL_IP" -Values $envValues -Default "172.30.250.14").Trim()
            $trustedPeers = (Get-EffectiveValue -Name "RATE_LIMIT_TRUSTED_PROXY_IPS" -Values $envValues).Trim()
            if ($trustedPeers -ne "$tunnelIp/32") {
                throw "RATE_LIMIT_TRUSTED_PROXY_IPS must be exactly CLOUDFLARE_TUNNEL_IP/32 when Cloudflare is enabled."
            }
            Set-TemporaryProcessValue -Name "CLOUDFLARE_TUNNEL_IP" -Value $tunnelIp -OriginalValues $originalProcessValues
            Set-TemporaryProcessValue -Name "RATE_LIMIT_TRUST_PROXY" -Value "true" -OriginalValues $originalProcessValues
            Set-TemporaryProcessValue -Name "RATE_LIMIT_TRUSTED_PROXY_IPS" -Value $trustedPeers -OriginalValues $originalProcessValues
        }
    }

    switch ($Action) {
        "Config" {
            Invoke-DockerCompose -Arguments ($desiredArgs + @("config", "--quiet"))
            Write-Host "Production Compose configuration is valid. Cloudflare enabled: $enabledText"
        }
        "Up" {
            Invoke-DockerCompose -Arguments ($desiredArgs + @("config", "--quiet"))
            Assert-LocalProductionImages -Arguments $desiredArgs
            Invoke-DockerCompose -Arguments ($baseArgs + @("--profile", "cloudflare", "stop", "cloudflared"))

            # Keep ingress stopped until the API has been recreated with the
            # desired trust policy. The second call starts the complete stack.
            Invoke-DockerCompose -Arguments ($desiredArgs + @(
                "up", "-d", "--no-build", "--pull", "never", "--force-recreate", "--wait", "--wait-timeout", "180", "backend"
            ))
            Invoke-DockerCompose -Arguments ($desiredArgs + @(
                "up", "-d", "--no-build", "--pull", "never", "--wait", "--wait-timeout", "180"
            ))

            if ($cloudflareEnabled) {
                Invoke-DockerCompose -Arguments ($desiredArgs + @("ps", "cloudflared"))
            } else {
                $runningConnector = & docker compose @baseArgs --profile cloudflare ps --status running --quiet cloudflared
                if ($LASTEXITCODE -ne 0) {
                    throw "Unable to verify the stopped Cloudflare connector."
                }
                if ($runningConnector) {
                    throw "CLOUDFLARE_ENABLED=false but the Compose cloudflared connector is still running."
                }
                Write-Host "Production stack is healthy. Compose Cloudflare connector is stopped."
            }
        }
        "Ps" {
            Invoke-DockerCompose -Arguments ($baseArgs + @("--profile", "cloudflare", "ps", "-a"))
            Write-Host "Configured Cloudflare enabled state: $enabledText"
        }
        "Logs" {
            Invoke-DockerCompose -Arguments ($baseArgs + @(
                "--profile", "cloudflare", "logs", "--tail", "100", "backend", "notification-worker", "cloudflared"
            ))
        }
    }
} finally {
    foreach ($entry in $originalProcessValues.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
    }
}
