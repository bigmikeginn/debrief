param(
  [string]$EnvFile = ".env.beta",
  [switch]$SkipTelegramWebhook
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Cli([string]$Command, [switch]$SuppressEcho) {
  if (-not $SuppressEcho) {
    Write-Host $Command
  }
  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

function Require-Var([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required value: $Name"
  }
  return $value
}

function Test-OpenRouterKey([string]$ApiKey, [string]$Model) {
  Write-Step "Validating OpenRouter API key with model: $Model"
  $headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type"  = "application/json"
    "HTTP-Referer"  = "https://debrief.local"
    "X-Title"       = "Debrief Beta"
  }
  $body = @{
    model = $Model
    messages = @(
      @{
        role = "user"
        content = "Return this exact JSON only: {`"ok`":true}"
      }
    )
    max_tokens = 40
    temperature = 0
  } | ConvertTo-Json -Depth 6

  try {
    $response = Invoke-RestMethod -Method Post -Uri "https://openrouter.ai/api/v1/chat/completions" -Headers $headers -Body $body
    if (-not $response.choices) {
      throw "Unexpected OpenRouter response. No choices returned."
    }
    Write-Host "OpenRouter key check passed." -ForegroundColor Green
  } catch {
    throw "OpenRouter key check failed. Please verify OPENROUTER_API_KEY in your env file. Details: $($_.Exception.Message)"
  }
}

function Import-EnvFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path"
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
      return
    }
    $parts = $line -split "=", 2
    if ($parts.Count -ne 2) {
      return
    }
    $k = $parts[0].Trim()
    $v = $parts[1].Trim()
    [Environment]::SetEnvironmentVariable($k, $v)
  }
}

Write-Step "Loading environment values from $EnvFile"
Import-EnvFile -Path $EnvFile

$supabaseAccessToken = Require-Var "SUPABASE_ACCESS_TOKEN"
$supabaseAccessToken = $supabaseAccessToken.Trim()
$supabaseAccessTokenPrefix = if ($supabaseAccessToken.Length -ge 4) { $supabaseAccessToken.Substring(0,4) } else { $supabaseAccessToken }
if (-not $supabaseAccessToken.StartsWith("sbp_")) {
  throw "SUPABASE_ACCESS_TOKEN must be a Supabase Personal Access Token starting with sbp_. Current prefix: $supabaseAccessTokenPrefix"
}

$projectRef = Require-Var "SUPABASE_PROJECT_REF"
$dbPassword = Require-Var "SUPABASE_DB_PASSWORD"
$openRouterApiKey = Require-Var "OPENROUTER_API_KEY"
$telegramBotToken = Require-Var "TELEGRAM_BOT_TOKEN"
$telegramWebhookSecret = Require-Var "TELEGRAM_WEBHOOK_SECRET"

$modelPrimary = [Environment]::GetEnvironmentVariable("MODEL_PRIMARY")
if ([string]::IsNullOrWhiteSpace($modelPrimary)) { $modelPrimary = "openrouter/free" }

$modelFallback = [Environment]::GetEnvironmentVariable("MODEL_FALLBACK")
if ([string]::IsNullOrWhiteSpace($modelFallback)) { $modelFallback = "meta-llama/llama-3.3-70b-instruct:free" }

$modelChain = [Environment]::GetEnvironmentVariable("MODEL_CHAIN")
if ([string]::IsNullOrWhiteSpace($modelChain)) { $modelChain = "openrouter/free,meta-llama/llama-3.3-70b-instruct:free,deepseek/deepseek-r1:free" }

$modelRefiner = [Environment]::GetEnvironmentVariable("MODEL_REFINER")
if ([string]::IsNullOrWhiteSpace($modelRefiner)) { $modelRefiner = $modelPrimary }

$embeddingModel = [Environment]::GetEnvironmentVariable("EMBEDDING_MODEL")
if ([string]::IsNullOrWhiteSpace($embeddingModel)) { $embeddingModel = "openai/text-embedding-3-small" }

$parseRefinerSecret = [Environment]::GetEnvironmentVariable("PARSE_REFINER_SECRET")
if ([string]::IsNullOrWhiteSpace($parseRefinerSecret)) {
  $parseRefinerSecret = [guid]::NewGuid().ToString("N")
}

$parseRefinerBatchSize = [Environment]::GetEnvironmentVariable("PARSE_REFINER_BATCH_SIZE")
if ([string]::IsNullOrWhiteSpace($parseRefinerBatchSize)) { $parseRefinerBatchSize = "10" }

$parseRefinerMaxAttempts = [Environment]::GetEnvironmentVariable("PARSE_REFINER_MAX_ATTEMPTS")
if ([string]::IsNullOrWhiteSpace($parseRefinerMaxAttempts)) { $parseRefinerMaxAttempts = "3" }

$maxDebriefs = [Environment]::GetEnvironmentVariable("MAX_DEBRIEFS_PER_USER_PER_DAY")
if ([string]::IsNullOrWhiteSpace($maxDebriefs)) { $maxDebriefs = "2" }

$maxChars = [Environment]::GetEnvironmentVariable("MAX_INPUT_CHARS")
if ([string]::IsNullOrWhiteSpace($maxChars)) { $maxChars = "1200" }

$debriefCommand = [Environment]::GetEnvironmentVariable("DEBRIEF_COMMAND")
if ([string]::IsNullOrWhiteSpace($debriefCommand)) { $debriefCommand = "#debrief" }

[Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", $supabaseAccessToken)

Test-OpenRouterKey -ApiKey $openRouterApiKey -Model $modelPrimary

Write-Step "Checking Supabase CLI availability via npx"
Invoke-Cli "npx supabase@latest --version"

Write-Step "Linking local workdir to project $projectRef"
Invoke-Cli "npx supabase@latest link --workdir . --project-ref $projectRef -p $dbPassword" -SuppressEcho

Write-Step "Applying schema SQL"
Invoke-Cli "npx supabase@latest db query --workdir . --linked -f `"sql/001_schema.sql`""

Write-Step "Applying RLS SQL"
Invoke-Cli "npx supabase@latest db query --workdir . --linked -f `"sql/002_rls.sql`""

Write-Step "Applying parsed debrief/search SQL"
Invoke-Cli "npx supabase@latest db query --workdir . --linked -f `"sql/003_debrief_parsing_and_search.sql`""

Write-Step "Applying universal parse pipeline SQL"
Invoke-Cli "npx supabase@latest db query --workdir . --linked -f `"sql/004_parse_pipeline.sql`""

$supabaseUrl = "https://$projectRef.supabase.co"

Write-Step "Setting edge function secrets"
Invoke-Cli "npx supabase@latest secrets set --workdir . --project-ref $projectRef OPENROUTER_API_KEY=$openRouterApiKey TELEGRAM_BOT_TOKEN=$telegramBotToken TELEGRAM_WEBHOOK_SECRET=$telegramWebhookSecret MODEL_PRIMARY=$modelPrimary MODEL_FALLBACK=$modelFallback MODEL_CHAIN=$modelChain MODEL_REFINER=$modelRefiner EMBEDDING_MODEL=$embeddingModel PARSE_REFINER_SECRET=$parseRefinerSecret PARSE_REFINER_BATCH_SIZE=$parseRefinerBatchSize PARSE_REFINER_MAX_ATTEMPTS=$parseRefinerMaxAttempts MAX_DEBRIEFS_PER_USER_PER_DAY=$maxDebriefs MAX_INPUT_CHARS=$maxChars DEBRIEF_COMMAND=$debriefCommand SUPABASE_URL=$supabaseUrl" -SuppressEcho

Write-Step "Deploying telegram-webhook function"
Invoke-Cli "npx supabase@latest functions deploy telegram-webhook --workdir . --project-ref $projectRef --use-api --no-verify-jwt"

Write-Step "Deploying parse-refiner function"
Invoke-Cli "npx supabase@latest functions deploy parse-refiner --workdir . --project-ref $projectRef --use-api --no-verify-jwt"

Write-Step "Configuring parse-refiner schedule (every 2 minutes)"
try {
  $escapedSupabaseUrl = $supabaseUrl.Replace("'", "''")
  $escapedSecret = $parseRefinerSecret.Replace("'", "''")
  $batch = [int]$parseRefinerBatchSize
  if ($batch -lt 1) { $batch = 1 }
  if ($batch -gt 50) { $batch = 50 }

  $scheduleSql = @'
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  existing_job_id integer;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'parse_refiner_every_2m'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'parse_refiner_every_2m',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := '__SUPABASE_URL__/functions/v1/parse-refiner?limit=__BATCH__',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-parse-refiner-secret', '__PARSE_REFINER_SECRET__'
    ),
    body := '{}'::jsonb
  );
  $$
);
'@
  $scheduleSql = $scheduleSql.Replace("__SUPABASE_URL__", $escapedSupabaseUrl)
  $scheduleSql = $scheduleSql.Replace("__BATCH__", "$batch")
  $scheduleSql = $scheduleSql.Replace("__PARSE_REFINER_SECRET__", $escapedSecret)

  $tempScheduleFile = [System.IO.Path]::GetTempFileName() + ".sql"
  Set-Content -LiteralPath $tempScheduleFile -Value $scheduleSql -Encoding UTF8
  Invoke-Cli "npx supabase@latest db query --workdir . --linked -f `"$tempScheduleFile`""
  Remove-Item -LiteralPath $tempScheduleFile -Force -ErrorAction SilentlyContinue
  Write-Host "parse-refiner schedule configured." -ForegroundColor Green
}
catch {
  Write-Warning "Could not configure parse-refiner schedule automatically. You can still run parse-refiner manually. Details: $($_.Exception.Message)"
}

if (-not $SkipTelegramWebhook) {
  $webhookUrl = "$supabaseUrl/functions/v1/telegram-webhook"
  $setWebhookUrl = "https://api.telegram.org/bot$telegramBotToken/setWebhook"
  Write-Step "Registering Telegram webhook"
  $response = Invoke-RestMethod -Method Post -Uri $setWebhookUrl -Body @{
    url = $webhookUrl
    secret_token = $telegramWebhookSecret
  }
  $response | ConvertTo-Json -Depth 5 | Out-Host
}

Write-Step "Beta v1 rollout completed"
Write-Host "Next: create your first club row, then add yourself as admin in club_memberships." -ForegroundColor Green

