[CmdletBinding(SupportsShouldProcess = $true)]
param()

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$pending = [Collections.Generic.Stack[string]]::new()
$pending.Push($root)
$removed = 0

while ($pending.Count -gt 0) {
    $directory = $pending.Pop()

    foreach ($item in Get-ChildItem -LiteralPath $directory -Force) {
        # Never follow symbolic links or junctions outside the project.
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            continue
        }

        if ($item.PSIsContainer) {
            if ($item.Name -ne '.git') {
                $pending.Push($item.FullName)
            }
            continue
        }

        if ($item.Name -notlike '_tmp_*') {
            continue
        }

        $target = [IO.Path]::GetFullPath($item.FullName)
        if (-not $target.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to delete a file outside the project: $target"
        }

        if ($PSCmdlet.ShouldProcess($target, 'Delete temporary file')) {
            Remove-Item -LiteralPath $target -Force
            $removed++
        }
    }
}

Write-Output "Deleted $removed temporary file(s)."
