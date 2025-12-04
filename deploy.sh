#!/bin/bash

# CollectX Cards Deployment Script
# Этот скрипт помогает быстро развернуть приложение на сервере

set -e  # Exit on error

echo "🚀 CollectX Cards Deployment Script"
echo "===================================="
echo ""

# Проверка Docker
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "✅ Docker и Docker Compose установлены"
    USE_DOCKER=true
else
    echo "⚠️  Docker не найден. Будет использован ручной деплой."
    USE_DOCKER=false
fi

# Функция для генерации случайного секрета
generate_secret() {
    openssl rand -hex $1 2>/dev/null || cat /dev/urandom | tr -dc 'a-f0-9' | fold -w $1 | head -n 1
}

# Создание .env файла
create_env_file() {
    echo ""
    echo "📝 Создание .env файла..."
    
    if [ -f "backend/.env" ]; then
        read -p "⚠️  Файл backend/.env уже существует. Перезаписать? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Пропускаю создание .env файла"
            return
        fi
    fi

    # Чтение значений от пользователя
    echo ""
    echo "Введите значения для переменных окружения:"
    echo ""
    
    read -p "Database URL (postgresql://user:password@host:5432/database): " DB_URL
    read -p "JWT Secret (оставьте пустым для автогенерации): " JWT_SECRET
    read -p "Admin API Key (оставьте пустым для автогенерации): " ADMIN_KEY
    read -p "Allowed Origins (через запятую, например: https://t.me,https://yourdomain.com): " ALLOWED_ORIGINS
    
    # Генерация секретов, если не указаны
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(generate_secret 32)
        echo "✅ Сгенерирован JWT_SECRET"
    fi
    
    if [ -z "$ADMIN_KEY" ]; then
        ADMIN_KEY=$(generate_secret 16)
        echo "✅ Сгенерирован ADMIN_API_KEY"
    fi
    
    # Опциональные переменные
    read -p "Telegram Bot Token (опционально): " TELEGRAM_TOKEN
    read -p "TON Deposit Address (опционально): " DEPOSIT_ADDRESS
    
    # Создание .env файла
    cat > backend/.env << EOF
NODE_ENV=production
PORT=3002
DATABASE_URL=${DB_URL}
JWT_SECRET=${JWT_SECRET}
ADMIN_API_KEY=${ADMIN_KEY}
ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
DEPOSIT_ADDRESS=${DEPOSIT_ADDRESS}
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
EOF

    echo ""
    echo "✅ Файл backend/.env создан!"
    echo ""
    echo "⚠️  ВАЖНО: Сохраните эти секреты в безопасном месте:"
    echo "   JWT_SECRET: ${JWT_SECRET}"
    echo "   ADMIN_API_KEY: ${ADMIN_KEY}"
    echo ""
}

# Docker деплой
deploy_with_docker() {
    echo ""
    echo "🐳 Деплой с Docker Compose..."
    echo ""
    
    # Создание директории для uploads
    mkdir -p uploads
    chmod 755 uploads
    
    # Запуск контейнеров
    echo "Сборка и запуск контейнеров..."
    docker-compose build
    docker-compose up -d
    
    # Ожидание запуска базы данных
    echo "Ожидание запуска базы данных..."
    sleep 5
    
    # Применение миграций
    echo "Применение миграций базы данных..."
    docker-compose exec -T backend npx prisma migrate deploy
    
    echo ""
    echo "✅ Деплой завершён!"
    echo ""
    echo "Проверьте статус:"
    echo "  docker-compose ps"
    echo ""
    echo "Проверьте логи:"
    echo "  docker-compose logs -f backend"
    echo ""
}

# Ручной деплой
deploy_manual() {
    echo ""
    echo "🔧 Ручной деплой..."
    echo ""
    
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js не найден. Установите Node.js 20+ и повторите."
        exit 1
    fi
    
    # Проверка pnpm
    if ! command -v pnpm &> /dev/null; then
        echo "Установка pnpm..."
        npm install -g pnpm
    fi
    
    # Backend
    echo "📦 Установка зависимостей backend..."
    cd backend
    pnpm install
    
    echo "🔨 Сборка backend..."
    pnpm run build
    
    echo "🗄️  Применение миграций..."
    npx prisma migrate deploy
    
    cd ..
    
    # Frontend
    echo "📦 Установка зависимостей frontend..."
    cd frontend
    pnpm install
    
    echo "🔨 Сборка frontend..."
    pnpm run build
    
    # Копирование frontend в backend/public
    echo "📁 Копирование frontend в backend/public..."
    mkdir -p ../backend/public
    cp -r dist/* ../backend/public/
    
    cd ..
    
    echo ""
    echo "✅ Сборка завершена!"
    echo ""
    echo "Для запуска backend:"
    echo "  cd backend"
    echo "  node dist/index.js"
    echo ""
    echo "Или используйте PM2:"
    echo "  pm2 start backend/dist/index.js --name collectx-api"
    echo ""
}

# Главное меню
main() {
    # Создание .env файла
    create_env_file
    
    # Выбор метода деплоя
    if [ "$USE_DOCKER" = true ]; then
        read -p "Использовать Docker Compose для деплоя? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            deploy_with_docker
        else
            deploy_manual
        fi
    else
        deploy_manual
    fi
    
    echo ""
    echo "🎉 Готово!"
    echo ""
    echo "Следующие шаги:"
    echo "1. Проверьте health check: curl http://localhost:3002/health"
    echo "2. Откройте API docs: http://localhost:3002/docs"
    echo "3. Настройте Nginx (см. DEPLOY.md)"
    echo ""
}

# Запуск
main

