$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$venv = Join-Path $root ".venv-alpha-ai"
$requirements = Join-Path $root "packages\ai-engine\alpha-ai\requirements.txt"

if (-not (Test-Path (Join-Path $venv "Scripts\python.exe"))) {
  python -m venv $venv
}
$python = Join-Path $venv "Scripts\python.exe"
& $python -m pip install --upgrade pip
& $python -m pip install -r $requirements
& $python -m pip install --upgrade --force-reinstall torch==2.11.0+cu128 --index-url https://download.pytorch.org/whl/cu128
& $python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU')"
if ($LASTEXITCODE -ne 0) { throw "PyTorch CUDA 확인에 실패했습니다." }
& $python -c "import torch, sys; sys.exit(0 if torch.cuda.is_available() else 1)"
if ($LASTEXITCODE -ne 0) { throw "CUDA가 비활성 상태입니다. NVIDIA 드라이버와 PyTorch CUDA 설치를 확인하세요." }
