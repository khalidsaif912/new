$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot ".."
$root = (Resolve-Path $root).Path
Set-Location $root

Write-Host "Running Python compile checks..."
python -m py_compile "generate_and_send.py" "generate_and_send_import.py" "generate_employee_schedules.py"

Write-Host "Health check passed."
