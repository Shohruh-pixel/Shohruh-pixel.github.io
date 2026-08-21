# Проверяет и, если надо, чинит доставку сообщений от Telegram к воркеру.
#
# Бот, который молчит, снаружи неотличим от бота, которого нет: Telegram считает доставку успешной,
# в журнале Cloudflare пусто, и искать нечего. Причина почти всегда одна из трёх — вебхук не
# зарегистрирован, зарегистрирован на другой адрес, или адрес в Cloudflare и адрес в Telegram
# разошлись. Все три чинятся одинаково: записать один и тот же случайный путь в оба места.
#
# Токен спрашивается скрытым вводом и никуда не печатается. Путь тоже не печатается: он и есть
# защита — Telegram знает адрес, больше никто.
#
#   powershell -ExecutionPolicy Bypass -File bot\webhook.ps1
#
# Ничего не меняет, пока не спросит.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$WORKER = "https://bankrate-tj-bot.shohruhmahkamov28.workers.dev"

function Ask-Token {
    $secure = Read-Host "Токен бота (ввод не виден)" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr).Trim()
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$token = Ask-Token
if (-not $token) {
    Write-Host "Токен не введён — ничего не делаю." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Спрашиваю Telegram, куда он шлёт сообщения..." -ForegroundColor Cyan

try {
    $info = Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
} catch {
    Write-Host "Telegram не ответил. Обычно это неверный или отозванный токен." -ForegroundColor Red
    exit 1
}

if (-not $info.ok) {
    Write-Host "Telegram отказал: $($info.description)" -ForegroundColor Red
    exit 1
}

$w = $info.result
$registered = [string]$w.url

# Адрес не печатаем целиком — только то, что нужно для вывода.
if (-not $registered) {
    Write-Host "Вебхук не зарегистрирован вовсе. Бот не получает ни одного сообщения." -ForegroundColor Red
    $broken = $true
} elseif (-not $registered.StartsWith($WORKER)) {
    Write-Host "Вебхук указывает не на наш воркер." -ForegroundColor Red
    $broken = $true
} else {
    Write-Host "Вебхук указывает на наш воркер." -ForegroundColor Green
    $broken = $false
}

Write-Host "В очереди необработанных: $($w.pending_update_count)"
if ($w.last_error_message) {
    $when = [DateTimeOffset]::FromUnixTimeSeconds($w.last_error_date).ToLocalTime().ToString("dd.MM HH:mm")
    Write-Host "Последняя ошибка ($when): $($w.last_error_message)" -ForegroundColor Yellow
} else {
    Write-Host "Ошибок доставки Telegram не видит." -ForegroundColor Green
}

Write-Host ""

if (-not $broken) {
    Write-Host "Со стороны Telegram всё в порядке." -ForegroundColor Green
    Write-Host "Если бот всё равно молчит, значит путь в Cloudflare не совпадает с тем, что знает"
    Write-Host "Telegram. Снаружи это выглядит точно так же: воркер отвечает 'ok' и молчит."
    Write-Host ""
}

$answer = Read-Host "Перевыпустить адрес и записать его в оба места? (д/н)"
if ($answer -ne "д" -and $answer -ne "y" -and $answer -ne "да") {
    Write-Host "Ничего не изменено."
    exit 0
}

# Новый случайный путь. Перевыпуск чинит и рассогласование, и старую регистрацию, оставшуюся от
# отозванного токена, — не разбираясь, что именно из этого случилось.
$bytes = New-Object byte[] 16
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$path = -join ($bytes | ForEach-Object { $_.ToString("x2") })

Write-Host ""
Write-Host "Записываю адрес в Cloudflare..." -ForegroundColor Cyan
$path | npx --yes wrangler@latest secret put WEBHOOK_PATH
if (-not $?) { Write-Host "Не записалось." -ForegroundColor Red; exit 1 }

npx --yes wrangler@latest deploy
if (-not $?) { Write-Host "Не развернулось." -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Говорю Telegram новый адрес..." -ForegroundColor Cyan
$url = "$WORKER/$path"
$set = Invoke-RestMethod "https://api.telegram.org/bot$token/setWebhook?url=$url"

if (-not $set.ok) {
    Write-Host "Telegram отказал: $($set.description)" -ForegroundColor Red
    exit 1
}

$check = Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
if ([string]$check.result.url -eq $url) {
    Write-Host ""
    Write-Host "Готово. Оба места знают один адрес." -ForegroundColor Green
    Write-Host "Откройте бота и отправьте /otzyvy — должен прийти список." -ForegroundColor Green
} else {
    Write-Host "Записалось, но Telegram называет другой адрес. Что-то ещё не так." -ForegroundColor Red
}
