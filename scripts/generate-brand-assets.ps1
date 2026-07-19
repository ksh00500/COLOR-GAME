param(
  [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot ".."))
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Add-RoundedPath {
  param(
    [Drawing.Drawing2D.GraphicsPath]$Path,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $Path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $Path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $Path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $Path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $Path.CloseFigure()
}

function Add-LogoTile {
  param(
    [Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Size,
    [float]$Angle,
    [Drawing.Color]$Color,
    [float]$Scale
  )

  $state = $Graphics.Save()
  $cx = ($X + ($Size / 2)) * $Scale
  $cy = ($Y + ($Size / 2)) * $Scale
  $Graphics.TranslateTransform($cx, $cy)
  $Graphics.RotateTransform($Angle)
  $Graphics.TranslateTransform(-$cx, -$cy)
  $path = [Drawing.Drawing2D.GraphicsPath]::new()
  Add-RoundedPath $path ($X * $Scale) ($Y * $Scale) ($Size * $Scale) ($Size * $Scale) (9 * $Scale)
  $brush = [Drawing.SolidBrush]::new($Color)
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
  $Graphics.Restore($state)
}

function New-TangoLogo {
  param([int]$Width)

  $scale = $Width / 92.0
  $height = [Math]::Max(1, [Math]::Round(58 * $scale))
  $bitmap = [Drawing.Bitmap]::new($Width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([Drawing.Color]::Transparent)

  Add-LogoTile $graphics 5 20 32 -9 ([Drawing.ColorTranslator]::FromHtml("#8A3044")) $scale
  Add-LogoTile $graphics 31 12 32 -3 ([Drawing.ColorTranslator]::FromHtml("#253F5C")) $scale
  Add-LogoTile $graphics 57 4 32 8 ([Drawing.ColorTranslator]::FromHtml("#365F49")) $scale

  $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
  $clearBrush = [Drawing.SolidBrush]::new([Drawing.Color]::Transparent)
  foreach ($notch in @(@(34, 32), @(61, 24))) {
    $radius = 4.6 * $scale
    $graphics.FillEllipse(
      $clearBrush,
      ($notch[0] * $scale) - $radius,
      ($notch[1] * $scale) - $radius,
      $radius * 2,
      $radius * 2
    )
  }
  $clearBrush.Dispose()
  $graphics.Dispose()
  return $bitmap
}

function Save-AppIcon {
  param([string]$Path, [int]$Size, [ValidateSet("square", "round", "foreground")][string]$Shape)

  $bitmap = [Drawing.Bitmap]::new($Size, $Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.Clear([Drawing.Color]::Transparent)

  if ($Shape -ne "foreground") {
    $background = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml("#171815"))
    if ($Shape -eq "round") {
      $graphics.FillEllipse($background, 0, 0, $Size, $Size)
    } else {
      $radius = $Size * 0.22
      $shapePath = [Drawing.Drawing2D.GraphicsPath]::new()
      Add-RoundedPath $shapePath 0 0 $Size $Size $radius
      $graphics.FillPath($background, $shapePath)
      $shapePath.Dispose()
    }
    $background.Dispose()
  }

  $logoWidth = [Math]::Round($Size * 0.68)
  $logo = New-TangoLogo $logoWidth
  $x = [Math]::Round(($Size - $logo.Width) / 2)
  $y = [Math]::Round(($Size - $logo.Height) / 2)
  $graphics.DrawImage($logo, $x, $y, $logo.Width, $logo.Height)
  $logo.Dispose()
  $graphics.Dispose()
  $bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

function Save-Splash {
  param([string]$Path, [int]$Width, [int]$Height)

  $bitmap = [Drawing.Bitmap]::new($Width, $Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  $background = [Drawing.Drawing2D.LinearGradientBrush]::new(
    [Drawing.PointF]::new(0, 0),
    [Drawing.PointF]::new($Width, $Height),
    [Drawing.ColorTranslator]::FromHtml("#FFFAF1"),
    [Drawing.ColorTranslator]::FromHtml("#E8DCCB")
  )
  $graphics.FillRectangle($background, 0, 0, $Width, $Height)
  $background.Dispose()

  $minimum = [Math]::Min($Width, $Height)
  $logoWidth = [Math]::Round([Math]::Min($minimum * 0.3, 340))
  $logo = New-TangoLogo $logoWidth
  $logoX = [Math]::Round(($Width - $logo.Width) / 2)
  $logoY = [Math]::Round(($Height - $logo.Height) / 2 - ($minimum * 0.04))
  $logoHeight = $logo.Height
  $graphics.DrawImage($logo, $logoX, $logoY, $logo.Width, $logoHeight)
  $logo.Dispose()

  $fontSize = [Math]::Max(16, [Math]::Round($minimum * 0.055))
  $font = [Drawing.Font]::new("Georgia", $fontSize, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
  $brush = [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml("#2F2923"))
  $text = "T A N G O"
  $textSize = $graphics.MeasureString($text, $font)
  $textX = ($Width - $textSize.Width) / 2
  $textY = $logoY + $logoHeight + ($fontSize * 0.55)
  $graphics.DrawString($text, $font, $brush, $textX, $textY)
  $brush.Dispose()
  $font.Dispose()
  $graphics.Dispose()
  $bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$resourceRoot = Join-Path $RepositoryRoot "apps/mobile/android/app/src/main/res"
$densities = @(
  @{ Name = "mdpi"; Icon = 48; Foreground = 108 },
  @{ Name = "hdpi"; Icon = 72; Foreground = 162 },
  @{ Name = "xhdpi"; Icon = 96; Foreground = 216 },
  @{ Name = "xxhdpi"; Icon = 144; Foreground = 324 },
  @{ Name = "xxxhdpi"; Icon = 192; Foreground = 432 }
)

foreach ($density in $densities) {
  $directory = Join-Path $resourceRoot "mipmap-$($density.Name)"
  Save-AppIcon (Join-Path $directory "ic_launcher.png") $density.Icon "square"
  Save-AppIcon (Join-Path $directory "ic_launcher_round.png") $density.Icon "round"
  Save-AppIcon (Join-Path $directory "ic_launcher_foreground.png") $density.Foreground "foreground"
}

$splashFiles = Get-ChildItem $resourceRoot -Recurse -Filter "splash.png"
foreach ($file in $splashFiles) {
  $source = [Drawing.Image]::FromFile($file.FullName)
  $width = $source.Width
  $height = $source.Height
  $source.Dispose()
  Save-Splash $file.FullName $width $height
}

Write-Host "Generated $($densities.Count * 3) launcher icons and $($splashFiles.Count) splash assets."
