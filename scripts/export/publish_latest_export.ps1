# Publish the newest "Export Roster*.xlsx" from the repo root to docs/ + rosters cache.
# Usage: powershell -File scripts/export/publish_latest_export.ps1
param(
    [string]$ExcelFilePath = "",
    [string]$MonthKey = "",
    [string]$RosterDate = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $root

if (-not $ExcelFilePath) {
    $candidates = Get-ChildItem -LiteralPath $root -Filter "Export Roster*.xlsx" -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending
    if (-not $candidates) {
        throw "No Export Roster*.xlsx found in project root: $root"
    }
    $ExcelFilePath = $candidates[0].FullName
}

if (-not (Test-Path -LiteralPath $ExcelFilePath)) {
    throw "Excel file not found: $ExcelFilePath"
}

$sourceName = [System.IO.Path]::GetFileName($ExcelFilePath)
if (-not $MonthKey) {
    $MonthKey = (python -c "from roster_app.cache_io import month_key_from_filename; print(month_key_from_filename(r'''$sourceName''') or '')").Trim()
    if (-not $MonthKey) {
        throw "Could not detect YYYY-MM month from filename: $sourceName"
    }
}

if (-not $RosterDate) { $RosterDate = "$MonthKey-01" }

Write-Host "[EXPORT] File: $sourceName"
Write-Host "[EXPORT] Month: $MonthKey  Date anchor: $RosterDate"

& (Join-Path $PSScriptRoot "load_local_month.ps1") `
    -ExcelFilePath $ExcelFilePath `
    -MonthKey $MonthKey `
    -RosterDate $RosterDate

Set-Content -LiteralPath (Join-Path $root "last_filename.txt") -Value $sourceName -Encoding UTF8 -NoNewline
Write-Host "[EXPORT] Updated last_filename.txt"
