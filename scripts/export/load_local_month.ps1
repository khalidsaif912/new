param(
    [Parameter(Mandatory = $true)]
    [string]$ExcelFilePath,

    [Parameter(Mandatory = $true)]
    [string]$MonthKey,

    [string]$RosterDate = ""
)

$ErrorActionPreference = "Stop"
function Get-ContentFingerprint {
    param([Parameter(Mandatory = $true)][string]$Path)
    try {
        return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
    } catch {
        # Excel may lock files while open; fallback to metadata fingerprint.
        $item = Get-Item -LiteralPath $Path
        return "META:$($item.Length):$($item.LastWriteTimeUtc.Ticks)"
    }
}

$root = Join-Path $PSScriptRoot "..\.."
$root = (Resolve-Path $root).Path
Set-Location $root

if (-not (Test-Path -LiteralPath $ExcelFilePath)) {
    throw "Excel file not found: $ExcelFilePath"
}

if ($MonthKey -notmatch '^\d{4}-\d{2}$') {
    throw "MonthKey must be YYYY-MM"
}

$rostersDir = Join-Path $root "rosters"
if (-not (Test-Path $rostersDir)) {
    New-Item -ItemType Directory -Path $rostersDir | Out-Null
}

$targetXlsx = Join-Path $rostersDir "$MonthKey.xlsx"
$backupDir = Join-Path $rostersDir ".versions\$MonthKey"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
}
$oldSnapshot = Join-Path $backupDir "previous.xlsx"
$newSnapshot = Join-Path $backupDir "current.xlsx"
$baselineSnapshot = Join-Path $backupDir "baseline.xlsx"
$lastIngestedSnapshot = Join-Path $backupDir "last_ingested.xlsx"
$lastHashFile = Join-Path $backupDir "last_hash.txt"

$incomingHash = Get-ContentFingerprint -Path $ExcelFilePath

if (Test-Path $lastIngestedSnapshot) {
    Copy-Item -LiteralPath $lastIngestedSnapshot -Destination $oldSnapshot -Force
} elseif (Test-Path $targetXlsx) {
    # Fallback for old setup before last_ingested snapshot existed.
    Copy-Item -LiteralPath $targetXlsx -Destination $oldSnapshot -Force
}

# Freeze first edition once; published auto-diff is always baseline → latest.
if (-not (Test-Path -LiteralPath $baselineSnapshot)) {
    if (Test-Path -LiteralPath $oldSnapshot) {
        Copy-Item -LiteralPath $oldSnapshot -Destination $baselineSnapshot -Force
        Write-Host "[EXPORT] Froze previous ingest as baseline.xlsx (first edition)"
    }
}
$srcResolved = (Resolve-Path -LiteralPath $ExcelFilePath).Path
$dstResolved = $targetXlsx
if ($srcResolved -ne $dstResolved) {
    Copy-Item -LiteralPath $ExcelFilePath -Destination $targetXlsx -Force
}
Copy-Item -LiteralPath $targetXlsx -Destination $newSnapshot -Force

$metaPath = Join-Path $rostersDir "$MonthKey.meta.json"
$metaJson = @{
    month_key = $MonthKey
    original_filename = [System.IO.Path]::GetFileName($ExcelFilePath)
    imported_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss K")
} | ConvertTo-Json
Set-Content -LiteralPath $metaPath -Value $metaJson -Encoding UTF8

if (-not $RosterDate) { $RosterDate = "$MonthKey-01" }

Write-Host "[EXPORT] Local month loaded into rosters: $MonthKey"
powershell -ExecutionPolicy Bypass -File ".\scripts\export\run.ps1" -Date $RosterDate -NoEmail -ExcelFilePath $ExcelFilePath -SourceName ([System.IO.Path]::GetFileName($ExcelFilePath))

if (-not (Test-Path -LiteralPath $baselineSnapshot)) {
    Copy-Item -LiteralPath $newSnapshot -Destination $baselineSnapshot -Force
    Write-Host "[EXPORT] Froze current file as baseline.xlsx (first edition)"
}

$diffOld = $baselineSnapshot
if (Test-Path -LiteralPath $diffOld) {
    $sameAsLast = (Test-Path $lastHashFile) -and ((Get-Content -LiteralPath $lastHashFile -Raw).Trim() -eq $incomingHash)
    $baselineHash = Get-ContentFingerprint -Path $diffOld
    if ($sameAsLast) {
        Write-Host "[EXPORT] Incoming file content matches last ingested version (same hash). Keeping previous auto-diff result."
    } elseif ($baselineHash -eq $incomingHash) {
        Write-Host "[EXPORT] First version for $MonthKey detected; diff will start from next update."
    } else {
        Write-Host "[EXPORT] Building auto diff for month: $MonthKey (baseline → latest)"
        python ".\scripts\build_roster_diff.py" --old "$diffOld" --new "$newSnapshot" --kind export --month "$MonthKey" --out-dir "docs/roster-diff/data"
    }
} else {
    Write-Host "[EXPORT] First version for $MonthKey detected; diff will start from next update."
}

Copy-Item -LiteralPath $newSnapshot -Destination $lastIngestedSnapshot -Force
Set-Content -LiteralPath $lastHashFile -Value $incomingHash -Encoding UTF8
