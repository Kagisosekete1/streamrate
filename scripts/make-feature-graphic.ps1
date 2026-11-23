Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $projectRoot 'public/zyiro-mark.png'
$outputPath = Join-Path $projectRoot 'android/feature-graphic-1024x500.png'

$bitmap = [System.Drawing.Bitmap]::new(1024, 500)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(2, 18, 39))
$purple = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(139, 38, 245))
$green = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 230, 111))
$white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(193, 210, 225))
$titleFont = [System.Drawing.Font]::new('Segoe UI', 94, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$tagFont = [System.Drawing.Font]::new('Segoe UI', 26, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$logo = [System.Drawing.Image]::FromFile($logoPath)

try {
  $graphics.FillRectangle($background, 0, 0, 1024, 500)
  $graphics.FillRectangle($purple, 0, 0, 18, 500)
  $graphics.FillRectangle($green, 1006, 0, 18, 500)
  $graphics.DrawImage($logo, [System.Drawing.Rectangle]::new(48, 50, 400, 400))
  $graphics.DrawString('ZYIRO', $titleFont, $white, 457, 143)
  $graphics.DrawString('PLAY. STREAM. CONNECT.', $tagFont, $muted, 462, 296)
  $graphics.FillRectangle($purple, 463, 356, 180, 9)
  $graphics.FillRectangle($green, 651, 356, 180, 9)
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $logo.Dispose()
  $titleFont.Dispose()
  $tagFont.Dispose()
  $background.Dispose()
  $purple.Dispose()
  $green.Dispose()
  $white.Dispose()
  $muted.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Write-Output $outputPath
