# 🚀 Инструкция по деплою на сервер 31.130.155.210

## 📋 Что у нас есть

- **IP сервера:** 31.130.155.210
- **Пароль:** (у вас есть пароль для SSH)

## 🔧 Варианты деплоя

### Вариант 1: Автоматический деплой (рекомендуется)

Используйте скрипт, который всё настроит автоматически:

```bash
# С локальной машины
./deploy-to-server.sh
```

Скрипт спросит:
- Пользователь для SSH (по умолчанию `root`)
- Данные для базы данных
- Остальные настройки

---

### Вариант 2: Ручной деплой через SSH

#### Шаг 1: Подключение к серверу

```bash
ssh root@31.130.155.210
# или
ssh your-user@31.130.155.210
```

#### Шаг 2: Установка Docker (если нет)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

#### Шаг 3: Копирование файлов на сервер

С локальной машины:

```bash
# Создайте директорию на сервере
ssh root@31.130.155.210 "mkdir -p /var/www/collectx"

# Скопируйте файлы (исключая node_modules и .git)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
    --exclude 'uploads' --exclude '.env' \
    ./ root@31.130.155.210:/var/www/collectx/
```

#### Шаг 4: Настройка на сервере

```bash
# Подключитесь к серверу
ssh root@31.130.155.210
cd /var/www/collectx

# Создайте .env файл
nano backend/.env
```

Вставьте следующий конфиг (замените значения):

```env
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://collectx:your_password@postgres:5432/collectx?schema=public
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
ADMIN_API_KEY=your_admin_api_key_minimum_16_characters
ALLOWED_ORIGINS=https://t.me,http://31.130.155.210
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**Сгенерируйте секреты:**
```bash
openssl rand -hex 32  # для JWT_SECRET
openssl rand -hex 16  # для ADMIN_API_KEY
```

#### Шаг 5: Запуск с Docker Compose

```bash
cd /var/www/collectx

# Запуск
docker-compose up -d

# Применение миграций
docker-compose exec backend npx prisma migrate deploy

# Проверка статуса
docker-compose ps
docker-compose logs -f backend
```

#### Шаг 6: Настройка firewall

```bash
# Откройте порты
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS (если будет)
ufw enable
```

---

## 🌐 Доступ к приложению

После деплоя приложение будет доступно по адресу:

- **HTTP:** http://31.130.155.210
- **Health check:** http://31.130.155.210/health
- **API Docs:** http://31.130.155.210/docs
- **Admin панель:** http://31.130.155.210/admin

---

## 🔍 Проверка работы

### Проверка health check:

```bash
curl http://31.130.155.210/health
```

Должен вернуть:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...,
  "environment": "production"
}
```

### Проверка логов:

```bash
# Если Docker
ssh root@31.130.155.210 "cd /var/www/collectx && docker-compose logs -f backend"

# Если без Docker
ssh root@31.130.155.210 "tail -f /var/www/collectx/logs/*.log"
```

---

## ⚙️ Настройка Nginx (опционально)

Если хотите использовать Nginx как reverse proxy:

```bash
# На сервере
apt install -y nginx

# Создайте конфиг
nano /etc/nginx/sites-available/collectx
```

Вставьте:

```nginx
server {
    listen 80;
    server_name 31.130.155.210;

    # Backend
    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Активируйте
ln -s /etc/nginx/sites-available/collectx /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔄 Обновление приложения

```bash
# На сервере
cd /var/www/collectx
git pull  # если используется git
# или скопируйте новые файлы через rsync

# Перезапуск
docker-compose down
docker-compose build
docker-compose up -d

# Новые миграции
docker-compose exec backend npx prisma migrate deploy
```

---

## ❓ Troubleshooting

### Не подключается к серверу:

```bash
# Проверьте доступность
ping 31.130.155.210

# Проверьте SSH
ssh -v root@31.130.155.210
```

### База данных не подключается:

```bash
# Проверьте логи
docker-compose logs postgres

# Проверьте подключение
docker-compose exec backend npx prisma db pull
```

### Порты заняты:

```bash
# Найдите процесс
netstat -tulpn | grep :3002
# или
lsof -i :3002

# Убейте процесс
kill -9 <PID>
```

---

## 📞 Нужна помощь?

Если что-то не работает:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте .env файл
3. Проверьте firewall правила
4. Проверьте доступность портов

---

**Готово к деплою! 🚀**

