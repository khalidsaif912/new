param(
    [string]$ImportExcelUrl = "",
    [string]$ExcelFilePath = "",
    [string]$SourceName = "",
    [string]$ImportSourceNameUrl = "",
    [string]$PagesBaseUrl = ""
)

powershell -ExecutionPolicy Bypass -File ".\scripts\import\run.ps1" -ImportExcelUrl $ImportExcelUrl -ExcelFilePath $ExcelFilePath -SourceName $SourceName -ImportSourceNameUrl $ImportSourceNameUrl -PagesBaseUrl $PagesBaseUrl
