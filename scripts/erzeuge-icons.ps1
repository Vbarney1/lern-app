# Erzeugt die App-Icons (PNG) in ./icons. Nur nötig, wenn du das Icon ändern willst.
Add-Type -AssemblyName System.Drawing
$ziel = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $ziel | Out-Null

function Get-RundesRechteck([float]$x, [float]$y, [float]$b, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $b - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $b - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

foreach ($s in 180, 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::FromArgb(79, 70, 229))

  # hintere Karte (leicht versetzt)
  $hinten = Get-RundesRechteck ($s * 0.30) ($s * 0.22) ($s * 0.46) ($s * 0.50) ($s * 0.06)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(165, 180, 252))), $hinten)

  # vordere Karte
  $vorne = Get-RundesRechteck ($s * 0.22) ($s * 0.30) ($s * 0.46) ($s * 0.50) ($s * 0.06)
  $g.FillPath([System.Drawing.Brushes]::White, $vorne)

  # "Textzeilen" auf der vorderen Karte
  $stift = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(79, 70, 229))
  $g.FillPath($stift, (Get-RundesRechteck ($s * 0.29) ($s * 0.42) ($s * 0.32) ($s * 0.05) ($s * 0.02)))
  $g.FillPath($stift, (Get-RundesRechteck ($s * 0.29) ($s * 0.52) ($s * 0.22) ($s * 0.05) ($s * 0.02)))
  $g.FillPath($stift, (Get-RundesRechteck ($s * 0.29) ($s * 0.62) ($s * 0.27) ($s * 0.05) ($s * 0.02)))

  $datei = Join-Path $ziel "icon-$s.png"
  $bmp.Save($datei, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Host "erstellt: $datei"
}
