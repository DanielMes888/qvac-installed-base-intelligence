param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\..\..\test\fixtures\ocr')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
if (-not $resolvedOutput.StartsWith($repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Fixture output must remain inside the repository: $resolvedOutput"
}
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

$cases = @(
  @{ File = 'clear-image.png'; Lines = @('FABRICANTE NOVAMED', 'MODELO AX-700', 'SERIE SYN-2026-001', 'MODALIDAD MRI', 'ANO 2018'); FontSize = 42; Foreground = [System.Drawing.Color]::FromArgb(20,20,20); Background = [System.Drawing.Color]::White; Rotation = 0 },
  @{ File = 'small-text.png'; Lines = @('FABRICANTE MEDILAB', 'MODELO MICRO-22', 'SERIE SYN-44B9', 'MODALIDAD CT', 'ANO 2021'); FontSize = 22; Foreground = [System.Drawing.Color]::FromArgb(10,10,10); Background = [System.Drawing.Color]::White; Rotation = 0 },
  @{ File = 'low-contrast.png'; Lines = @('FABRICANTE CLARAVIEW', 'MODELO US-310', 'SERIE SYN-LOW-77', 'MODALIDAD ULTRASOUND', 'ANO 2019'); FontSize = 38; Foreground = [System.Drawing.Color]::FromArgb(125,125,125); Background = [System.Drawing.Color]::FromArgb(225,225,225); Rotation = 0 },
  @{ File = 'slight-rotation.png'; Lines = @('FABRICANTE AURORA', 'MODELO PM-8', 'SERIE SYN-ROT-04', 'MODALIDAD MONITOR', 'ANO 2020'); FontSize = 38; Foreground = [System.Drawing.Color]::FromArgb(20,20,20); Background = [System.Drawing.Color]::White; Rotation = 4 },
  @{ File = 'multiple-lines.png'; Lines = @('FABRICANTE VITALIS', 'MODELO XR-55', 'SERIE SYN-ML-500', 'MODALIDAD XRAY', "A$([char]0x00D1)O 2017", "REVISI$([char]0x00D3)N PANAM$([char]0x00C1) DEMO"); FontSize = 34; Foreground = [System.Drawing.Color]::FromArgb(20,20,20); Background = [System.Drawing.Color]::White; Rotation = 0 },
  @{ File = 'alphanumeric.png'; Lines = @('FABRICANTE ORBITAL', 'MODELO MX-9B/42', 'SERIE SN-A7C9-2048', 'MODALIDAD CT', 'ANO 2022'); FontSize = 36; Foreground = [System.Drawing.Color]::FromArgb(20,20,20); Background = [System.Drawing.Color]::White; Rotation = 0 },
  @{ File = 'deliberately-difficult.png'; Lines = @('FABRICANTE NEBULA', 'MODELO Z-13', 'SERIE SYN-HARD-999', 'MODALIDAD MRI', 'ANO 2016'); FontSize = 17; Foreground = [System.Drawing.Color]::FromArgb(158,158,158); Background = [System.Drawing.Color]::FromArgb(215,215,215); Rotation = -7 }
)

foreach ($case in $cases) {
  $bitmap = [System.Drawing.Bitmap]::new(1200, 700, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $bitmap.SetResolution(96, 96)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear($case.Background)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  if ($case.Rotation -ne 0) {
    $graphics.TranslateTransform(600, 350)
    $graphics.RotateTransform($case.Rotation)
    $graphics.TranslateTransform(-600, -350)
  }
  $font = [System.Drawing.Font]::new('Arial', $case.FontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = [System.Drawing.SolidBrush]::new($case.Foreground)
  $border = [System.Drawing.Pen]::new($case.Foreground, 2)
  try {
    $graphics.DrawRectangle($border, 68, 58, 1064, 584)
    $y = 105
    foreach ($line in $case.Lines) {
      $graphics.DrawString($line, $font, $brush, 115, $y)
      $y += [Math]::Max(72, $case.FontSize + 28)
    }
    $destination = Join-Path $resolvedOutput $case.File
    $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $border.Dispose()
    $brush.Dispose()
    $font.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$clearPng = Join-Path $resolvedOutput 'clear-image.png'
$clearJpeg = Join-Path $resolvedOutput 'clear-image.jpg'
$jpegBitmap = [System.Drawing.Bitmap]::FromFile($clearPng)
try {
  $jpegBitmap.Save($clearJpeg, [System.Drawing.Imaging.ImageFormat]::Jpeg)
} finally {
  $jpegBitmap.Dispose()
}

Write-Output "Generated $($cases.Count) synthetic OCR fixtures and one JPEG companion in $resolvedOutput"
