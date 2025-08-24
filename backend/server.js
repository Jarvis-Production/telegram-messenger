const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Подключение к SQLite
const database = require('./database/database');
console.log('✅ SQLite база данных готова к работе');

// Импорт роутов
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');

// Использование роутов
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Health check для Render
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.io обработчики
const socketHandler = require('./socket/socketHandler');
socketHandler(io);

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Что-то пошло не так!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Мессенджер готов к работе!`);
});

module.exports = { app, server, io };
