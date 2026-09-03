# One-off downloader: self-hosts the Google Fonts we use (OFL-licensed) so the
# page is fully offline. Writes woff2 files + a local fonts.css into ./fonts.
$ErrorActionPreference = 'Stop'
$fontsDir = 'C:\Users\ADMIN\Desktop\drawably-test\fonts'
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
$url = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap'

$css = (Invoke-WebRequest -Uri $url -Headers @{ 'User-Agent' = $ua } -UseBasicParsing).Content
if ([string]::IsNullOrWhiteSpace($css)) { throw 'Got empty CSS from Google Fonts' }

# Procedural instead of a MatchEvaluator delegate so $i/$css scope cleanly.
$urls = [regex]::Matches($css, 'url\((https?://[^)]+)\)') |
  ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
$idx = 0
foreach ($u in $urls) {
  $idx++
  $fn = "font-$idx.woff2"
  Invoke-WebRequest -Uri $u -OutFile (Join-Path $fontsDir $fn) -UseBasicParsing
  $css = $css.Replace($u, "./$fn")
}

# Prepend a tiny header noting the licence so the files stay audit-friendly.
$header = @'
/* Self-hosted from Google Fonts (OFL). Families: Inter, Geist Mono. */
'@
Set-Content -Path (Join-Path $fontsDir 'fonts.css') -Value ($header + $css) -Encoding UTF8
Write-Output ("downloaded font files: " + $idx)
Get-ChildItem $fontsDir | Select-Object Name, Length | Format-Table -AutoSize