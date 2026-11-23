<#
  Publica o Programa Formar no AWS Lightsail Containers.

  Primeira publicação (lê as variáveis do arquivo .env.production.local):
    powershell -ExecutionPolicy Bypass -File scripts/publicar-aws.ps1 -Primeira

  Atualizações (reaproveita as variáveis que já estão na AWS; não precisa do arquivo):
    powershell -ExecutionPolicy Bypass -File scripts/publicar-aws.ps1

  Requisitos: Docker Desktop aberto, AWS CLI v2 configurado (perfil "programa-formar") e o plugin lightsailctl.
#>
param(
  [switch]$Primeira,
  [string]$Servico = 'programa-formar',
  [string]$Regiao = 'sa-east-1',
  [string]$Perfil = 'programa-formar',
  [string]$ArquivoEnv = '.env.production.local'
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Falhar($msg) { Write-Host "ERRO: $msg" -ForegroundColor Red; exit 1 }
function Passo($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }

Passo 'Conferindo testes, tipos e lint'
npm run check
if ($LASTEXITCODE -ne 0) { Falhar 'As checagens falharam. Nada foi publicado.' }

Passo 'Montando a imagem Docker (linux/amd64)'
$deploymentId = Get-Date -Format 'yyyyMMddHHmmss'
docker build --platform linux/amd64 --build-arg NEXT_DEPLOYMENT_ID=$deploymentId -t programa-formar:latest .
if ($LASTEXITCODE -ne 0) { Falhar 'O docker build falhou. O Docker Desktop está aberto?' }

Passo 'Enviando a imagem para o Lightsail (pode levar alguns minutos sem mostrar nada; aguarde)'
# O envio escreve o progresso na saída de erro. Rodar pelo cmd evita que o PowerShell 5.1
# trate essas linhas de progresso como erro (NativeCommandError).
$saida = cmd /c "aws lightsail push-container-image --region $Regiao --profile $Perfil --service-name $Servico --label site --image programa-formar:latest 2>&1" | Out-String
$codigo = $LASTEXITCODE
Write-Host $saida
if ($codigo -ne 0) { Falhar 'O envio da imagem falhou.' }
$m = [regex]::Match($saida, '":' + [regex]::Escape($Servico) + '\.site\.\d+"')
if (-not $m.Success) { Falhar 'Não encontrei a referência da imagem enviada na saída do comando.' }
$imagem = $m.Value.Trim('"')
Write-Host "Imagem enviada: $imagem"

if ($Primeira) {
  Passo "Lendo variáveis de $ArquivoEnv"
  if (-not (Test-Path $ArquivoEnv)) { Falhar "Arquivo $ArquivoEnv não encontrado." }
  $vars = [ordered]@{ NODE_ENV = 'production' }
  foreach ($linha in Get-Content $ArquivoEnv -Encoding UTF8) {
    if ($linha -match '^\s*#' -or $linha -notmatch '=') { continue }
    $i = $linha.IndexOf('=')
    $vars[$linha.Substring(0, $i).Trim()] = $linha.Substring($i + 1).Trim()
  }
  foreach ($obrig in 'DATABASE_URL', 'DATABASE_CA_CERT', 'CPF_HMAC_KEY', 'CPF_ENC_KEY', 'SITE_URL', 'ORIGEM_SEGREDO') {
    if (-not $vars[$obrig]) { Falhar "Falta $obrig em $ArquivoEnv." }
  }
  # Na AWS o certificado vai como conteúdo (uma linha com \n), não como caminho do PC.
  if (Test-Path $vars['DATABASE_CA_CERT']) {
    $vars['DATABASE_CA_CERT'] = (node scripts/ca-uma-linha.mjs $vars['DATABASE_CA_CERT']).Trim()
  }
  $ambiente = $vars
  $endpoint = @{
    containerName  = 'site'
    containerPort  = 3000
    healthCheck    = @{ path = '/api/saude'; successCodes = '200'; intervalSeconds = 30; timeoutSeconds = 5; healthyThreshold = 2; unhealthyThreshold = 3 }
  }
} else {
  Passo 'Lendo a configuração atual na AWS (variáveis continuam as mesmas)'
  $json = aws lightsail get-container-services --region $Regiao --profile $Perfil --service-name $Servico --output json | Out-String
  if ($LASTEXITCODE -ne 0) { Falhar 'Não consegui ler o serviço na AWS.' }
  $atual = ($json | ConvertFrom-Json).containerServices[0].currentDeployment
  if (-not $atual) { Falhar 'O serviço ainda não tem publicação. Rode com -Primeira.' }
  $ambiente = $atual.containers.site.environment
  $endpoint = $atual.publicEndpoint
}

$config = @{
  serviceName    = $Servico
  containers     = @{ site = @{ image = $imagem; environment = $ambiente; ports = @{ '3000' = 'HTTP' } } }
  publicEndpoint = $endpoint
}

# Arquivo temporário com as variáveis (contém segredos): apagado logo em seguida.
$tmp = Join-Path $env:TEMP ("lightsail-" + [guid]::NewGuid() + '.json')
try {
  [IO.File]::WriteAllText($tmp, ($config | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))
  Passo 'Criando a nova publicação'
  aws lightsail create-container-service-deployment --region $Regiao --profile $Perfil --cli-input-json "file://$tmp" --output json | Out-Null
  if ($LASTEXITCODE -ne 0) { Falhar 'A criação da publicação falhou.' }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host "`nPublicação enviada. Acompanhe no painel do Lightsail (Deployments) até ficar 'Active' (2 a 5 minutos)." -ForegroundColor Green
