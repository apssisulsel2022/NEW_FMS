$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)]
  [string]$ConnectionString,

  [string]$OutFile = "$(Resolve-Path "$PSScriptRoot\..\..\docs\benchmarks\critical_plans.txt")",

  [string]$EventOrganizerId = "00000000-0000-0000-0000-000000000000",
  [string]$CompetitionId = "00000000-0000-0000-0000-000000000000",
  [string]$MatchId = "00000000-0000-0000-0000-000000000000",
  [string]$TeamId = "00000000-0000-0000-0000-000000000000",
  [string]$PlayerId = "00000000-0000-0000-0000-000000000000"
)

$outDir = Split-Path -Parent $OutFile
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sqlFile = Resolve-Path "$PSScriptRoot\critical_operations_explain.sql"

psql $ConnectionString `
  -v "event_organizer_id=$EventOrganizerId" `
  -v "competition_id=$CompetitionId" `
  -v "match_id=$MatchId" `
  -v "team_id=$TeamId" `
  -v "player_id=$PlayerId" `
  -f $sqlFile `
  | Out-File -FilePath $OutFile -Encoding utf8

