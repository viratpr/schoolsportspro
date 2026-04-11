# Syncs Supabase-related env to Vercel (schoolsportspro). Do not commit secrets.
# Usage: pwsh -File scripts/vercel-sync-env.ps1 -AnonKey '<jwt from Supabase dashboard>'
param(
  [Parameter(Mandatory = $true)]
  [string] $AnonKey
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  throw "Missing $root\.vercel\project.json — run: npx vercel link --yes --project schoolsportspro --scope schoolsportspro from repo root"
}
Set-Location $root

$db = $null
foreach ($line in Get-Content (Join-Path $root ".env")) {
  $t = $line.Trim()
  if ($t -match '^DATABASE_URL=(.+)$') {
    $db = $matches[1].Trim().Trim('"')
    break
  }
}
if (-not $db) { throw "DATABASE_URL not found in .env" }

$publicUrl = "https://xdljhsslfvidgdechvee.supabase.co"

function Vercel-Env-Add {
  param([string]$Name, [string]$Env, [string]$Value, [switch]$Sensitive)
  if ($Sensitive) {
    & npx vercel@latest env add $Name $Env --value $Value --yes --force --sensitive --cwd $root
  } else {
    & npx vercel@latest env add $Name $Env --value $Value --yes --force --cwd $root
  }
  if ($LASTEXITCODE -ne 0) { throw "vercel env add $Name $Env failed: $LASTEXITCODE" }
}

function Vercel-Env-Rm-Safe {
  param([string]$Name, [string]$Env)
  $null = & npx vercel@latest env rm $Name $Env --yes --cwd $root 2>&1
}

# Remove misspelled env var (if present): PUBLISHAE vs PUBLISHABLE
foreach ($e in @("production", "preview", "development")) {
  Vercel-Env-Rm-Safe "NEXT_PUBLIC_SUPABASE_PUBLISHAE_DEFAULT_KEY" $e
}

# Production: DATABASE_URL is sensitive. Development: Vercel disallows --sensitive on Development target.
Vercel-Env-Add "DATABASE_URL" "production" $db -Sensitive
Vercel-Env-Add "DATABASE_URL" "development" $db

# Public Supabase client env (Production + Development). Preview: set in Vercel UI or pass a preview git branch.
foreach ($e in @("production", "development")) {
  Vercel-Env-Add "NEXT_PUBLIC_SUPABASE_URL" $e $publicUrl
  Vercel-Env-Add "NEXT_PUBLIC_SUPABASE_ANON_KEY" $e $AnonKey
  Vercel-Env-Add "NEXT_PUBLIC_AUTH_SUPABASE_FALLBACK" $e "false"
}

# Production NextAuth URL for deployed app (cookies / callbacks)
Vercel-Env-Add "NEXTAUTH_URL" "production" "https://schoolsportspro.vercel.app"

Write-Host "Vercel env sync finished (no secrets printed)."
