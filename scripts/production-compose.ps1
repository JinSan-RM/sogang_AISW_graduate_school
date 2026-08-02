[CmdletBinding()]
param(
    [ValidateSet("Config", "Up", "Ps", "Logs")]
    [string]$Action = "Up",
    [string]$EnvFile = ".env.production",
    [string]$WorkerEnvFile = ".env.production.worker"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
            Invoke-DockerCompose -Arguments ($baseArgs + @("--profile", "cloudflare", "stop", "cloudflared"))

            # Keep ingress stopped until the API has been recreated with the
            # desired trust policy. The second call starts the complete stack.
            Invoke-DockerCompose -Arguments ($desiredArgs + @(
                "up", "-d", "--build", "--force-recreate", "--wait", "--wait-timeout", "180", "backend"
            ))
            Invoke-DockerCompose -Arguments ($desiredArgs + @(
                "up", "-d", "--build", "--wait", "--wait-timeout", "180"
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
