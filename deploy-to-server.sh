#!/bin/bash

# Скрипт для деплоя на сервер 31.130.155.210
# Использование: ./deploy-to-server.sh

set -e

SERVER_IP="31.130.155.210"
SERVER_USER="${SERVER_USER:-root}"  # Можно изменить на другого пользователя
REMOTE_DIR="/var/www/collectx"

echo "🚀 Деплой CollectX на сервер $SERVER_IP"
echo "========================================"
echo ""

# Проверка подключения
echo "📡 Проверка подключения к серверу..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" exit 2>/dev/null; then
    echo "⚠️  Не удалось подключиться автоматически. Убедитесь что:"
    echo "   1. SSH ключ добавлен, или"
    echo "   2. Вы можете подключиться: ssh $SERVER_USER@$SERVER_IP"
    echo ""
    read -p "Нажмите Enter для продолжения после проверки подключения..."
fi

echo "✅ Подключение к серверу установлено"
echo ""

# Создание директории на сервере
echo "📁 Создание директорий на сервере..."
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
mkdir -p /var/www/collectx
mkdir -p /var/www/collectx/backend/uploads
mkdir -p /var/www/collectx/logs
chmod -R 755 /var/www/collectx
ENDSSH

echo "✅ Директории созданы"
echo ""

# Проверка Docker на сервере
echo "🐳 Проверка Docker на сервере..."
if ssh "$SERVER_USER@$SERVER_IP" "command -v docker &> /dev/null"; then
    echo "✅ Docker установлен"
    USE_DOCKER=true
else
    echo "⚠️  Docker не найден. Будет использован ручной деплой."
    USE_DOCKER=false
fi

echo ""

# Копирование файлов
echo "📦 Копирование файлов на сервер..."
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
    --exclude 'uploads' --exclude '.env' \
    ./ "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/"

echo "✅ Файлы скопированы"
echo ""

# Генерация .env файла на сервере
echo "🔐 Настройка переменных окружения..."
echo ""
echo "Сейчас создам .env файл. Пожалуйста, укажите:"
echo ""

read -p "Database URL (postgresql://user:pass@localhost:5432/collectx): " DB_URL
if [ -z "$DB_URL" ]; then
    # Если Docker, используем встроенную БД
    if [ "$USE_DOCKER" = true ]; then
        DB_URL="postgresql://collectx:$(openssl rand -hex 12)@postgres:5432/collectx?schema=public"
        echo "✅ Используем БД из Docker Compose"
    else
        echo "❌ Укажите DATABASE_URL для подключения к PostgreSQL"
        exit 1
    fi
fi

read -p "JWT Secret (Enter для автогенерации): " JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
fi

read -p "Admin API Key (Enter для автогенерации): " ADMIN_KEY
if [ -z "$ADMIN_KEY" ]; then
    ADMIN_KEY=$(openssl rand -hex 16)
fi

read -p "Allowed Origins (через запятую, например: https://t.me): " ALLOWED_ORIGINS
if [ -z "$ALLOWED_ORIGINS" ]; then
    ALLOWED_ORIGINS="https://t.me,http://$SERVER_IP"
fi

read -p "Telegram Bot Token (опционально, Enter для пропуска): " TELEGRAM_TOKEN
read -p "TON Deposit Address (опционально, Enter для пропуска): " DEPOSIT_ADDRESS

# Создание .env на сервере
ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
cat > $REMOTE_DIR/backend/.env << EOF
NODE_ENV=production
PORT=3002
DATABASE_URL=$DB_URL
JWT_SECRET=$JWT_SECRET
ADMIN_API_KEY=$ADMIN_KEY
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN:-}
DEPOSIT_ADDRESS=${DEPOSIT_ADDRESS:-}
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
EOF

echo "✅ .env файл создан"
echo ""
echo "⚠️  ВАЖНО: Сохраните эти секреты:"
echo "   JWT_SECRET: $JWT_SECRET"
echo "   ADMIN_API_KEY: $ADMIN_KEY"
echo ""
ENDSSH

# Деплой в зависимости от метода
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Деплой с Docker Compose..."
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
cd $REMOTE_DIR

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Запуск
echo "Запуск Docker Compose..."
docker-compose down 2>/dev/null || true
docker-compose build
docker-compose up -d

# Ожидание запуска БД
echo "Ожидание запуска базы данных..."
sleep 10

# Миграции
echo "Применение миграций..."
docker-compose exec -T backend npx prisma migrate deploy || echo "⚠️ Миграции могут быть применены позже"

echo ""
echo "✅ Деплой завершён!"
ENDSSH

else
    echo "🔧 Подготовка к ручному деплою..."
    echo ""
    echo "На сервере нужно выполнить следующие команды:"
    echo ""
    echo "ssh $SERVER_USER@$SERVER_IP"
    echo "cd $REMOTE_DIR"
    echo "./deploy-manual.sh"
    echo ""
fi

echo ""
echo "🎉 Готово!"
echo ""
echo "Сервер: http://$SERVER_IP"
echo "Health check: http://$SERVER_IP/health"
echo "API Docs: http://$SERVER_IP/docs"
echo ""
echo "Для проверки логов:"
if [ "$USE_DOCKER" = true ]; then
    echo "  ssh $SERVER_USER@$SERVER_IP 'cd $REMOTE_DIR && docker-compose logs -f backend'"
else
    echo "  ssh $SERVER_USER@$SERVER_IP 'cd $REMOTE_DIR && tail -f logs/*.log'"
fi
echo ""

