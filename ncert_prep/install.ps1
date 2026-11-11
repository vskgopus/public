# NCERT Exam Prep - installer for Windows 10/11. Started by install.bat.
$ErrorActionPreference = "Stop"
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $AppDir

function Say($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ask($q) { $a = Read-Host "$q [Y/n]"; return ($a -eq "" -or $a -match "^[Yy]") }

Say "Checking Python"
$py = $null; $pyArgs = @()
if (Get-Command py -ErrorAction SilentlyContinue) { $py = "py"; $pyArgs = @("-3") }
elseif (Get-Command python -ErrorAction SilentlyContinue) { $py = "python" }
if ($py) {
    try { $ok = & $py @pyArgs -c "import sys; print(sys.version_info >= (3, 10))" 2>$null } catch { $ok = "" }
    if ($ok -ne "True") { $py = $null }
}
if (-not $py) {
    Write-Host "Python 3.10 or newer was not found."
    if ((Get-Command winget -ErrorAction SilentlyContinue) -and (Ask "Install Python 3.12 now with winget?")) {
        winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
        Write-Host "Python installed. Close this window and run install.bat again."
    } else {
        Write-Host "Install Python from https://www.python.org/downloads/ (tick 'Add python.exe to PATH'), then run install.bat again."
    }
    Read-Host "Press Enter to close"; exit 1
}

Say "Installing the app's Python packages (into $AppDir\.venv)"
if (-not (Test-Path ".venv\Scripts\python.exe")) { & $py @pyArgs -m venv .venv }
& .venv\Scripts\python.exe -m pip install --quiet --upgrade pip
& .venv\Scripts\python.exe -m pip install --quiet -r requirements.txt

Say "Creating shortcuts"
$shell = New-Object -ComObject WScript.Shell
$targets = @(
    [Environment]::GetFolderPath("Desktop"),
    (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs")
)
foreach ($dir in $targets) {
    $lnk = $shell.CreateShortcut((Join-Path $dir "NCERT Exam Prep.lnk"))
    $lnk.TargetPath = Join-Path $AppDir ".venv\Scripts\pythonw.exe"
    $lnk.Arguments = "`"$(Join-Path $AppDir 'launcher.py')`""
    $lnk.WorkingDirectory = $AppDir
    $lnk.IconLocation = Join-Path $AppDir "assets\icon.ico"
    $lnk.Description = "Printable CBSE notes and question banks from NCERT textbooks"
    $lnk.Save()
}
Write-Host "Added 'NCERT Exam Prep' to the desktop and the Start menu."

Say "Checking Claude Code (needed only for the 'Claude login' option)"
if (Get-Command claude -ErrorAction SilentlyContinue) {
    Write-Host "Claude Code is installed."
} elseif (Ask "Install Claude Code now (lets the app use your Claude Pro/Max login)?") {
    Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
} else {
    Write-Host "Skipped. You can still use an API key, or install it later in PowerShell with:"
    Write-Host "  irm https://claude.ai/install.ps1 | iex"
}

Say "Done"
Write-Host "Open 'NCERT Exam Prep' from the desktop or Start menu."
Write-Host "On first start, the Settings panel lets you log in with Claude or enter an API key."
Read-Host "Press Enter to close"
