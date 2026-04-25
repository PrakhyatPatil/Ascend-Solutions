$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot
try {
    if (-not (Test-Path .\.venv)) {
        python -m venv .venv
    }

    .\.venv\Scripts\python -m pip install --upgrade pip
    .\.venv\Scripts\python -m pip install -r .\requirements.txt

    if (-not (Test-Path .\.env)) {
        Copy-Item .\.env.example .\.env
        Write-Host "Created .env from .env.example. Fill provider URLs/keys before production use."
    }

    Get-Content .\.env | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $parts = $line.Split('=', 2)
        if ($parts.Length -eq 2) {
            [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
        }
    }

    Write-Host "Starting bridge at http://0.0.0.0:8080"
    .\.venv\Scripts\python -m uvicorn app:app --host 0.0.0.0 --port 8080
}
finally {
    Pop-Location
}
