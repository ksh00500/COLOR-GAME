param(
  [string]$HostName = "3.26.178.31",
  [string]$KeyPath = "C:\Users\user\.ssh\color-key.pem"
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$output = Join-Path $root "packages\ai-engine\training\alpha-training-data.json"
if (-not (Test-Path $KeyPath)) { throw "SSH 키를 찾을 수 없습니다: $KeyPath" }
ssh -i $KeyPath "ec2-user@$HostName" "set -e; cd /srv/color-game/COLOR-GAME; set -a; . /etc/color-game/server.env; set +a; pnpm --filter @color-game/server ai:export-training /tmp/color-game-alpha-training.json"
if ($LASTEXITCODE -ne 0) { throw "운영 경기 데이터 변환에 실패했습니다." }
scp -i $KeyPath "ec2-user@${HostName}:/tmp/color-game-alpha-training.json" $output
if ($LASTEXITCODE -ne 0) { throw "학습 데이터 다운로드에 실패했습니다." }
$document = Get-Content $output -Raw | ConvertFrom-Json
Write-Host "실제 경기 $($document.gameCount)개, 수순 $($document.positions.Count)개를 내려받았습니다."
