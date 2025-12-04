#!/bin/bash

# Скрипт для ручного деплоя на сервере (выполняется НА СЕРВЕРЕ)

set -e

echo "🔧 Ручной деплой CollectX"
echo "========================"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION установлен"

# Проверка pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Установка pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm установлен"
echo ""

# Backend
echo "📦 Установка зависимостей backend..."
cd backend
pnpm install

echo "🔨 Сборка backend..."
pnpm run build

echo "🗄️  Применение миграций..."
npx prisma generate
npx prisma migrate deploy

cd ..

# Frontend
echo "📦 Установка зависимостей frontend..."
cd frontend
pnpm install

echo "🔨 Сборка frontend..."
pnpm run build

# Копирование frontend в backend/public
echo "📁 Копирование frontend..."
mkdir -p ../backend/public
cp -r dist/* ../backend/public/

cd ..

echo ""
echo "✅ Сборка завершена!"
echo ""
echo "Для запуска используйте PM2:"
echo "  npm install -g pm2"
echo "  pm2 start backend/dist/index.js --name collectx-api"
echo "  pm2 save"
echo "  pm2 startup"
echo ""

