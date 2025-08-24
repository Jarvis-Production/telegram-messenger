require('dotenv').config();

module.exports = {
  // Основные настройки
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  
  // JWT токен
  JWT_SECRET: process.env.JWT_SECRET || 'telegram-messenger-super-secret-key-2024-ultra-secure',
  JWT_EXPIRES_IN: '7d',
  
  // База данных SQLite
  DB_PATH: process.env.DB_PATH || 'backend/database/messenger.db',
  DB_TIMEOUT: parseInt(process.env.DB_TIMEOUT) || 30000,
  
  // Настройки безопасности
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  HELMET_ENABLED: process.env.HELMET_ENABLED !== 'false',
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Настройки загрузки файлов
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || 'uploads/',
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'video/mp4',
    'audio/mpeg'
  ],
  
  // Настройки WebSocket
  SOCKET_PING_TIMEOUT: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
  SOCKET_PING_INTERVAL: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
  
  // Настройки логирования
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || 'logs/app.log',
  
  // Настройки сессий
  SESSION_SECRET: process.env.SESSION_SECRET || 'telegram-messenger-session-secret-2024',
  SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 часа
  
  // Firebase (опционально)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  
  // Redis (опционально)
  REDIS_URL: process.env.REDIS_URL,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: parseInt(process.env.REDIS_DB) || 0,
  
  // SMTP (опционально)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // Проверка обязательных переменных
  validate() {
    const required = ['JWT_SECRET'];
    const missing = required.filter(key => !this[key]);
    
    if (missing.length > 0) {
      throw new Error(`Отсутствуют обязательные переменные окружения: ${missing.join(', ')}`);
    }
    
    return true;
  },
  
  // Получение конфигурации для окружения
  getEnvConfig() {
    return {
      development: {
        LOG_LEVEL: 'debug',
        CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001',
        DB_PATH: 'backend/database/messenger-dev.db'
      },
      production: {
        LOG_LEVEL: 'error',
        CORS_ORIGIN: '*',
        HELMET_ENABLED: true
      },
      test: {
        LOG_LEVEL: 'warn',
        DB_PATH: 'backend/database/messenger-test.db',
        JWT_SECRET: 'test-secret-key'
      }
    }[this.NODE_ENV] || {};
  }
};
