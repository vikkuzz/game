# Деплой Socket.IO сервера

## Проблема

Vercel - это serverless платформа, которая не поддерживает постоянные WebSocket соединения. Поэтому Socket.IO сервер нужно деплоить на отдельный хостинг, который поддерживает постоянные соединения.

## Решение

Используйте отдельный сервис для Socket.IO сервера. Рекомендуемые варианты:

### Вариант 1: Railway (Рекомендуется)

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите ваш GitHub репозиторий
4. Railway автоматически обнаружит `railway.json` и использует настройки из него
5. Добавьте переменные окружения в настройках Railway:
   ```
   ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://your-custom-domain.com
   ```
   (PORT назначается автоматически Railway)
6. После деплоя Railway предоставит URL вашего сервиса (например: `https://your-app.railway.app`)
7. В настройках Vercel добавьте переменную окружения:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-app.railway.app
   ```
8. Пересоберите проект на Vercel

### Вариант 2: Render

1. Зарегистрируйтесь на [Render.com](https://render.com)
2. Создайте новый "Web Service"
3. Подключите ваш GitHub репозиторий
4. Render автоматически обнаружит `render.yaml` и использует настройки из него
5. В панели Render добавьте переменную окружения:
   ```
   ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   ```
   (PORT=10000 уже указан в render.yaml)
6. После деплоя Render предоставит URL вашего сервиса
7. В настройках Vercel добавьте переменную окружения:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-service.onrender.com
   ```
8. Пересоберите проект на Vercel

### Вариант 3: Fly.io

1. Установите [Fly CLI](https://fly.io/docs/getting-started/installing-flyctl/)
2. Создайте файл `fly.toml`:
   ```toml
   app = "your-socket-server"
   primary_region = "iad"
   
   [build]
   
   [http_service]
     internal_port = 3001
     force_https = true
     auto_stop_machines = false
     auto_start_machines = true
     min_machines_running = 1
   
   [[vm]]
     memory = "256mb"
   ```
3. Выполните:
   ```bash
   fly launch
   fly secrets set ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   fly deploy
   ```

## Локальная разработка

Для локальной разработки используйте `server.ts`, который запускает и Next.js, и Socket.IO на одном порту:

```bash
npm run dev
```

Это запустит сервер на `http://localhost:3000` с поддержкой Socket.IO.

## Настройка переменных окружения

### На Socket.IO сервере (Railway/Render/Fly.io):
- `PORT` - порт сервера (обычно назначается автоматически)
- `ALLOWED_ORIGINS` - список разрешенных доменов через запятую

### На Vercel (Next.js приложение):
- `NEXT_PUBLIC_SOCKET_URL` - URL вашего Socket.IO сервера (например: `https://your-app.railway.app`)

## Проверка работы

1. Откройте консоль браузера на вашем Vercel сайте
2. Перейдите на страницу лобби (`/game/lobby`)
3. В консоли должно появиться: `[useSocket] Connecting to Socket.IO server: https://your-socket-server.com`
4. Должно появиться: `Connected to server`
5. Если видите ошибки подключения, проверьте:
   - Правильность `NEXT_PUBLIC_SOCKET_URL` в Vercel
   - Правильность `ALLOWED_ORIGINS` на Socket.IO сервере
   - Что Socket.IO сервер запущен и доступен

## Troubleshooting

### Ошибка CORS
Убедитесь, что домен Vercel добавлен в `ALLOWED_ORIGINS` на Socket.IO сервере.

### Не подключается
1. Проверьте, что Socket.IO сервер запущен (откройте `/health` endpoint)
2. Проверьте логи Socket.IO сервера
3. Убедитесь, что `NEXT_PUBLIC_SOCKET_URL` правильно настроен в Vercel

### Работает локально, но не на Vercel
Убедитесь, что в Vercel добавлена переменная `NEXT_PUBLIC_SOCKET_URL` и пересоберите проект.

