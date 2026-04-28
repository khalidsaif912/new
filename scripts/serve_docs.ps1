param(
    [int]$Port = 8011
)

$docsPath = Join-Path $PSScriptRoot "..\docs"
$docsPath = (Resolve-Path $docsPath).Path

Write-Host "Serving docs from: $docsPath"
Write-Host "Open: http://127.0.0.1:$Port"

Set-Location $docsPath
python -m http.server $Port --bind 127.0.0.1
