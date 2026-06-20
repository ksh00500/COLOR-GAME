param([ValidateSet("smoke", "quick", "standard", "deep")][string]$Preset = "standard")
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$report = Join-Path $root "packages\ai-engine\alpha-ai\artifacts\$Preset\evaluation.json"
if (-not (Test-Path $report)) { throw "평가 결과가 없습니다: $report" }
Get-Content $report | ConvertFrom-Json | Format-List
