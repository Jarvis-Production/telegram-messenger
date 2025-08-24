# 🚀 Мессенджер с SQLite (БЕЗ MongoDB!)

## ✅ Что изменилось?

Теперь мессенджер работает с **SQLite** - встроенной базой данных, которая:
- 🆓 **Полностью бесплатно** - никаких внешних сервисов
- 📁 **Локальная** - база данных хранится в файле
- 🚀 **Быстрая** - отлично работает для небольших и средних проектов
- 🔧 **Простая настройка** - не требует дополнительной конфигурации

## 🗄️ База данных

### SQLite файл
- **Расположение**: `backend/database/messenger.db`
- **Автоматическое создание**: при первом запуске
- **Размер**: растет по мере использования

### Таблицы
- `users` - пользователи
- `chats` - чаты
- `chat_participants` - участники чатов
- `messages` - сообщения
- `message_reactions` - реакции на сообщения
- `message_reads` - прочитанные сообщения
- `user_contacts` - контакты
- `user_blocks` - заблокированные пользователи

## 🚀 Запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск сервера
```bash
npm start
```

### 3. Автоматическое создание базы данных
При первом запуске SQLite автоматически создаст:
- Файл базы данных
- Все необходимые таблицы
- Индексы для оптимизации

## 📱 API Endpoints

### Аутентификация
- `POST /api/auth/register` - регистрация
- `POST /api/auth/login` - вход
- `POST /api/auth/logout` - выход
- `GET /api/auth/profile` - профиль
- `PUT /api/auth/profile` - обновление профиля

### Пользователи
- `GET /api/users` - список пользователей
- `GET /api/users/:id` - информация о пользователе
- `POST /api/users/contacts/:id` - добавить в контакты
- `DELETE /api/users/contacts/:id` - удалить из контактов

### Чаты
- `GET /api/chats` - список чатов
- `POST /api/chats/private` - создать приватный чат
- `POST /api/chats/group` - создать групповой чат
- `GET /api/chats/:id` - информация о чате

### Сообщения
- `GET /api/messages/chat/:chatId` - сообщения чата
- `POST /api/messages` - отправить сообщение
- `PUT /api/messages/:id` - редактировать сообщение
- `DELETE /api/messages/:id` - удалить сообщение

## 🔧 Переменные окружения

Создайте файл `.env`:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=ваш-секретный-ключ
```

## 🎯 Преимущества SQLite версии

### ✅ Плюсы:
- 🆓 **Бесплатно** - никаких внешних сервисов
- 🚀 **Быстро** - локальная база данных
- 🔧 **Просто** - минимум настроек
- 📱 **Портативно** - можно переносить между серверами
- 🛡️ **Безопасно** - данные хранятся локально

### ❌ Минусы:
- 📊 **Ограниченная масштабируемость** - для очень больших проектов
- 👥 **Один сервер** - нельзя распределить нагрузку
- 🔄 **Нет репликации** - один экземпляр базы данных

## 🚀 Деплой на Render

### 1. Обновите render.yaml
```yaml
services:
  - type: web
    name: telegram-messenger-sqlite
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: JWT_SECRET
        generateValue: true
```

### 2. Переменные окружения
В Render добавьте только:
- `NODE_ENV=production`
- `PORT=10000`
- `JWT_SECRET` (автогенерация)

### 3. База данных
- SQLite файл создается автоматически
- Данные сохраняются между перезапусками
- Нет необходимости в MongoDB Atlas

## 🧪 Тестирование

### 1. Регистрация пользователя
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Вход в систему
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "testuser",
    "password": "password123"
  }'
```

### 3. Проверка health
```bash
curl http://localhost:3000/api/health
```

## 🔍 Мониторинг

### Логи сервера
```bash
npm start
```

### Размер базы данных
```bash
ls -la backend/database/messenger.db
```

### Статистика таблиц
```sql
SELECT name, sql FROM sqlite_master WHERE type='table';
```

## 🎉 Готово!

Теперь у вас есть полностью автономный мессенджер:
- ✅ Работает без внешних баз данных
- ✅ Простая настройка и запуск
- ✅ Все функции Telegram
- ✅ Готов к деплою на Render

**Запускайте и тестируйте! 🚀**
