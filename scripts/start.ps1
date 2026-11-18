# Kleiner lokaler Webserver für die Entwicklung (keine Installation nötig).
# Start: Doppelklick auf start.cmd  –  Beenden: Strg+C bzw. Fenster schließen.
#
# Bei jedem Abruf von faecher/index.json wird der Index neu erzeugt –
# ein neuer Fach-Ordner erscheint also nach einem Neuladen sofort.

param([int]$Port = 8080)
$ErrorActionPreference = 'Stop'

$appOrdner = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'faecher-index.ps1')
Update-FaecherIndex -Wurzel $appOrdner

$typen = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.mjs' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'
  '.txt' = 'text/plain; charset=utf-8'
}

$server = New-Object System.Net.HttpListener
$server.Prefixes.Add("http://localhost:$Port/")
$server.Start()
Write-Host ''
Write-Host "Lern-App läuft:  http://localhost:$Port/" -ForegroundColor Green
Write-Host 'Beenden mit Strg+C.'
Write-Host ''

try {
  while ($server.IsListening) {
    $aufgabe = $server.GetContextAsync()
    while (-not $aufgabe.AsyncWaitHandle.WaitOne(300)) { }  # erlaubt Strg+C
    $ctx = $aufgabe.GetAwaiter().GetResult()
    $antwort = $ctx.Response
    try {
      $pfad = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($pfad -eq '' -or $pfad.EndsWith('/')) { $pfad += 'index.html' }
      if ($pfad -eq 'faecher/index.json') { Update-FaecherIndex -Wurzel $appOrdner -Leise }

      $datei = [IO.Path]::GetFullPath((Join-Path $appOrdner $pfad))
      if ($datei.StartsWith($appOrdner, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path $datei -PathType Leaf)) {
        $inhalt = [IO.File]::ReadAllBytes($datei)
        $endung = [IO.Path]::GetExtension($datei).ToLower()
        $antwort.ContentType = $(if ($typen[$endung]) { $typen[$endung] } else { 'application/octet-stream' })
        $antwort.Headers.Add('Cache-Control', 'no-cache')
        $antwort.ContentLength64 = $inhalt.Length
        $antwort.OutputStream.Write($inhalt, 0, $inhalt.Length)
        $status = 200
      }
      else {
        $antwort.StatusCode = 404
        $status = 404
      }
      Write-Host ("{0}  /{1}" -f $status, $pfad) -ForegroundColor DarkGray
    }
    catch {
      Write-Warning $_.Exception.Message
    }
    finally {
      $antwort.Close()
    }
  }
}
finally {
  $server.Stop()
}
