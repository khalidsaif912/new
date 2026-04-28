param(
    [Parameter(Mandatory = $true)]
    [string]$ExcelFilePath,

    [Parameter(Mandatory = $true)]
    [string]$MonthKey,

    [string]$RosterDate = ""
)

powershell -ExecutionPolicy Bypass -File ".\scripts\export\load_local_month.ps1" -ExcelFilePath $ExcelFilePath -MonthKey $MonthKey -RosterDate $RosterDate

# Keep employee schedules generation for backward compatibility with this wrapper.
$env:PYTHONIOENCODING = "utf-8"
python "generate_employee_schedules.py" --excel-file $ExcelFilePath --filename ([System.IO.Path]::GetFileName($ExcelFilePath))
