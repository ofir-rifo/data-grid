param([ValidateSet('Verify','CrashOwner')][string]$Mode = 'Verify')
$ErrorActionPreference='Stop'
# No Stage 0/build/browser path: the old runner is deliberately unreachable.
if ((Get-ExecutionPolicy) -ne 'RemoteSigned') { throw 'Reviewed effective RemoteSigned policy required; no override/fallback' }
if ($PSVersionTable.PSVersion.ToString() -ne '7.6.5') { throw 'Reviewed PowerShell version changed' }
$expectedHost='C:\Users\ofirr\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe'
if ((Get-Process -Id $PID).Path -ne $expectedHost) { throw 'Unexpected PowerShell host' }
$output=$env:GRID_PERF_VERIFY_OUTPUT
if (-not $output -or -not (Test-Path -LiteralPath $output -PathType Container)) { throw 'Launcher evidence directory required' }
Add-Type -Path "$PSScriptRoot\windows-job.cs","$PSScriptRoot\captured-process.cs","$PSScriptRoot\guard-verification.cs"
if ($Mode -eq 'CrashOwner') {
  [GridVerification]::CrashOwner($env:GRID_PERF_NODE,$PSScriptRoot,$output)
  exit 2
}
try {
  [GridVerification]::Run($env:GRID_PERF_NODE,$PSScriptRoot,$output,$expectedHost)
  exit 0
} catch {
  [Console]::Error.WriteLine($_.Exception.ToString())
  exit 1
}
