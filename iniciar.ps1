# ============================================================================
#  SAV — Script de inicializacao (backend + frontend juntos)
#  Uso: clique com o botao direito neste arquivo > "Executar com PowerShell"
#       ou, no terminal:  .\iniciar.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'
$raiz     = $PSScriptRoot
$backend  = Join-Path $raiz 'backend'
$frontend = Join-Path $raiz 'sav-frontend'
$python   = Join-Path $backend 'venv\Scripts\python.exe'

Write-Host ''
Write-Host '=== SAV — subindo o sistema ===' -ForegroundColor Cyan
Write-Host ''

# --- Verificacoes de pre-requisitos ----------------------------------------
if (-not (Test-Path $python)) {
    Write-Host "ERRO: ambiente Python (venv) nao encontrado em $python" -ForegroundColor Red
    Write-Host "      Rode a instalacao do backend antes." -ForegroundColor Red
    Read-Host 'Pressione Enter para fechar'
    exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host 'ERRO: Node.js nao encontrado.' -ForegroundColor Red
    Write-Host '      Instale a versao LTS em https://nodejs.org e reabra o VS Code.' -ForegroundColor Red
    Read-Host 'Pressione Enter para fechar'
    exit 1
}

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
    Write-Host 'Primeira execucao: instalando dependencias do frontend (npm install)...' -ForegroundColor Yellow
    Push-Location $frontend
    npm install
    Pop-Location
    Write-Host 'Dependencias instaladas.' -ForegroundColor Green
    Write-Host ''
}

# --- Sobe o BACKEND em uma nova janela -------------------------------------
Write-Host 'Abrindo o BACKEND  -> http://127.0.0.1:8000' -ForegroundColor Green
$cmdBackend = "`$env:PYTHONIOENCODING='utf-8'; Set-Location '$backend'; & '$python' manage.py runserver 127.0.0.1:8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmdBackend

# --- Sobe o FRONTEND em outra janela ---------------------------------------
Write-Host 'Abrindo o FRONTEND -> http://localhost:5173' -ForegroundColor Green
$cmdFrontend = "Set-Location '$frontend'; npm run dev"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmdFrontend

Write-Host ''
Write-Host 'Duas janelas foram abertas (uma para cada servico).' -ForegroundColor Cyan
Write-Host 'Aguarde alguns segundos e acesse no navegador:  http://localhost:5173' -ForegroundColor Cyan
Write-Host 'Para parar, feche as duas janelas que abriram.' -ForegroundColor Cyan
Write-Host ''
Write-Host 'Logins de teste (senha: sav@2026):  cassio | chefe | sof' -ForegroundColor Gray
