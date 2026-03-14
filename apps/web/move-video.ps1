# Move Kidsplaying.mp4 to the right place for the login page.
# Run from repo root:  .\apps\web\move-video.ps1
# Or put Kidsplaying.mp4 in project root and run:  .\apps\web\move-video.ps1

$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $projectRoot) { $projectRoot = (Get-Location).Path }

$sources = @(
    (Join-Path $projectRoot "Kidsplaying.mp4"),
    (Join-Path $projectRoot "apps\web\Kidsplaying.mp4"),
    (Join-Path $env:USERPROFILE "Downloads\Kidsplaying.mp4"),
    (Join-Path $env:USERPROFILE "Desktop\Kidsplaying.mp4")
)
$dest = Join-Path $projectRoot "apps\web\public\Kidsplaying.mp4"

foreach ($src in $sources) {
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dest -Force
        Write-Host "Copied to: $dest"
        exit 0
    }
}
Write-Host "Kidsplaying.mp4 not found. Put it in project root or run: Copy-Item 'YOUR_PATH\Kidsplaying.mp4' '$dest'"
exit 1
