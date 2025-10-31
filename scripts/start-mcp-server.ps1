Param(
  [ValidateSet("http", "stdio")]
  [string]$Mode = "http",
  [int]$Port = 3333,
  [string]$BindHost = "127.0.0.1",
  [string]$Secret,
  [switch]$NoSecret,
  [switch]$VerboseLogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Node {
  $nodeCmd = Get-Command -Name "node" -ErrorAction SilentlyContinue
  if (-not $nodeCmd) {
    throw "Node.js not found in PATH. Install Node.js 18+ and make sure `node` is accessible."
  }
}

function Resolve-RepoRoot {
  $base = $PSScriptRoot
  if (-not $base) {
    $cmdPath = try { $MyInvocation.MyCommand.Path } catch { $null }
    if ($cmdPath) {
      $base = Split-Path -Parent $cmdPath
    } else {
      $base = Get-Location
    }
  }
  return (Resolve-Path -LiteralPath (Join-Path $base "..")).Path
}

Ensure-Node

$repoRoot = Resolve-RepoRoot
Set-Location -LiteralPath $repoRoot

if (-not $Secret -and -not $NoSecret) {
  $Secret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(18))
}

if ($NoSecret) {
  Remove-Item Env:\MCP_SECRET -ErrorAction SilentlyContinue
} elseif ($Secret) {
  $env:MCP_SECRET = $Secret
}

$env:MCP_MODE = $Mode
$env:PORT = $Port
$env:HOST = $BindHost

if ($VerboseLogs) {
  $env:MCP_STDOUT_MIRROR = "1"
}

Write-Host "Starting MCP server..."
Write-Host " root:    $repoRoot"
Write-Host " mode:    $env:MCP_MODE"
Write-Host " host:    $env:HOST"
Write-Host " port:    $env:PORT"
Write-Host " secret:  " -NoNewline

if ($env:MCP_SECRET) {
  $prefix = $env:MCP_SECRET.Substring(0, [Math]::Min(4, $env:MCP_SECRET.Length))
  $suffix = $env:MCP_SECRET.Substring([Math]::Max(0, $env:MCP_SECRET.Length - 4))
  Write-Host ("set (" + $prefix + "***" + $suffix + ")")
} else {
  Write-Host "disabled"
}

Write-Host ""
Write-Host "Press Ctrl+C to stop."

node ".\mcp-server.mjs"
