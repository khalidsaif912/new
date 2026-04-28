param(
    [string]$ImportExcelUrl = "",
    [string]$ExcelFilePath = "",
    [string]$SourceName = "",
    [string]$ImportSourceNameUrl = "",
    [string]$PagesBaseUrl = "",
    [string]$MonthKey = ""
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

$env:PYTHONIOENCODING = "utf-8"
if (-not $ImportExcelUrl -and -not $ExcelFilePath) {
    throw "Provide either -ImportExcelUrl or -ExcelFilePath"
}

if ($ImportExcelUrl) { $env:IMPORT_EXCEL_URL = $ImportExcelUrl }
if ($ImportSourceNameUrl) { $env:IMPORT_SOURCE_NAME_URL = $ImportSourceNameUrl }
if ($PagesBaseUrl) { $env:PAGES_BASE_URL = $PagesBaseUrl }

$argsList = @("generate_and_send_import.py")
if ($ExcelFilePath) { $argsList += @("--excel-file", $ExcelFilePath) }
if ($SourceName) { $argsList += @("--source-name", $SourceName) }

Write-Host "[IMPORT] Running: $($argsList -join ' ')"
python @argsList

if ($ExcelFilePath) {
    if (-not $MonthKey) {
        $nameForMonth = if ($SourceName) { $SourceName } else { [System.IO.Path]::GetFileName($ExcelFilePath) }
        if ($nameForMonth -match '(\d{4}-\d{2})') {
            $MonthKey = $Matches[1]
        }
    }
    if ($MonthKey -match '^\d{4}-\d{2}$') {
        $importRosters = Join-Path $root "import-rosters"
        if (-not (Test-Path $importRosters)) { New-Item -ItemType Directory -Path $importRosters -Force | Out-Null }
        $targetXlsx = Join-Path $importRosters "$MonthKey.xlsx"
        $backupDir = Join-Path $importRosters ".versions\$MonthKey"
        if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
        $oldSnapshot = Join-Path $backupDir "previous.xlsx"
        $newSnapshot = Join-Path $backupDir "current.xlsx"
        $lastIngestedSnapshot = Join-Path $backupDir "last_ingested.xlsx"
        $lastHashFile = Join-Path $backupDir "last_hash.txt"
        $incomingHash = Get-ContentFingerprint -Path $ExcelFilePath

        if (Test-Path $lastIngestedSnapshot) {
            Copy-Item -LiteralPath $lastIngestedSnapshot -Destination $oldSnapshot -Force
        } elseif (Test-Path $targetXlsx) {
            # Fallback for old setup before last_ingested snapshot existed.
            Copy-Item -LiteralPath $targetXlsx -Destination $oldSnapshot -Force
        }
        $srcResolved = (Resolve-Path -LiteralPath $ExcelFilePath).Path
        $dstResolved = $targetXlsx
        if ($srcResolved -ne $dstResolved) {
            Copy-Item -LiteralPath $ExcelFilePath -Destination $targetXlsx -Force
        }
        Copy-Item -LiteralPath $targetXlsx -Destination $newSnapshot -Force

        if (Test-Path $oldSnapshot) {
            $sameAsLast = (Test-Path $lastHashFile) -and ((Get-Content -LiteralPath $lastHashFile -Raw).Trim() -eq $incomingHash)
            if ($sameAsLast) {
                Write-Host "[IMPORT] Incoming file content matches last ingested version (same hash). Keeping previous auto-diff result."
            } else {
                Write-Host "[IMPORT] Building auto diff for month: $MonthKey (content-based snapshots)"
                python ".\scripts\build_roster_diff.py" --old "$oldSnapshot" --new "$newSnapshot" --kind import --month "$MonthKey" --out-dir "docs/roster-diff/data"
            }
        } else {
            Write-Host "[IMPORT] First version for $MonthKey detected; diff will start from next update."
        }
        Copy-Item -LiteralPath $newSnapshot -Destination $lastIngestedSnapshot -Force
        Set-Content -LiteralPath $lastHashFile -Value $incomingHash -Encoding UTF8
    } else {
        Write-Host "[IMPORT] Auto diff skipped: MonthKey not provided/detected (expected YYYY-MM)."
    }
}
