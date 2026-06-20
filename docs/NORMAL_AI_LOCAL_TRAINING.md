# Normal AI 로컬 학습 매뉴얼

Easy는 기존 온라인 22경기·626수로 학습한 경량 모델을 사용합니다. Normal은 실제 온라인 경기 데이터 30%와 로컬 자가대전 데이터 70%를 섞어 학습한 AlphaZero-lite 후보가 평가를 통과한 뒤에만 잠금 해제됩니다. Hard는 계속 잠금 상태입니다.

학습과 모델 승격은 사용자가 원할 때만 실행하며 GitHub나 EC2에 자동 배포하지 않습니다.

## 1. 최초 환경 구성

RTX 4060 Laptop 8GB, RAM 64GB, Windows PowerShell과 Python 3.12 환경을 기준으로 합니다. 전원을 연결하고 Windows 절전을 해제합니다.

```powershell
.\scripts\normal-ai\setup.ps1
```

마지막 출력에서 `CUDA: True`와 RTX 4060 이름을 확인합니다. `False`이면 학습하지 말고 NVIDIA 드라이버와 PyTorch CUDA 설치부터 확인합니다.

## 2. 실제 경기 데이터 받기

운영 RDS 비밀번호를 로컬에 저장하지 않습니다. EC2가 경기 상태를 익명화된 학습 JSON으로 변환하고 SSH로 내려받습니다.

```powershell
.\scripts\normal-ai\fetch-data.ps1
```

기본 SSH 키는 `C:\Users\user\.ssh\color-key.pem`, 서버는 `3.26.178.31`입니다. 새 온라인 경기를 학습에 포함하려면 학습 전에 다시 실행합니다.

## 3. 학습 실행

먼저 전체 파이프라인만 확인합니다. `smoke` 결과는 승격할 수 없습니다.

```powershell
.\scripts\normal-ai\train.ps1 -Preset smoke
```

실제 후보는 다음 중 하나로 학습합니다.

```powershell
.\scripts\normal-ai\train.ps1 -Preset quick
.\scripts\normal-ai\train.ps1 -Preset standard
.\scripts\normal-ai\train.ps1 -Preset deep
```

권장은 `standard`입니다. 각 학습은 생성된 자가대전 위치를 70%, 실제 플레이 위치를 30% 비율로 구성합니다. 실제 데이터가 적으면 복원 추출해 비율을 유지합니다.

## 4. 중단 후 재개

```powershell
.\scripts\normal-ai\train.ps1 -Preset standard -Resume
```

체크포인트와 자가대전 버퍼는 `packages/ai-engine/alpha-ai/artifacts/`에 저장되며 Git에 포함되지 않습니다.

## 5. 평가와 승격

```powershell
.\scripts\normal-ai\status.ps1 -Preset standard
.\scripts\normal-ai\publish.ps1 -Preset standard
```

신규 모델은 기존 심화 규칙 AI와 선후공을 바꿔 평가합니다. 최소 20판, 무승부 제외 승률 55% 이상이어야 승격할 수 있습니다. 승격 명령은 `normal-alpha-model.json`을 교체하고 타입 검사, 전체 테스트, 빌드를 실행하지만 커밋과 EC2 배포는 하지 않습니다.

## 6. 배포 전 확인

```powershell
git diff -- packages/ai-engine/src/normal-alpha-model.json
git status --short
```

평가 결과와 모델 크기를 확인한 다음 별도 커밋·배포합니다. 문제가 있으면 이전 정상 모델을 되돌리는 새 커밋을 만들어 재배포합니다.

## 운영 원칙

- 자동 학습·자동 배포를 하지 않습니다.
- `smoke` 모델은 승격할 수 없습니다.
- 평가 기준을 낮추지 않습니다.
- 자가대전은 로컬에서만 실행하며 게임 서버와 RDS에 부하를 주지 않습니다.
- 학습 중 발열이 높으면 중단하고 `-Resume`으로 이어서 실행합니다.
