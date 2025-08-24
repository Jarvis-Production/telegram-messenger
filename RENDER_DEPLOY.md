# 🚀 Развертывание на Render (БЕСПЛАТНО!)

## Что такое Render?
Render - это современная платформа для хостинга, которая предлагает **бесплатный план навсегда** для веб-сервисов.

## ✅ Преимущества Render:
- 🆓 **Бесплатно навсегда** (750 часов/месяц)
- 🔄 Автоматический деплой из GitHub
- 🔒 Автоматический SSL сертификат
- 📱 Поддержка WebSocket (важно для мессенджера!)
- 🗄️ Встроенные базы данных
- 🚀 Простота настройки

## 📋 Пошаговая инструкция

### Шаг 1: Регистрация на Render
1. Перейдите на https://render.com
2. Нажмите "Get Started for Free"
3. Войдите через GitHub аккаунт
4. Подтвердите email

### Шаг 2: Создание нового Web Service
1. В Dashboard нажмите "New +"
2. Выберите "Web Service"
3. Подключите ваш GitHub репозиторий:
   - `Jarvis-Production/telegram-messenger`
   - Выберите ветку `master`

### Шаг 3: Настройка сервиса
Заполните поля:
- **Name**: `telegram-messenger-backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free`

### Шаг 4: Настройка переменных окружения
Добавьте следующие переменные:

#### Обязательные:
```
NODE_ENV=production
PORT=10000
JWT_SECRET=ваш-секретный-ключ-для-jwt
```

#### База данных MongoDB:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/messenger
```

**Как получить бесплатную MongoDB:**
1. Перейдите на https://www.mongodb.com/atlas
2. Создайте бесплатный аккаунт
3. Создайте кластер (бесплатно)
4. Получите строку подключения

#### Firebase (опционально):
```
FIREBASE_PROJECT_ID=ваш-проект-id
FIREBASE_PRIVATE_KEY=ваш-приватный-ключ
FIREBASE_CLIENT_EMAIL=ваш-клиент-email
```

### Шаг 5: Создание базы данных
1. В Dashboard нажмите "New +"
2. Выберите "PostgreSQL" или "Redis"
3. Выберите план "Free"
4. Скопируйте строку подключения
5. Добавьте в переменные окружения

### Шаг 6: Деплой
1. Нажмите "Create Web Service"
2. Render автоматически:
   - Склонирует ваш код
   - Установит зависимости
   - Запустит сервис
3. Дождитесь статуса "Live" (зеленая галочка)

## 🔗 Ваши URL после деплоя

После успешного деплоя вы получите:
- **Backend API**: `https://telegram-messenger-backend.onrender.com`
- **WebSocket**: `wss://telegram-messenger-backend.onrender.com`

## 📱 Обновление мобильных приложений

Обновите URL в мобильных приложениях:

### iOS (AuthenticationManager.swift):
```swift
private let baseURL = "https://telegram-messenger-backend.onrender.com"
```

### Android (ApiService.kt):
```kotlin
private const val BASE_URL = "https://telegram-messenger-backend.onrender.com"
```

## 🔄 Автоматический деплой

Каждый раз, когда вы пущите изменения в GitHub:
1. Render автоматически обнаружит изменения
2. Пересоберет и перезапустит сервис
3. Обновит ваш мессенджер

## 💰 Стоимость

- **План Free**: $0/месяц (навсегда!)
- **Ограничения**: 750 часов/месяц (достаточно для 24/7)
- **Если превысите лимит**: $7/месяц за неограниченное время

## 🆘 Поддержка

- **Документация**: https://render.com/docs
- **Сообщество**: https://community.render.com
- **Discord**: https://discord.gg/render

## 🎯 Результат

После деплоя у вас будет:
- ✅ Работающий backend API
- ✅ WebSocket для реального времени
- ✅ Автоматический SSL
- ✅ Автодеплой из GitHub
- ✅ Бесплатно навсегда!

---

**Готово! Ваш мессенджер будет работать на Render бесплатно и автоматически обновляться при каждом коммите в GitHub! 🚀**
