[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$OutputDir,
    [ValidateSet("backend", "all")][string]$Services = "backend",
    [string]$PublicConfig = "",
    [string]$ImagePrefix = "aisw-campus",
    [string]$Python = "python"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$buildHelper = Join-Path $PSScriptRoot "build_production_images.py"
$buildArguments = @($buildHelper, "--services", $Services.ToLowerInvariant(), "--output-dir", $OutputDir, "--image-prefix", $ImagePrefix)
if ($PublicConfig) {
    $buildArguments += @("--public-config", $PublicConfig)
}

& $Python @buildArguments
$buildExitCode = $LASTEXITCODE
if ($buildExitCode -ne 0) {
    Write-Error "Local production image build failed with exit code $buildExitCode" -ErrorAction Continue
    exit $buildExitCode
}
exit 0
