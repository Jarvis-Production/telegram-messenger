const express = require('express');
const Message = require('../models/MessageSQLite');
const Chat = require('../models/ChatSQLite');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Получение сообщений чата
router.get('/chat/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    
    // Проверяем, является ли пользователь участником чата
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': req.user.userId,
      isActive: true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }
    
    // Формируем запрос для получения сообщений
    let query = { chat: chatId, isDeleted: false };
    
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }
    
    const messages = await Message.find(query)
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo', 'content sender')
      .populate('forwardedFrom', 'content sender')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Получаем общее количество сообщений
    const total = await Message.countDocuments({ chat: chatId, isDeleted: false });
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Возвращаем в хронологическом порядке
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сообщений'
    });
  }
});

// Отправка сообщения
router.post('/', auth, async (req, res) => {
  try {
    const { chatId, content, type = 'text', replyTo, forwardedFrom } = req.body;
    
    if (!chatId || !content) {
      return res.status(400).json({
        success: false,
        message: 'ID чата и содержимое сообщения обязательны'
      });
    }
    
    // Проверяем, является ли пользователь участником чата
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': req.user.userId,
      isActive: true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }
    
    // Создаем новое сообщение
    const message = new Message({
      chat: chatId,
      sender: req.user.userId,
      content,
      type,
      replyTo,
      forwardedFrom
    });
    
    await message.save();
    
    // Обновляем последнее сообщение в чате
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: {
        message: message._id,
        sender: req.user.userId,
        content: content.substring(0, 100), // Первые 100 символов
        createdAt: new Date()
      }
    });
    
    // Заполняем данные отправителя
    await message.populate('sender', 'username firstName lastName avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }
    if (forwardedFrom) {
      await message.populate('forwardedFrom', 'content sender');
    }
    
    res.status(201).json({
      success: true,
      data: { message },
      message: 'Сообщение отправлено'
    });
    
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отправке сообщения'
    });
  }
});

// Редактирование сообщения
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Новое содержимое сообщения обязательно'
      });
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }
    
    // Проверяем, является ли пользователь отправителем сообщения
    if (message.sender.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Можно редактировать только свои сообщения'
      });
    }
    
    // Проверяем, не прошло ли слишком много времени
    const timeDiff = Date.now() - message.createdAt.getTime();
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 часа
    
    if (timeDiff > maxEditTime) {
      return res.status(400).json({
        success: false,
        message: 'Сообщение можно редактировать только в течение 24 часов'
      });
    }
    
    // Сохраняем историю редактирования
    if (!message.editHistory) {
      message.editHistory = [];
    }
    
    message.editHistory.push({
      content: message.content,
      editedAt: message.updatedAt || message.createdAt
    });
    
    // Обновляем сообщение
    message.content = content;
    message.isEdited = true;
    message.updatedAt = new Date();
    
    await message.save();
    
    // Заполняем данные отправителя
    await message.populate('sender', 'username firstName lastName avatar');
    
    res.json({
      success: true,
      data: { message },
      message: 'Сообщение отредактировано'
    });
    
  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при редактировании сообщения'
    });
  }
});

// Удаление сообщения
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }
    
    // Проверяем, является ли пользователь отправителем сообщения или администратором чата
    const chat = await Chat.findOne({
      _id: message.chat,
      'participants.user': req.user.userId,
      isActive: true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }
    
    const isAdmin = chat.admins.includes(req.user.userId);
    const isOwner = chat.owner && chat.owner.toString() === req.user.userId;
    const isSender = message.sender.toString() === req.user.userId;
    
    if (!isAdmin && !isOwner && !isSender) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для удаления сообщения'
      });
    }
    
    // Мягкое удаление сообщения
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.userId;
    
    await message.save();
    
    res.json({
      success: true,
      message: 'Сообщение удалено'
    });
    
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении сообщения'
    });
  }
});

// Добавление реакции на сообщение
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Эмодзи обязателен'
      });
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }
    
    // Проверяем, является ли пользователь участником чата
    const chat = await Chat.findOne({
      _id: message.chat,
      'participants.user': req.user.userId,
      isActive: true
    });
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }
    
    // Добавляем или обновляем реакцию
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user.userId
    );
    
    if (existingReactionIndex !== -1) {
      // Обновляем существующую реакцию
      message.reactions[existingReactionIndex].emoji = emoji;
      message.reactions[existingReactionIndex].updatedAt = new Date();
    } else {
      // Добавляем новую реакцию
      message.reactions.push({
        user: req.user.userId,
        emoji,
        createdAt: new Date()
      });
    }
    
    await message.save();
    
    // Заполняем данные пользователей в реакциях
    await message.populate('reactions.user', 'username firstName lastName avatar');
    
    res.json({
      success: true,
      data: { message },
      message: 'Реакция добавлена'
    });
    
  } catch (error) {
    console.error('Ошибка добавления реакции:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении реакции'
    });
  }
});

// Удаление реакции с сообщения
router.delete('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Сообщение не найдено'
      });
    }
    
    // Удаляем реакцию пользователя
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.user.userId
    );
    
    await message.save();
    
    res.json({
      success: true,
      data: { message },
      message: 'Реакция удалена'
    });
    
  } catch (error) {
    console.error('Ошибка удаления реакции:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении реакции'
    });
  }
});

// Поиск сообщений
router.get('/search', auth, async (req, res) => {
  try {
    const { query, chatId, limit = 20, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Поисковый запрос обязателен'
      });
    }
    
    // Формируем поисковый запрос
    let searchQuery = {
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    };
    
    if (chatId) {
      // Проверяем, является ли пользователь участником чата
      const chat = await Chat.findOne({
        _id: chatId,
        'participants.user': req.user.userId,
        isActive: true
      });
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Чат не найден'
        });
      }
      
      searchQuery.chat = chatId;
    } else {
      // Поиск по всем чатам пользователя
      const userChats = await Chat.find({
        'participants.user': req.user.userId,
        isActive: true
      }).select('_id');
      
      searchQuery.chat = { $in: userChats.map(c => c._id) };
    }
    
    const messages = await Message.find(searchQuery)
      .populate('sender', 'username firstName lastName avatar')
      .populate('chat', 'name type')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Получаем общее количество результатов
    const total = await Message.countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка поиска сообщений:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при поиске сообщений'
    });
  }
});

module.exports = router;
