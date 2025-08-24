# 🚀 Настройка переменных окружения

## 📋 Что нужно сделать ВАМ:

### 1. Создать файл `.env` в корне проекта

Скопируйте содержимое из файла `local.env` в новый файл `.env`

**Windows (PowerShell):**
```powershell
Copy-Item local.env .env
```

**Linux/Mac:**
```bash
cp local.env .env
```

### 2. Для Render.com

В Render Dashboard добавьте эти переменные:

- `NODE_ENV` = `production`
- `PORT` = `10000`
- `JWT_SECRET` = оставьте пустым (Render сгенерирует автоматически)

## ✅ Что я уже сделал:

- ✅ Создал `backend/config/config.js` - центральная конфигурация
- ✅ Обновил `server.js` для использования конфигурации
- ✅ Создал `local.env` - для локальной разработки
- ✅ Создал `render.env` - для Render.com
- ✅ Создал `ENV_SETUP.md` - эта инструкция

## 🔧 Файлы конфигурации:

- `local.env` → скопировать в `.env` (локальная разработка)
- `render.env` → использовать в Render Dashboard
- `backend/config/config.js` → автоматически загружает настройки

## 🚀 Запуск:

После создания `.env` файла:

```bash
npm install
npm start
```

## 📱 Для мобильных приложений:

### iOS: обновите `Info.plist`
```xml
<key>API_BASE_URL</key>
<string>http://localhost:3000</string>
```

### Android: обновите `build.gradle`
```gradle
buildConfigField "String", "API_BASE_URL", "\"http://localhost:3000\""
```

## 🎯 Готово!

Теперь ваш мессенджер будет работать с правильными настройками! 🎉
