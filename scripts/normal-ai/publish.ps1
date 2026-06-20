param([ValidateSet("quick", "standard", "deep")][string]$Preset = "standard")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$artifact = Join-Path $root "packages\ai-engine\alpha-ai\artifacts\$Preset"
$reportPath = Join-Path $artifact "evaluation.json"
$candidate = Join-Path $artifact "candidate-model.json"
if (-not (Test-Path $reportPath) -or -not (Test-Path $candidate)) { throw "먼저 학습과 평가를 실행하세요." }
$report = Get-Content $reportPath | ConvertFrom-Json
if (-not $report.eligibleForPromotion) {
  throw "승격 거부: 최소 20판 및 기존 AI 상대 승률 55% 기준을 통과하지 못했습니다."
}
$target = Join-Path $root "packages\ai-engine\src\normal-alpha-model.json"
Copy-Item -LiteralPath $candidate -Destination $target -Force
Push-Location $root
try {
  pnpm typecheck
  pnpm test
  pnpm build
} finally { Pop-Location }
Write-Host "Normal 모델을 소스에 반영했습니다. 아직 Git 커밋이나 EC2 배포는 하지 않았습니다."
