param(
  [ValidateSet("smoke", "quick", "standard", "deep")][string]$Preset = "standard",
  [switch]$Resume
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$python = Join-Path $root ".venv-alpha-ai\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "먼저 .\scripts\normal-ai\setup.ps1 을 실행하세요." }
$trainer = Join-Path $root "packages\ai-engine\alpha-ai\train.py"
$output = Join-Path $root "packages\ai-engine\alpha-ai\artifacts\$Preset"
$humanData = Join-Path $root "packages\ai-engine\training\alpha-training-data.json"
$easyModel = Join-Path $root "packages\ai-engine\src\normal-model.json"
if (-not (Test-Path $humanData)) { throw "먼저 .\scripts\normal-ai\fetch-data.ps1 을 실행하세요." }
$arguments = @($trainer, "--preset", $Preset, "--output", $output, "--human-data", $humanData, "--easy-model", $easyModel)
if ($Resume) { $arguments += "--resume" }
& $python @arguments
if ($LASTEXITCODE -ne 0) { throw "Normal AI 학습이 실패했습니다." }
Write-Host "평가 결과: $output\evaluation.json"
