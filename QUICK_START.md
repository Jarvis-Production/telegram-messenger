# 🚀 Быстрый запуск мессенджера

## 📋 Что у нас есть

✅ **Backend сервер** - Node.js + Express + Socket.io  
✅ **База данных** - MongoDB с моделями пользователей, чатов и сообщений  
✅ **iOS приложение** - Swift + SwiftUI  
✅ **Android приложение** - Kotlin + Jetpack Compose  
✅ **Docker конфигурация** - для простого развертывания  
✅ **WebSocket** - для сообщений в реальном времени  
✅ **Push-уведомления** - через Firebase  

## 🚀 Запуск за 5 минут

### 1. Клонируйте репозиторий
```bash
git clone <your-repo-url>
cd telegram-messenger
```

### 2. Настройте переменные окружения
```bash
cp config.env.example .env
# Отредактируйте .env файл
```

### 3. Запустите сервер
```bash
docker-compose up -d
```

### 4. Откройте в браузере
http://localhost:3000

## 📱 Сборка мобильных приложений

### iOS
```bash
cd ios
open Messenger.xcodeproj
# Нажмите Cmd+R для запуска
```

### Android
```bash
cd android
# Откройте в Android Studio
# Build → Build APK
```

## 🔧 Основные функции

- 💬 **Обмен сообщениями** в реальном времени
- 👥 **Групповые чаты** с ролями
- 📎 **Отправка файлов** и медиа
- 🔔 **Push-уведомления**
- 🔐 **Безопасная аутентификация** JWT
- 🌙 **Темная/светлая тема**
- 📍 **Геолокация**
- 🎵 **Голосовые сообщения**

## 📁 Структура проекта

```
messenger/
├── backend/          # Серверная часть
│   ├── models/      # Модели MongoDB
│   ├── routes/      # API роуты
│   ├── socket/      # WebSocket обработчики
│   └── middleware/  # Middleware
├── ios/             # iOS приложение
├── android/         # Android приложение
├── docker-compose.yml
└── README.md
```

## 🌐 API Endpoints

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `GET /api/auth/profile` - Профиль
- `GET /api/chats` - Список чатов
- `POST /api/messages` - Отправка сообщения

## 🔌 WebSocket события

- `message:send` - Отправка сообщения
- `message:react` - Реакция на сообщение
- `typing:start/stop` - Индикатор печатания
- `user:status` - Статус пользователя

## 🐛 Устранение неполадок

### Сервер не запускается
```bash
docker-compose logs backend
```

### База данных недоступна
```bash
docker-compose logs mongodb
```

### Проблемы с портами
Измените порты в `docker-compose.yml`

## 📞 Поддержка

- 📖 [Полная документация](DEPLOYMENT.md)
- 🐛 [Создать issue](https://github.com/your-repo/issues)
- 💬 [Discord/Telegram группа]

## 🎯 Следующие шаги

1. **Настройте Firebase** для push-уведомлений
2. **Добавьте SSL** сертификат
3. **Настройте мониторинг** и логирование
4. **Добавьте тесты** для API
5. **Оптимизируйте** производительность

---

**🎉 Готово! Ваш мессенджер запущен и готов к использованию!**
