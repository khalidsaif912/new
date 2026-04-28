param(
    [string]$Date = "",
    [switch]$NoEmail = $true,
    [string]$ExcelFilePath = "",
    [string]$SourceName = ""
)

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "..\.."
$root = (Resolve-Path $root).Path
Set-Location $root

$env:PYTHONIOENCODING = "utf-8"

$argsList = @("generate_and_send.py")
if ($Date) { $argsList += @("--date", $Date) }
if ($NoEmail) { $argsList += "--no-email" }
if ($ExcelFilePath) { $argsList += @("--excel-file", $ExcelFilePath) }
if ($SourceName) { $argsList += @("--source-name", $SourceName) }

Write-Host "[EXPORT] Running: $($argsList -join ' ')"
python @argsList

# Keep docs/schedules in sync with the same roster source so My Schedule
# can show the current month from the latest imported export roster.
$schedArgs = @("generate_employee_schedules.py")
if ($ExcelFilePath) { $schedArgs += @("--excel-file", $ExcelFilePath) }
if ($SourceName) { $schedArgs += @("--filename", $SourceName) }
if ($Date -match '^(\d{4}-\d{2})-\d{2}$') { $schedArgs += @("--month", $Matches[1]) }

Write-Host "[EXPORT] Running: $($schedArgs -join ' ')"
python @schedArgs
