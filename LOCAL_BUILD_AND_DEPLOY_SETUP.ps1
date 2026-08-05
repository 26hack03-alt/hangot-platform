$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Set-Location -LiteralPath $PSScriptRoot
Write-Host "[Hangot] Project root: $PSScriptRoot"

function Require-Command([string]$Name, [string]$InstallHint) {
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        Write-Error "$Name command was not found. $InstallHint"
    }
    return $command
}

function Test-RequiredFiles([string]$GroupName, [string[]]$Paths) {
    Write-Host "`n[$GroupName]"
    $missing = @()
    foreach ($relativePath in $Paths) {
        if (Test-Path -LiteralPath (Join-Path $PSScriptRoot $relativePath)) {
        Write-Host "  [OK] $relativePath"
        } else {
            Write-Host "  [MISSING] $relativePath" -ForegroundColor Red
            $missing += $relativePath
        }
    }
    if ($missing.Count -gt 0) {
        throw "$GroupName required files are missing."
    }
}

Require-Command "node" "Install Node.js 22.13 or newer, then reopen PowerShell." | Out-Null
$nodeVersion = (& node --version).Trim()
Write-Host "Node.js: $nodeVersion"

Require-Command "pnpm" "Run 'corepack enable' and 'corepack prepare pnpm@latest --activate', or install pnpm." | Out-Null
$pnpmVersion = (& pnpm --version).Trim()
Write-Host "pnpm: $pnpmVersion"

Test-RequiredFiles "Google auth file check" @(
    "app/api/auth/google/route.ts",
    "app/auth/callback/route.ts",
    "app/login/page.tsx",
    "app/api/auth/session/route.ts",
    "app/api/auth/refresh/route.ts",
    "app/api/auth/logout/route.ts",
    "app/admin/layout.tsx",
    "app/manager/layout.tsx"
)

$loginSource = Get-Content -LiteralPath (Join-Path $PSScriptRoot "app/login/page.tsx") -Raw -Encoding UTF8
if ($loginSource -notmatch '/api/auth/google') {
    throw "Google login button text was not found."
}
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot "app/api/auth/anonymous/route.ts")) {
    throw "Anonymous login API is still present."
}
Write-Host "  [OK] Google login button exists and anonymous login API is removed."

Test-RequiredFiles "Existing feature preservation check" @(
    "app/page.tsx",
    "app/globals.css",
    "app/components/PortalShell.tsx",
    "app/clubs/[clubId]/apply/page.tsx",
    "app/board/page.tsx",
    "app/questions/page.tsx",
    "app/admin/page.tsx",
    "app/api/applications/route.ts",
    "app/api/posts/route.ts",
    "app/api/questions/route.ts",
    "db/schema.ts"
)

Write-Host "`n[Git secret-file check]"
if (Test-Path -LiteralPath (Join-Path $PSScriptRoot ".git")) {
    $trackedEnv = @(& git ls-files -- ".env" ".env.local" 2>$null)
    if ($trackedEnv.Count -gt 0) {
        throw "Real environment files are tracked by Git: $($trackedEnv -join ', ')"
    }
    Write-Host "  [OK] .env and .env.local are not tracked by Git."
} else {
    Write-Host "  [INFO] This is not a Git repository yet. Run this check again after git init."
}

$ignoredDirectories = "\\(node_modules|\.git|dist|\.next|\.wrangler)\\"
$scanExtensions = @(".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".yaml", ".yml", ".env", ".example")
$secretPatterns = @(
    "SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+",
    "GOOGLE_(OAUTH_)?CLIENT_SECRET\s*=\s*\S+",
    "(?:ACCESS|REFRESH)_TOKEN\s*=\s*\S+",
    "sb_secret_[A-Za-z0-9_-]+",
    "postgres(?:ql)?://[^\s]+"
)
$secretFiles = New-Object System.Collections.Generic.List[string]
Get-ChildItem -LiteralPath $PSScriptRoot -Recurse -File | Where-Object {
    $_.FullName -notmatch $ignoredDirectories -and
    $_.Name -notin @("package-lock.json", "pnpm-lock.yaml") -and
    ($scanExtensions -contains $_.Extension -or $_.Name -like ".env*")
} | ForEach-Object {
    if (Select-String -LiteralPath $_.FullName -Pattern $secretPatterns -Quiet -ErrorAction SilentlyContinue) {
        $secretFiles.Add($_.FullName)
    }
}
if ($secretFiles.Count -gt 0) {
    Write-Host "Potential secret-containing files were found. Values will not be printed:" -ForegroundColor Red
    $secretFiles | Sort-Object -Unique | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "Secret pattern check failed."
}
Write-Host "  [OK] No literal secret patterns were found in scanned files."

Write-Host "`n[Dependency install] pnpm install --frozen-lockfile"
& pnpm install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }

Write-Host "`n[Full build]"
$env:WRANGLER_LOG_PATH = ".wrangler/wrangler.log"
& pnpm exec vinext build
if ($LASTEXITCODE -ne 0) { throw "Full build failed. Stop deployment." }

Write-Host "`n[DONE] Install, security checks, feature checks, and full build succeeded." -ForegroundColor Green
Write-Host "Local run: `$env:WRANGLER_LOG_PATH='.wrangler/wrangler.log'; pnpm exec vinext dev"
