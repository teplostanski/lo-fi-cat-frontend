# Настройка переменных окружения для фронтенда

## Создайте файлы окружения:

### `.env.production` (для продакшена)
```
VITE_API_URL=https://api-lofi.teplostanski.me
```

### `.env.development` (для разработки)
```
VITE_API_URL=http://localhost:8090
```

## Примечание

Если файлы `.env` не созданы, приложение автоматически определит URL по текущему хосту браузера:
- Если открыто на `api-lofi.teplostanski.me` → использует `https://api-lofi.teplostanski.me`
- Иначе → использует `http://localhost:8090`

## Использование

При сборке для продакшена:
```bash
npm run build
```

Vite автоматически подставит переменные из `.env.production`.
