# Настройка переменных окружения для фронтенда

## Создайте файлы окружения:

### `.env.development` (для разработки)
```env
VITE_API_BASE_URL=http://localhost:8090
# Опционально: явный WebSocket URL
# VITE_WS_URL=ws://localhost:8090/ws
```

### `.env.production` (для продакшена)
```env
VITE_API_BASE_URL=https://api-lofi.teplostanski.me
# Опционально: явный WebSocket URL
# VITE_WS_URL=wss://api-lofi.teplostanski.me/ws
```

## Как создать файлы

1. Скопируйте `.env.example` в `.env.development` и `.env.production`
2. Заполните значения в соответствии с вашим окружением

Или создайте файлы вручную с содержимым выше.

## Примечание

Если файлы `.env` не созданы, приложение автоматически определит URL по текущему хосту браузера:
- Если открыто на `api-lofi.teplostanski.me` или домене с `teplostanski.me` → использует `https://api-lofi.teplostanski.me`
- Иначе → использует `http://localhost:8090`

## Использование

### Разработка
```bash
npm run dev
```
Vite автоматически загрузит переменные из `.env.development`

### Сборка для продакшена
```bash
npm run build
```
Vite автоматически подставит переменные из `.env.production`

## Важно

- Все переменные окружения должны начинаться с `VITE_` для того, чтобы быть доступными в клиентском коде
- Файлы `.env.development` и `.env.production` добавлены в `.gitignore` и не попадут в репозиторий
- Файл `.env.example` служит шаблоном и должен быть в репозитории
