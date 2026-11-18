# Erzeugt faecher/index.json aus allen Unterordnern von /faecher.
# Jeder Ordner mit einer fragen.json wird ein Fach. Ordner, die mit "_"
# beginnen, werden ignoriert (z. B. für Entwürfe).
#
# Direkt aufrufen:   powershell -ExecutionPolicy Bypass -File scripts\faecher-index.ps1
# (start.cmd macht das automatisch.)

param([string]$Wurzel = (Join-Path $PSScriptRoot '..'))

function Update-FaecherIndex {
  param([string]$Wurzel, [switch]$Leise)

  $ordnerFaecher = Join-Path $Wurzel 'faecher'
  $liste = New-Object System.Collections.ArrayList
  $fehler = 0

  foreach ($ordner in Get-ChildItem -Path $ordnerFaecher -Directory | Sort-Object Name) {
    if ($ordner.Name.StartsWith('_')) { continue }
    $datei = Join-Path $ordner.FullName 'fragen.json'
    if (-not (Test-Path $datei)) {
      Write-Warning "Ordner '$($ordner.Name)' hat keine fragen.json – übersprungen."
      continue
    }
    try {
      $daten = [IO.File]::ReadAllText($datei, [Text.Encoding]::UTF8) | ConvertFrom-Json
      $fragen = @($daten.fragen)
      if ($fragen.Count -eq 0) { throw 'Feld "fragen" fehlt oder ist leer.' }

      $ohneId = @($fragen | Where-Object { -not $_.id })
      if ($ohneId.Count) { throw "$($ohneId.Count) Frage(n) ohne 'id'." }
      $ohneTyp = @($fragen | Where-Object { -not $_.typ })
      if ($ohneTyp.Count) { throw "$($ohneTyp.Count) Frage(n) ohne 'typ'." }
      $doppelt = @($fragen | Group-Object id | Where-Object Count -gt 1 | ForEach-Object Name)
      if ($doppelt.Count) { throw "Doppelte IDs: $($doppelt -join ', ')" }

      [void]$liste.Add([ordered]@{
        id           = $ordner.Name
        name         = $(if ($daten.name) { $daten.name } else { $ordner.Name })
        beschreibung = $(if ($daten.beschreibung) { $daten.beschreibung } else { '' })
        symbol       = $(if ($daten.symbol) { $daten.symbol } else { '📚' })
        anzahl       = $fragen.Count
      })
      if (-not $Leise) { Write-Host "  ✓ $($ordner.Name): $($fragen.Count) Fragen" }
    }
    catch {
      $fehler++
      Write-Warning "Fach '$($ordner.Name)' fehlerhaft: $($_.Exception.Message)"
    }
  }

  $json = ConvertTo-Json -Depth 5 -InputObject ([ordered]@{ faecher = $liste })
  [IO.File]::WriteAllText((Join-Path $ordnerFaecher 'index.json'), $json, (New-Object Text.UTF8Encoding $false))
  if (-not $Leise) { Write-Host "faecher/index.json geschrieben ($($liste.Count) Fächer, $fehler fehlerhaft)." }
}

# Nur ausführen, wenn das Skript direkt gestartet (nicht eingebunden) wurde.
if ($MyInvocation.InvocationName -ne '.') {
  Update-FaecherIndex -Wurzel (Resolve-Path $Wurzel).Path
}
