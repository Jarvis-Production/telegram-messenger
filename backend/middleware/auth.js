const jwt = require('jsonwebtoken');
const User = require('../models/UserSQLite');

const auth = async (req, res, next) => {
  try {
    // Получение токена из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Токен доступа не предоставлен'
      });
    }

    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Поиск пользователя
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка активности пользователя
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Аккаунт заблокирован'
      });
    }

    // Добавление пользователя в request
    req.user = decoded;
    req.userData = user;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Токен истек'
      });
    }

    console.error('Ошибка аутентификации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка аутентификации'
    });
  }
};

// Middleware для проверки роли администратора
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.userData) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не аутентифицирован'
      });
    }

    // Здесь можно добавить логику проверки роли администратора
    // Например, проверка поля role в модели User
    
    next();
  } catch (error) {
    console.error('Ошибка проверки роли:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки роли'
    });
  }
};

// Middleware для проверки владельца ресурса
const requireOwner = (resourceField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.userData) {
        return res.status(401).json({
          success: false,
          message: 'Пользователь не аутентифицирован'
        });
      }

      const resourceUserId = req.params[resourceField] || req.body[resourceField];
      
      if (!resourceUserId) {
        return res.status(400).json({
          success: false,
          message: 'ID ресурса не указан'
        });
      }

      if (req.user.userId !== resourceUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Доступ запрещен'
        });
      }

      next();
    } catch (error) {
      console.error('Ошибка проверки владельца:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка проверки владельца'
      });
    }
  };
};

// Middleware для проверки участника чата
const requireChatParticipant = async (req, res, next) => {
  try {
    if (!req.userData) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не аутентифицирован'
      });
    }

    const chatId = req.params.chatId || req.body.chatId;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'ID чата не указан'
      });
    }

    // Здесь нужно импортировать модель Chat и проверить участие
    // const Chat = require('../models/Chat');
    // const chat = await Chat.findById(chatId);
    // if (!chat || !chat.isParticipant(req.user.userId)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Доступ к чату запрещен'
    //   });
    // }

    next();
  } catch (error) {
    console.error('Ошибка проверки участника чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка проверки участника чата'
    });
  }
};

module.exports = {
  auth,
  requireAdmin,
  requireOwner,
  requireChatParticipant
};
