# То же, что webhook.ps1, но токен читается из файла, а не с клавиатуры.
#
# Нужно потому, что команды здесь выполняются без ввода: Read-Host сразу упирается в конец потока.
# Файл — единственный способ передать секрет, не набирая его в диалоге и не оставляя в истории
# команд. Скрипт стирает его за собой в любом случае, включая ошибку на середине.
#
#   powershell -ExecutionPolicy Bypass -File bot\webhook-from-file.ps1 -TokenFile C:\путь\token.txt
#
# Ни токен, ни секретный путь не печатаются: путь и есть защита от посторонних, а токен — всё
# остальное.

param(
    [Parameter(Mandatory = $true)]
    [string]$TokenFile
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$WORKER = "https://bankrate-tj-bot.shohruhmahkamov28.workers.dev"

function Remove-TokenFile {
    if (Test-Path $TokenFile) {
        try {
            # Перезапись перед удалением: содержимое не должно остаться в свободных блоках диска.
            Set-Content -Path $TokenFile -Value ("0" * 200) -Encoding ascii -Force
            Remove-Item $TokenFile -Force
            Write-Host "Файл с токеном удалён." -ForegroundColor DarkGray
        } catch {
            Write-Host "ВНИМАНИЕ: файл с токеном удалить не удалось, удалите вручную: $TokenFile" -ForegroundColor Red
        }
    }
}

try {
    if (-not (Test-Path $TokenFile)) {
        Write-Host "Файла нет: $TokenFile" -ForegroundColor Red
        exit 1
    }

    $token = (Get-Content $TokenFile -Raw).Trim()

    # Форма токена: <цифры>:<буквы-цифры-дефисы-подчёркивания>. Проверяется, чтобы не отправить в
    # Telegram содержимое случайно сохранённого файла и не получить в ответ невнятную ошибку.
    if ($token -notmatch '^\d{5,}:[A-Za-z0-9_\-]{20,}$') {
        Write-Host "В файле не похоже на токен бота." -ForegroundColor Red
        Write-Host "Ожидается вид 1234567890:ABCdef... — цифры, двоеточие, длинная строка."
        exit 1
    }

    Write-Host "Спрашиваю Telegram, куда он шлёт сообщения..." -ForegroundColor Cyan

    try {
        $info = Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
    } catch {
        Write-Host "Telegram не ответил. Обычно это отозванный или неверный токен." -ForegroundColor Red
        exit 1
    }

    if (-not $info.ok) {
        Write-Host "Telegram отказал: $($info.description)" -ForegroundColor Red
        exit 1
    }

    $w = $info.result
    $registered = [string]$w.url

    if (-not $registered) {
        Write-Host "НАЙДЕНО: вебхук не зарегистрирован вовсе — бот не получает ни одного сообщения." -ForegroundColor Yellow
    } elseif (-not $registered.StartsWith($WORKER)) {
        Write-Host "НАЙДЕНО: вебхук указывает не на наш обработчик." -ForegroundColor Yellow
    } else {
        Write-Host "Вебхук указывает на наш обработчик." -ForegroundColor Green
        Write-Host "Значит расходится секретный путь: Telegram шлёт по одному адресу, обработчик ждёт другой."
    }

    Write-Host "В очереди необработанных: $($w.pending_update_count)"
    if ($w.last_error_message) {
        $when = [DateTimeOffset]::FromUnixTimeSeconds($w.last_error_date).ToLocalTime().ToString("dd.MM HH:mm")
        Write-Host "Последняя ошибка доставки ($when): $($w.last_error_message)" -ForegroundColor Yellow
    }

    # Перевыпуск чинит все три случая сразу — не зарегистрирован, указывает не туда, пути разошлись —
    # не разбираясь, что именно из этого случилось.
    $bytes = New-Object byte[] 16
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $path = -join ($bytes | ForEach-Object { $_.ToString("x2") })

    Write-Host ""
    Write-Host "Записываю новый адрес в хранилище обработчика..." -ForegroundColor Cyan
    $path | npx --yes wrangler@latest secret put WEBHOOK_PATH
    if (-not $?) { Write-Host "Не записалось." -ForegroundColor Red; exit 1 }

    npx --yes wrangler@latest deploy
    if (-not $?) { Write-Host "Не развернулось." -ForegroundColor Red; exit 1 }

    Write-Host ""
    Write-Host "Говорю Telegram тот же адрес..." -ForegroundColor Cyan
    $url = "$WORKER/$path"
    $set = Invoke-RestMethod "https://api.telegram.org/bot$token/setWebhook?url=$url"

    if (-not $set.ok) {
        Write-Host "Telegram отказал: $($set.description)" -ForegroundColor Red
        exit 1
    }

    $check = Invoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"
    if ([string]$check.result.url -eq $url) {
        Write-Host ""
        Write-Host "ГОТОВО. Оба места знают один адрес." -ForegroundColor Green
        Write-Host "Ошибок доставки: $(if ($check.result.last_error_message) { $check.result.last_error_message } else { 'нет' })"
    } else {
        Write-Host "Записалось, но Telegram называет другой адрес." -ForegroundColor Red
    }
} finally {
    Remove-TokenFile
}
