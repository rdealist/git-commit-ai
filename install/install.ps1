#Requires -Version 5.1
<#
.SYNOPSIS
    Universal Windows installer for git-commit-ai.

.DESCRIPTION
    Auto-detects supported AI agents and installs git-commit-ai skill
    to project-level or global skill directories.

.EXAMPLE
    .\install.ps1

.EXAMPLE
    .\install.ps1 -Project

.EXAMPLE
    .\install.ps1 -Agent codex
#>

[CmdletBinding()]
param(
    [switch]$Project,
    [switch]$Global,
    [string]$Agent,
    [string]$RepoUrl = "https://github.com/rdealist/git-commit-ai"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SkillName = "git-commit-ai"
$ProjectMode = $false
$ModeExplicit = $false

if ($Project -and $Global) {
    throw "-Project and -Global cannot be used together."
}

if ($Project) {
    $ProjectMode = $true
    $ModeExplicit = $true
}
elseif ($Global) {
    $ProjectMode = $false
    $ModeExplicit = $true
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[OK]   $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Test-Command {
    param([Parameter(Mandatory = $true)][string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-GitRepository {
    if (Test-Command -Name "git") {
        git rev-parse --git-dir *> $null
        return $LASTEXITCODE -eq 0
    }

    return Test-Path -LiteralPath (Join-Path -Path (Get-Location).Path -ChildPath ".git")
}

function Get-ProjectRoot {
    if (Test-Command -Name "git") {
        $root = git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and $root) {
            return $root.Trim()
        }
    }

    return (Get-Location).Path
}

function Select-InstallMode {
    if ($script:ModeExplicit) {
        Write-Info "Mode preset by flag: $(if ($script:ProjectMode) { "Project-level" } else { "Global" })"
        return
    }

    $inRepo = Test-GitRepository
    $canPrompt = $false
    try {
        $canPrompt = [Environment]::UserInteractive -and -not [Console]::IsInputRedirected -and -not [Console]::IsOutputRedirected
    }
    catch {
        $canPrompt = $false
    }

    if ($canPrompt) {
        Write-Host ""
        Write-Info "Select installation mode:"

        if ($inRepo) {
            Write-Host "  1) Project-level (recommended)"
            Write-Host "  2) Global"
            $choice = Read-Host "Choose [1/2] (default: 1)"

            if ($choice -eq "2") {
                $script:ProjectMode = $false
            }
            else {
                $script:ProjectMode = $true
            }
        }
        else {
            Write-Host "  1) Global (recommended, current directory is not a git repository)"
            Write-Host "  2) Project-level (requires git repository)"
            $choice = Read-Host "Choose [1/2] (default: 1)"

            if ($choice -eq "2") {
                throw "Project-level installation requires running inside a git repository."
            }

            $script:ProjectMode = $false
        }
    }
    else {
        if ($inRepo) {
            $script:ProjectMode = $true
            Write-Info "No mode flag provided; defaulting to project-level installation."
        }
        else {
            $script:ProjectMode = $false
            Write-Info "No mode flag provided; defaulting to global installation."
        }
    }
}

function Get-AgentInstallDir {
    param(
        [Parameter(Mandatory = $true)][string]$AgentName,
        [Parameter(Mandatory = $true)][bool]$UseProjectMode
    )

    $homeDir = $HOME
    $appData = $env:APPDATA
    $localAppData = $env:LOCALAPPDATA

    switch ($AgentName) {
        { $_ -in @("claude", "claude-code") } {
            if ($UseProjectMode) { return ".\.claude\skills" }
            return (Join-Path -Path $homeDir -ChildPath ".claude\skills")
        }
        "codex" {
            if ($UseProjectMode) { return ".\.codex\skills" }

            $codexDir = Join-Path -Path $homeDir -ChildPath ".codex"
            $codexSkillsDir = Join-Path -Path $codexDir -ChildPath "skills"
            $codexConfigDir = Join-Path -Path $appData -ChildPath "codex\skills"

            if (Test-Path -LiteralPath $codexDir) {
                if (Test-Path -LiteralPath $codexSkillsDir) {
                    return $codexSkillsDir
                }
                return $codexDir
            }

            return $codexConfigDir
        }
        { $_ -in @("gemini", "gemini-cli") } {
            if ($UseProjectMode) { return ".\.gemini\skills" }
            return (Join-Path -Path $homeDir -ChildPath ".gemini\skills")
        }
        { $_ -in @("kimi", "kimi-cli") } {
            $candidates = @()
            if ($UseProjectMode) {
                $candidates = @(
                    ".\.agents\skills",
                    ".\.kimi\skills",
                    ".\.claude\skills",
                    ".\.codex\skills"
                )
            }
            else {
                $candidates = @(
                    (Join-Path -Path $appData -ChildPath "agents\skills"),
                    (Join-Path -Path $homeDir -ChildPath ".agents\skills"),
                    (Join-Path -Path $homeDir -ChildPath ".kimi\skills"),
                    (Join-Path -Path $homeDir -ChildPath ".claude\skills"),
                    (Join-Path -Path $homeDir -ChildPath ".codex\skills")
                )
            }

            foreach ($candidate in $candidates) {
                if (Test-Path -LiteralPath $candidate) {
                    return $candidate
                }
            }

            return $candidates[0]
        }
        "cursor" {
            if ($UseProjectMode) { return ".\.cursor\skills" }
            return (Join-Path -Path $homeDir -ChildPath ".cursor\skills")
        }
        "aider" {
            if ($UseProjectMode) { return ".\.aider\skills" }
            return (Join-Path -Path $homeDir -ChildPath ".aider\skills")
        }
        default {
            if ($UseProjectMode) { return ".\.ai-skills" }
            return (Join-Path -Path $localAppData -ChildPath "git-commit-ai")
        }
    }
}

function Get-InstalledAgents {
    $agents = New-Object System.Collections.Generic.List[string]

    $claudeDir = Join-Path -Path $HOME -ChildPath ".claude"
    $claudeConfigDir = Join-Path -Path $env:APPDATA -ChildPath "claude"
    if ((Test-Path -LiteralPath $claudeDir) -or (Test-Path -LiteralPath $claudeConfigDir) -or (Test-Command -Name "claude")) {
        $agents.Add("claude-code")
    }

    $codexDir = Join-Path -Path $HOME -ChildPath ".codex"
    $codexConfigDir = Join-Path -Path $env:APPDATA -ChildPath "codex"
    if ((Test-Path -LiteralPath $codexDir) -or (Test-Path -LiteralPath $codexConfigDir) -or (Test-Command -Name "codex")) {
        $agents.Add("codex")
    }

    $geminiDir = Join-Path -Path $HOME -ChildPath ".gemini"
    $geminiConfigDir = Join-Path -Path $env:APPDATA -ChildPath "gemini"
    if ((Test-Path -LiteralPath $geminiDir) -or (Test-Path -LiteralPath $geminiConfigDir) -or (Test-Command -Name "gemini")) {
        $agents.Add("gemini-cli")
    }

    $kimiDir = Join-Path -Path $HOME -ChildPath ".kimi"
    $kimiConfigDir = Join-Path -Path $env:APPDATA -ChildPath "kimi"
    if ((Test-Path -LiteralPath $kimiDir) -or (Test-Path -LiteralPath $kimiConfigDir) -or (Test-Command -Name "kimi")) {
        $agents.Add("kimi-cli")
    }

    $cursorDir = Join-Path -Path $HOME -ChildPath ".cursor"
    $cursorAppDataDir = Join-Path -Path $env:APPDATA -ChildPath "Cursor"
    if ((Test-Path -LiteralPath $cursorDir) -or (Test-Path -LiteralPath $cursorAppDataDir)) {
        $agents.Add("cursor")
    }

    $aiderDir = Join-Path -Path $HOME -ChildPath ".aider"
    if ((Test-Path -LiteralPath $aiderDir) -or (Test-Command -Name "aider")) {
        $agents.Add("aider")
    }

    return $agents.ToArray()
}

function New-TempDirectory {
    $path = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ("git-commit-ai-" + [System.Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $path -Force | Out-Null
    return $path
}

function Get-SourceDirectory {
    param([Parameter(Mandatory = $true)][string]$TempDir)

    if (Test-Command -Name "git") {
        Write-Info "Cloning repository..."
        $cloneTarget = Join-Path -Path $TempDir -ChildPath $SkillName
        git clone --depth 1 $RepoUrl $cloneTarget *> $null
        if ($LASTEXITCODE -eq 0) {
            return $cloneTarget
        }

        Write-Warn "git clone failed, fallback to ZIP download..."
    }

    Write-Info "Downloading archive..."
    $zipPath = Join-Path -Path $TempDir -ChildPath "source.zip"
    $requestOptions = @{
        Uri = "$RepoUrl/archive/refs/heads/main.zip"
        OutFile = $zipPath
    }
    if ($PSVersionTable.PSVersion.Major -lt 6) {
        $requestOptions.UseBasicParsing = $true
    }

    Invoke-WebRequest @requestOptions
    Expand-Archive -Path $zipPath -DestinationPath $TempDir -Force

    $sourceDir = Get-ChildItem -Path $TempDir -Directory |
        Where-Object { $_.Name -like "$SkillName-*" } |
        Select-Object -First 1

    if (-not $sourceDir) {
        throw "Cannot locate extracted source directory."
    }

    return $sourceDir.FullName
}

function Install-Skill {
    param([Parameter(Mandatory = $true)][string]$AgentName)

    $installDir = Get-AgentInstallDir -AgentName $AgentName -UseProjectMode $ProjectMode
    $targetDir = Join-Path -Path $installDir -ChildPath $SkillName

    Write-Info "Installing for $AgentName..."
    Write-Info "Target: $targetDir"

    New-Item -ItemType Directory -Path $installDir -Force | Out-Null

    if (Test-Path -LiteralPath $targetDir) {
        Write-Info "Removing old installation..."
        Remove-Item -LiteralPath $targetDir -Recurse -Force
    }

    $tempDir = New-TempDirectory
    try {
        $sourceDir = Get-SourceDirectory -TempDir $tempDir

        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Get-ChildItem -LiteralPath $sourceDir -Force | ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $targetDir -Recurse -Force
        }

        Remove-Item -LiteralPath (Join-Path -Path $targetDir -ChildPath ".git") -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath (Join-Path -Path $targetDir -ChildPath "install") -Recurse -Force -ErrorAction SilentlyContinue

        Write-Success "Installed for $AgentName"
    }
    finally {
        Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Print-Usage {
    param([Parameter(Mandatory = $true)][string]$AgentName)

    $installDir = Get-AgentInstallDir -AgentName $AgentName -UseProjectMode $ProjectMode

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "                 Installation Complete" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""

    if ($ProjectMode) {
        Write-Host "Project-level installation"
        Write-Host "  Location: $(Join-Path -Path $installDir -ChildPath $SkillName)"
    }
    else {
        Write-Host "Global installation"
        Write-Host "  Location: $(Join-Path -Path $installDir -ChildPath $SkillName)"
    }

    Write-Host ""
    switch ($AgentName) {
        { $_ -in @("claude-code", "codex", "gemini-cli", "kimi-cli") } {
            Write-Host "Usage: /skill:git-commit-ai"
        }
        default {
            $scriptPath = Join-Path -Path (Join-Path -Path $installDir -ChildPath $SkillName) -ChildPath "scripts\git-commit-ai.js"
            Write-Host "Usage: node $scriptPath"
        }
    }

    Write-Host ""
}

Write-Info "Git Commit AI - Windows Installer"
Select-InstallMode
Write-Info "Mode: $(if ($ProjectMode) { "Project-level" } else { "Global" })"

if ($ProjectMode -and -not (Test-GitRepository)) {
    throw "Project mode requires running inside a git repository."
}

if ($ProjectMode) {
    Write-Info "Project root: $(Get-ProjectRoot)"
}

$agents = @()
if ($Agent) {
    $agents = @($Agent)
    Write-Info "Using forced agent: $Agent"
}
else {
    Write-Info "Detecting AI agents..."
    $agents = Get-InstalledAgents
}

if ($agents.Count -eq 0) {
    Write-Warn "No AI agents detected. Installing standalone mode..."
    Install-Skill -AgentName "standalone"
    Print-Usage -AgentName "standalone"
    exit 0
}

Write-Info "Detected agents: $($agents -join ", ")"
foreach ($currentAgent in $agents) {
    Install-Skill -AgentName $currentAgent
}

Print-Usage -AgentName $agents[0]
