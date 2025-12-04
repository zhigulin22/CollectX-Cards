#!/bin/bash

# Простой скрипт для деплоя на сервер
# Использование: ./deploy-simple.sh

set -e

SERVER_IP="31.130.155.210"

echo "🚀 Деплой CollectX на сервер $SERVER_IP"
echo "========================================"
echo ""

# Определяем пользователя
read -p "Пользователь для SSH (по умолчанию root): " SERVER_USER
SERVER_USER=${SERVER_USER:-root}

echo ""
echo "📡 Попытка подключения к серверу..."
echo ""

# Пробуем подключиться и проверить доступ
if ssh -o BatchMode=no -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "echo 'Connected'" 2>/dev/null; then
    echo "✅ Подключение успешно!"
else
    echo "❌ Не удалось подключиться автоматически."
    echo ""
    echo "Попробуйте подключиться вручную:"
    echo "  ssh $SERVER_USER@$SERVER_IP"
    echo ""
    read -p "Подключились успешно? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Проверьте:"
        echo "1. Правильность IP адреса"
        echo "2. SSH ключ или пароль"
        echo "3. Пользователя для подключения"
        exit 1
    fi
fi

echo ""
echo "📋 Сбор информации для деплоя..."
echo ""

# Проверка Docker
echo "Проверка Docker на сервере..."
DOCKER_CHECK=$(ssh "$SERVER_USER@$SERVER_IP" "command -v docker" 2>/dev/null || echo "")

if [ -n "$DOCKER_CHECK" ]; then
    echo "✅ Docker найден"
    USE_DOCKER=true
else
    echo "⚠️  Docker не найден"
    read -p "Установить Docker? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        USE_DOCKER=true
        echo "Docker будет установлен автоматически"
    else
        USE_DOCKER=false
    fi
fi

echo ""

# База данных
echo "Настройка базы данных:"
read -p "Использовать PostgreSQL из Docker? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    read -p "Database URL (postgresql://user:pass@host:5432/db): " DB_URL
    if [ -z "$DB_URL" ]; then
        echo "❌ Укажите DATABASE_URL"
        exit 1
    fi
else
    # Генерируем случайный пароль для БД
    DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)
    DB_URL="postgresql://collectx:${DB_PASSWORD}@postgres:5432/collectx?schema=public"
    echo "✅ Будет использована БД из Docker с паролем: $DB_PASSWORD"
fi

echo ""

# Генерация секретов
echo "Генерация секретов..."
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 32 | head -n 1)
ADMIN_KEY=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)

echo "✅ Секреты сгенерированы"
echo ""

# Allowed origins
read -p "Allowed Origins (Enter для https://t.me): " ALLOWED_ORIGINS
ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://t.me,http://$SERVER_IP}

# Опциональные настройки
read -p "Telegram Bot Token (Enter для пропуска): " TELEGRAM_TOKEN
read -p "TON Deposit Address (Enter для пропуска): " DEPOSIT_ADDRESS

echo ""
echo "🔐 Секреты (сохраните их!):"
echo "   JWT_SECRET: $JWT_SECRET"
echo "   ADMIN_API_KEY: $ADMIN_KEY"
echo ""

read -p "Продолжить? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    exit 0
fi

echo ""
echo "📦 Копирование файлов на сервер..."

# Создание директорий на сервере
ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
mkdir -p /var/www/collectx
mkdir -p /var/www/collectx/backend/uploads
mkdir -p /var/www/collectx/logs
ENDSSH

# Копирование файлов (исключая ненужное)
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'uploads' \
    --exclude '.env' \
    --exclude 'backend/.env' \
    ./ "$SERVER_USER@$SERVER_IP:/var/www/collectx/" || {
    echo "❌ Ошибка при копировании файлов"
    exit 1
}

echo "✅ Файлы скопированы"

# Создание .env на сервере
echo ""
echo "📝 Создание .env файла..."

ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
cat > /var/www/collectx/backend/.env << EOF
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
ENDSSH

echo "✅ .env файл создан"

# Деплой
if [ "$USE_DOCKER" = true ]; then
    echo ""
    echo "🐳 Деплой с Docker..."
    
    ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /var/www/collectx

# Установка Docker если нужно
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Установка Docker Compose если нужно
if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Запуск
echo "Запуск контейнеров..."
docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Ожидание
echo "Ожидание запуска..."
sleep 15

# Миграции
echo "Применение миграций..."
docker-compose exec -T backend npx prisma migrate deploy || echo "⚠️ Миграции будут применены позже"

echo ""
echo "✅ Деплой завершён!"
ENDSSH

else
    echo ""
    echo "🔧 Для ручного деплоя выполните на сервере:"
    echo "   ssh $SERVER_USER@$SERVER_IP"
    echo "   cd /var/www/collectx"
    echo "   ./deploy-manual.sh"
fi

echo ""
echo "🎉 Готово!"
echo ""
echo "📍 Доступ к приложению:"
echo "   Frontend: http://$SERVER_IP"
echo "   Health: http://$SERVER_IP/health"
echo "   API Docs: http://$SERVER_IP/docs"
echo ""
echo "📊 Проверка логов:"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd /var/www/collectx && docker-compose logs -f backend'"
echo ""

