# Defter Gezgin köprüsü (Windows): defterdeki "Gezgin'de aç" bağlantısı bilgisayardaki klasörü açar.
# Bir kez çalıştırılır; yalnız bu kullanıcı için kurulur (yönetici izni gerekmez).
#   Kur:     powershell -ExecutionPolicy Bypass -File windows-gezgin.ps1
#   Kaldır:  powershell -ExecutionPolicy Bypass -File windows-gezgin.ps1 -Kaldir
# Güvenlik: köprü yalnız var olan bir klasörü ya da dosyanın klasörünü Gezgin'de açar; hiçbir dosyayı çalıştırmaz.
param([switch]$Kaldir)

$anahtar = 'HKCU:\Software\Classes\defter-ac'
$klasor = Join-Path $env:LOCALAPPDATA 'defter'
$isleyici = Join-Path $klasor 'defter-ac.ps1'

if ($Kaldir) {
    Remove-Item -Path $anahtar -Recurse -ErrorAction SilentlyContinue
    Remove-Item -Path $klasor -Recurse -ErrorAction SilentlyContinue
    Write-Host 'Defter Gezgin köprüsü kaldırıldı.'
    exit 0
}

New-Item -ItemType Directory -Force -Path $klasor | Out-Null
@'
param([string]$u)
$p = [uri]::UnescapeDataString(($u -replace '^defter-ac:(//)?', '')).Trim('"').Trim()
if (-not $p) { exit 0 }
if (Test-Path -LiteralPath $p -PathType Container) {
    Start-Process -FilePath explorer.exe -ArgumentList ('"' + $p + '"')
} elseif (Test-Path -LiteralPath $p -PathType Leaf) {
    Start-Process -FilePath explorer.exe -ArgumentList ('/select,"' + $p + '"')
} else {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("Bu klasör bilgisayarda yok:`n$p`n`nDefterin Ayarlar > Bilgisayar alanındaki proje klasörünü kontrol et.", 'Defter') | Out-Null
}
'@ | Set-Content -Path $isleyici -Encoding UTF8

New-Item -Path $anahtar -Force | Out-Null
Set-ItemProperty -Path $anahtar -Name '(default)' -Value 'URL:Defter Gezgin köprüsü'
New-ItemProperty -Path $anahtar -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
New-Item -Path "$anahtar\shell\open\command" -Force | Out-Null
$komut = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $isleyici + '" "%1"'
Set-ItemProperty -Path "$anahtar\shell\open\command" -Name '(default)' -Value $komut

Write-Host 'Defter Gezgin köprüsü kuruldu. Defterde bir yola tıkla, "Gezgin''de aç" de; tarayıcı ilk seferde izin sorar, "Aç" de.'
