#!/bin/bash

# Скрипт для деплоя через GitHub
# Сначала сохраняет изменения на GitHub, потом деплоит на сервер

set -e

SERVER_IP="31.130.155.210"
REPO_URL="https://github.com/zhigulin22/CollectX-Cards.git"
BRANCH="feature-wallet"

echo "🚀 Деплой через GitHub"
echo "====================="
echo ""

# Проверка изменений
echo "📋 Проверка изменений..."
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ Нет изменений для коммита"
    NEED_COMMIT=false
else
    echo "⚠️  Есть несохранённые изменения:"
    git status --short
    echo ""
    read -p "Закоммитить и запушить изменения на GitHub? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        NEED_COMMIT=true
    else
        echo "Пропускаю коммит. Убедись что изменения уже на GitHub."
        NEED_COMMIT=false
    fi
fi

# Коммит и пуш
if [ "$NEED_COMMIT" = true ]; then
    echo ""
    echo "💾 Сохранение изменений на GitHub..."
    
    read -p "Сообщение коммита (Enter для стандартного): " COMMIT_MSG
    COMMIT_MSG=${COMMIT_MSG:-"Add deployment configuration and card collection system"}
    
    git add .
    git commit -m "$COMMIT_MSG"
    
    echo ""
    echo "📤 Пуш на GitHub..."
    git push origin "$BRANCH"
    
    echo "✅ Изменения отправлены на GitHub"
fi

echo ""
read -p "Пользователь для SSH (по умолчанию root): " SERVER_USER
SERVER_USER=${SERVER_USER:-root}

echo ""
echo "📡 Подключение к серверу $SERVER_IP..."

# Проверка подключения
if ! ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'Connected'" 2>/dev/null; then
    echo "❌ Не удалось подключиться. Проверь SSH доступ."
    exit 1
fi

echo "✅ Подключение установлено"
echo ""

# Проверка существования репозитория на сервере
echo "📦 Проверка репозитория на сервере..."
HAS_REPO=$(ssh "$SERVER_USER@$SERVER_IP" "test -d /var/www/collectx/.git && echo 'yes' || echo 'no'")

if [ "$HAS_REPO" = "yes" ]; then
    echo "✅ Репозиторий уже существует, обновляю..."
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
cd /var/www/collectx
git fetch origin
git reset --hard origin/$BRANCH
ENDSSH
else
    echo "📥 Клонирование репозитория на сервер..."
    ssh "$SERVER_USER@$SERVER_IP" << ENDSSH
mkdir -p /var/www
cd /var/www
if [ -d collectx ]; then
    rm -rf collectx
fi
git clone -b $BRANCH $REPO_URL collectx
ENDSSH
fi

echo "✅ Код обновлён"
echo ""

# Настройка .env
echo "🔐 Настройка переменных окружения..."
echo ""

# Проверка существования .env
ENV_EXISTS=$(ssh "$SERVER_USER@$SERVER_IP" "test -f /var/www/collectx/backend/.env && echo 'yes' || echo 'no'")

if [ "$ENV_EXISTS" = "yes" ]; then
    read -p "Файл .env уже существует. Перезаписать? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Пропускаю создание .env"
        SKIP_ENV=true
    else
        SKIP_ENV=false
    fi
else
    SKIP_ENV=false
fi

if [ "$SKIP_ENV" = false ]; then
    # Генерация секретов
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 32 | head -n 1)
    ADMIN_KEY=$(openssl rand -hex 16 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)
    
    read -p "Database URL (Enter для Docker): " DB_URL
    if [ -z "$DB_URL" ]; then
        DB_PASSWORD=$(openssl rand -hex 16)
        DB_URL="postgresql://collectx:${DB_PASSWORD}@postgres:5432/collectx?schema=public"
        echo "✅ Используется БД из Docker (пароль: $DB_PASSWORD)"
    fi
    
    read -p "Allowed Origins (Enter для https://t.me): " ALLOWED_ORIGINS
    ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://t.me,http://$SERVER_IP}
    
    read -p "Telegram Bot Token (Enter для пропуска): " TELEGRAM_TOKEN
    read -p "TON Deposit Address (Enter для пропуска): " DEPOSIT_ADDRESS
    
    # Создание .env
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
    
    echo ""
    echo "🔐 Секреты (сохраните!):"
    echo "   JWT_SECRET: $JWT_SECRET"
    echo "   ADMIN_API_KEY: $ADMIN_KEY"
    echo ""
fi

# Деплой через Docker
echo "🐳 Деплой через Docker Compose..."
ssh "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
cd /var/www/collectx

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Установка Docker Compose..."
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Создание директорий
mkdir -p backend/uploads
mkdir -p logs

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

echo ""
echo "🎉 Готово!"
echo ""
echo "📍 Доступ к приложению:"
echo "   Frontend: http://$SERVER_IP"
echo "   Health: http://$SERVER_IP/health"
echo "   API Docs: http://$SERVER_IP/docs"
echo ""
echo "📊 Для обновления в будущем:"
echo "   ssh $SERVER_USER@$SERVER_IP 'cd /var/www/collectx && git pull && docker-compose up -d --build'"
echo ""

