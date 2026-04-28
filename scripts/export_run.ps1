param(
    [string]$Date = "",
    [switch]$NoEmail = $true,
    [string]$ExcelFilePath = "",
    [string]$SourceName = ""
)

powershell -ExecutionPolicy Bypass -File ".\scripts\export\run.ps1" -Date $Date -NoEmail:$NoEmail -ExcelFilePath $ExcelFilePath -SourceName $SourceName
