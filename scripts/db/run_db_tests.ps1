$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$ConnectionString
)

$testsDir = Resolve-Path "$PSScriptRoot\..\..\database\tests"
$files = Get-ChildItem -Path $testsDir -Filter "*.sql" | Sort-Object Name

foreach ($file in $files) {
  psql $ConnectionString -v ON_ERROR_STOP=1 -f $file.FullName | Out-Host
}

