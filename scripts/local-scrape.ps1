# Scrapes from this machine and pushes the result, so the site carries rates from the two banks
# that answer Tajik addresses and refuse foreign datacentres.
#
# Oriyonbonk sits behind a Cloudflare challenge and Arvand's host will not open a connection at all
# from GitHub's runners — both answer normally from here. Everything else keeps updating from GitHub
# on its own schedule, so this only ever adds; a machine that is switched off costs nothing beyond
# those two banks being as stale as they already are today.
#
#   powershell -ExecutionPolicy Bypass -File scripts\local-scrape.ps1
#
# Exits 0 when there was nothing to publish, which is the normal outcome on most runs.

# Deliberately NOT "Stop". Windows PowerShell turns anything a native program writes to stderr into
# an error record, and npm and prisma both write ordinary notices there — a deprecation warning
# would abort the run while nothing was actually wrong. Exit codes are checked explicitly instead,
# which is the only signal that means what it says.
$ErrorActionPreference = "Continue"

$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

function Step($label, [scriptblock]$body) {
  Write-Host "-> $label"
  & $body
  if ($LASTEXITCODE -ne 0) {
    Write-Host "!! $label failed (exit $LASTEXITCODE)"
    exit 1
  }
}

# The database lives outside the repository so a scrape can never stage a binary file, and outside
# the project tree so a `git clean` cannot delete the accumulated history.
$env:DATABASE_URL = "file:$env:LOCALAPPDATA\bankrate\local.db"
$dbDir = "$env:LOCALAPPDATA\bankrate"
if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Force $dbDir | Out-Null }

Step "pull" { git pull --rebase --quiet origin main }

Push-Location backend
Step "migrate" { npx prisma migrate deploy | Out-Null }
Step "seed" { node prisma/seed.js --keep | Out-Null }
Pop-Location

# Restores what the last run — from here or from GitHub — recorded, so rate movement is measured
# against the real previous value rather than against an empty table.
Step "restore snapshot" { npm run snapshot:import --prefix backend | Out-Null }

Step "scrape" { npm run scrape --prefix backend }
Step "save snapshot" { npm run snapshot:export --prefix backend | Out-Null }

git add data/snapshot.json
git diff --staged --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "no rate changes to publish"
  exit 0
}

$stamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm")
Step "commit" { git commit --quiet -m "chore: record rates $stamp UTC (local)" }
Step "push" { git push --quiet origin main }
Write-Host "published - GitHub will rebuild the site"
