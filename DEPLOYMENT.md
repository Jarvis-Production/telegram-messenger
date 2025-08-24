# Инструкции по развертыванию мессенджера

## 🚀 Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+ (для локальной разработки)
- MongoDB (для локальной разработки)
- Git

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-username/telegram-messenger.git
cd telegram-messenger
```

### 2. Настройка переменных окружения

Скопируйте файл конфигурации:

```bash
cp config.env.example .env
```

Отредактируйте `.env` файл, указав ваши настройки:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password123@localhost:27017/messenger?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
FIREBASE_PROJECT_ID=your-firebase-project-id
```

### 3. Запуск с Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка сервисов
docker-compose down
```

### 4. Проверка работы

Откройте браузер и перейдите по адресу: http://localhost:3000

## 📱 Сборка мобильных приложений

### iOS приложение

1. Откройте проект в Xcode:
```bash
cd ios
open Messenger.xcodeproj
```

2. Настройте подписание и bundle identifier
3. Выберите целевое устройство
4. Нажмите Cmd+R для запуска

### Android приложение

1. Откройте проект в Android Studio:
```bash
cd android
```

2. Синхронизируйте Gradle файлы
3. Настройте подписание APK
4. Выберите Build → Build Bundle(s) / APK(s) → Build APK(s)

## 🔧 Настройка Firebase

### 1. Создание проекта Firebase

1. Перейдите на [console.firebase.google.com](https://console.firebase.google.com)
2. Создайте новый проект
3. Добавьте приложения для iOS и Android

### 2. Настройка iOS

1. Скачайте `GoogleService-Info.plist`
2. Добавьте в Xcode проект
3. Добавьте Firebase SDK в `Podfile`:

```ruby
pod 'Firebase/Messaging'
pod 'Firebase/Analytics'
```

### 3. Настройка Android

1. Скачайте `google-services.json`
2. Поместите в `android/app/`
3. Добавьте Firebase SDK в `build.gradle`

## 🌐 Настройка домена и SSL

### 1. Настройка Nginx

Отредактируйте `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Получение SSL сертификата

```bash
# С помощью Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com
```

## 📊 Мониторинг и логирование

### 1. Просмотр логов

```bash
# Backend логи
docker-compose logs -f backend

# MongoDB логи
docker-compose logs -f mongodb

# Nginx логи
docker-compose logs -f nginx
```

### 2. Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Проверка состояния сервисов
docker-compose ps
```

## 🔒 Безопасность

### 1. Настройка файрвола

```bash
# UFW (Ubuntu)
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### 2. Обновление зависимостей

```bash
# Backend
cd backend
npm audit fix
npm update

# Docker образы
docker-compose pull
docker-compose up -d
```

## 🚀 Продакшн развертывание

### 1. Настройка продакшн переменных

```env
NODE_ENV=production
JWT_SECRET=very-long-random-secret-key
MONGODB_URI=mongodb://user:password@mongodb:27017/messenger
```

### 2. Оптимизация производительности

```bash
# Включение сжатия
docker-compose -f docker-compose.prod.yml up -d

# Мониторинг производительности
docker-compose exec backend npm run monitor
```

### 3. Резервное копирование

```bash
# MongoDB
docker-compose exec mongodb mongodump --out /backup

# Файлы
tar -czf backup-$(date +%Y%m%d).tar.gz uploads/
```

## 🆘 Устранение неполадок

### Частые проблемы

1. **Порт занят**: Измените порт в `.env` файле
2. **Ошибка MongoDB**: Проверьте логи `docker-compose logs mongodb`
3. **Проблемы с SSL**: Убедитесь, что сертификаты корректны

### Полезные команды

```bash
# Перезапуск сервиса
docker-compose restart backend

# Очистка Docker
docker system prune -a

# Проверка конфигурации
docker-compose config
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs`
2. Создайте issue в GitHub
3. Обратитесь к документации API

## 🔄 Обновления

### Обновление приложения

```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Откат к предыдущей версии

```bash
git checkout <previous-commit>
docker-compose down
docker-compose up -d --build
```
