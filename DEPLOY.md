# 🚀 Инструкция по деплою CollectX Cards

## 📋 Требования

- **Сервер:** Linux (Ubuntu 20.04+ рекомендуется)
- **Node.js:** 20.x или выше
- **PostgreSQL:** 16.x или выше
- **Docker & Docker Compose** (опционально, но рекомендуется)

## 🔧 Варианты деплоя

### Вариант 1: Docker Compose (Рекомендуется)

Самый простой способ развернуть весь стек одной командой.

#### 1. Подготовка

```bash
# Клонируйте репозиторий на сервер
git clone https://github.com/zhigulin22/CollectX-Cards.git
cd CollectX-Cards
git checkout feature-wallet

# Скопируйте и заполните .env файл
cp backend/.env.production.example backend/.env
nano backend/.env  # Заполните все необходимые переменные
```

#### 2. Настройка переменных окружения

Отредактируйте `backend/.env`:

```env
# Обязательные переменные
DATABASE_URL=postgresql://collectx:your_password@postgres:5432/collectx?schema=public
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 16)
ALLOWED_ORIGINS=https://t.me,https://your-domain.com

# Опциональные
TELEGRAM_BOT_TOKEN=your_bot_token
DEPOSIT_ADDRESS=your_ton_address
WITHDRAW_MNEMONIC=your_mnemonic_phrase
```

#### 3. Запуск

```bash
# Запустите все сервисы
docker-compose up -d

# Примените миграции базы данных
docker-compose exec backend npx prisma migrate deploy

# (Опционально) Заполните тестовыми данными
docker-compose exec backend npx tsx prisma/seedCards.ts

# Проверьте логи
docker-compose logs -f backend
```

#### 4. Проверка

- Health check: `http://your-server-ip/health`
- API Docs: `http://your-server-ip/docs`
- Frontend: `http://your-server-ip`

---

### Вариант 2: Ручной деплой (без Docker)

#### 1. Установка зависимостей на сервере

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib
sudo npm install -g pnpm

# Или установите Node.js 20+ через nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

#### 2. Настройка PostgreSQL

```bash
# Создайте базу данных
sudo -u postgres psql
CREATE USER collectx WITH PASSWORD 'your_secure_password';
CREATE DATABASE collectx OWNER collectx;
\q
```

#### 3. Настройка backend

```bash
cd backend

# Установите зависимости
pnpm install

# Настройте .env
cp .env.production.example .env
nano .env  # Заполните переменные

# Примените миграции
pnpm run db:generate
npx prisma migrate deploy

# Соберите проект
pnpm run build
```

#### 4. Настройка frontend

```bash
cd ../frontend

# Установите зависимости
pnpm install

# Настройте переменную окружения для API
echo "VITE_API_URL=" > .env.production

# Соберите проект
pnpm run build
```

#### 5. Настройка процесса (PM2)

```bash
# Установите PM2
npm install -g pm2

# Создайте ecosystem файл
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'collectx-api',
    script: './backend/dist/index.js',
    cwd: '/path/to/CollectX-Cards',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
  }]
}
EOF

# Запустите
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Настройте автозапуск
```

#### 6. Настройка Nginx

```bash
# Установите Nginx
sudo apt install -y nginx

# Создайте конфигурацию
sudo nano /etc/nginx/sites-available/collectx
```

Вставьте конфигурацию (адаптируйте под ваш домен):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/CollectX-Cards/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded files
    location /uploads {
        alias /path/to/CollectX-Cards/backend/uploads;
        expires 30d;
    }
}
```

```bash
# Активируйте сайт
sudo ln -s /etc/nginx/sites-available/collectx /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📁 Структура директорий на сервере

```
/var/www/collectx/
├── backend/
│   ├── dist/          # Скомпилированный код
│   ├── uploads/       # Загруженные изображения
│   ├── prisma/        # Миграции и схема
│   └── .env           # Переменные окружения
├── frontend/
│   └── dist/          # Собранный frontend
└── logs/              # Логи приложения
```

---

## 🔐 Безопасность

### 1. Firewall

```bash
# Разрешите только необходимые порты
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. SSL сертификат (Let's Encrypt)

```bash
# Установите Certbot
sudo apt install -y certbot python3-certbot-nginx

# Получите сертификат
sudo certbot --nginx -d your-domain.com

# Автообновление настроено автоматически
```

### 3. Резервное копирование

```bash
# Создайте скрипт бэкапа
cat > /usr/local/bin/backup-collectx.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/collectx"
DATE=$(date +%Y%m%d_%H%M%S)

# Бэкап базы данных
pg_dump -U collectx collectx > "$BACKUP_DIR/db_$DATE.sql"

# Бэкап загруженных файлов
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" /var/www/collectx/backend/uploads

# Удалите старые бэкапы (старше 7 дней)
find "$BACKUP_DIR" -type f -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-collectx.sh

# Настройте cron для ежедневного бэкапа
echo "0 2 * * * /usr/local/bin/backup-collectx.sh" | sudo crontab -
```

---

## 🔄 Обновление приложения

### С Docker Compose

```bash
# Получите последние изменения
git pull origin feature-wallet

# Пересоберите и перезапустите
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Примените новые миграции
docker-compose exec backend npx prisma migrate deploy
```

### Без Docker

```bash
# Backend
cd backend
git pull
pnpm install
pnpm run build
pm2 restart collectx-api

# Примените миграции
npx prisma migrate deploy

# Frontend
cd ../frontend
git pull
pnpm install
pnpm run build
# Nginx автоматически отдаст новые файлы
```

---

## 📊 Мониторинг

### Проверка логов

```bash
# Docker
docker-compose logs -f backend

# PM2
pm2 logs collectx-api

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health check

```bash
curl http://your-domain.com/health
```

---

## ❓ Troubleshooting

### База данных не подключается

```bash
# Проверьте подключение
psql -U collectx -d collectx -h localhost

# Проверьте логи PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Порт занят

```bash
# Найдите процесс
sudo lsof -i :3002
# Или
sudo netstat -tulpn | grep 3002

# Убейте процесс
sudo kill -9 <PID>
```

### Файлы не загружаются

```bash
# Проверьте права на директорию uploads
sudo chown -R $USER:$USER backend/uploads
chmod -R 755 backend/uploads
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Проверьте логи базы данных
3. Проверьте переменные окружения
4. Убедитесь, что все порты открыты

---

## ✅ Чеклист перед запуском

- [ ] Все переменные окружения заполнены
- [ ] База данных создана и доступна
- [ ] Миграции применены
- [ ] Backend собран и запущен
- [ ] Frontend собран
- [ ] Nginx настроен
- [ ] SSL сертификат установлен (для production)
- [ ] Firewall настроен
- [ ] Резервное копирование настроено
- [ ] Health check проходит успешно

