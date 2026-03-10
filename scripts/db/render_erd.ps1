$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$Host,

  [int]$Port = 5432,

  [Parameter(Mandatory = $true)]
  [string]$Database,

  [Parameter(Mandatory = $true)]
  [string]$User,

  [Parameter(Mandatory = $true)]
  [string]$Password,

  [string]$Schema = "public",

  [ValidateSet("disable", "require", "verify-ca", "verify-full")]
  [string]$SslMode = "require",

  [string]$OutDir = "$(Resolve-Path "$PSScriptRoot\..\..\docs\erd\out")"
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$schemaspyImage = "schemaspy/schemaspy:6.2.4"

docker pull $schemaspyImage | Out-Null

foreach ($format in @("svg", "png")) {
  $output = "/output/$format"
  docker run --rm `
    -v "${OutDir}:/output" `
    $schemaspyImage `
    -t pgsql `
    -dp /drivers_inc/postgresql.jar `
    -host $Host `
    -port $Port `
    -db $Database `
    -s $Schema `
    -u $User `
    -p $Password `
    -connprops "sslmode=$SslMode" `
    -imageformat $format `
    -o $output
}
