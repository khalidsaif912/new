# Copy legacy import redirect into a sibling roster-site repo (GitHub Pages: /roster-site/import/).
param(
    [string]$RosterSiteRepo = (Join-Path (Split-Path $PSScriptRoot -Parent) "..\roster-site")
)

$src = Join-Path $PSScriptRoot "..\legacy-redirects\roster-site\import\index.html"
$src = (Resolve-Path $src).Path

if (-not (Test-Path $RosterSiteRepo)) {
    Write-Host "Roster-site repo not found at: $RosterSiteRepo"
    Write-Host "Copy manually: $src -> <roster-site-repo>/import/index.html"
    exit 1
}

$destDir = Join-Path $RosterSiteRepo "import"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
$dest = Join-Path $destDir "index.html"
Copy-Item -Force $src $dest
Write-Host "Copied redirect to: $dest"
Write-Host "Commit and push roster-site repo to activate https://khalidsaif912.github.io/roster-site/import/ redirect."
