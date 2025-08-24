const express = require('express');
const Chat = require('../models/ChatSQLite');
const Message = require('../models/MessageSQLite');
const User = require('../models/UserSQLite');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Получение списка чатов пользователя
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      'participants.user': req.user.userId,
      isActive: true
    })
    .populate('participants.user', 'username firstName lastName avatar isOnline lastSeen')
    .populate('lastMessage.sender', 'username firstName lastName avatar')
    .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 });
    
    res.json({
      success: true,
      data: { chats }
    });
    
  } catch (error) {
    console.error('Ошибка получения чатов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка чатов'
    });
  }
});

// Создание нового приватного чата
router.post('/private', auth, async (req, res) => {
  try {
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'ID участника обязателен'
      });
    }
    
    if (participantId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя создать чат с самим собой'
      });
    }
    
    // Проверяем, существует ли уже приватный чат
    const existingChat = await Chat.findOne({
      type: 'private',
      'participants.user': { $all: [req.user.userId, participantId] },
      isActive: true
    });
    
    if (existingChat) {
      return res.json({
        success: true,
        data: { chat: existingChat },
        message: 'Приватный чат уже существует'
      });
    }
    
    // Создаем новый приватный чат
    const chat = new Chat({
      type: 'private',
      participants: [
        { user: req.user.userId, role: 'member' },
        { user: participantId, role: 'member' }
      ]
    });
    
    await chat.save();
    
    // Заполняем данные участников
    await chat.populate('participants.user', 'username firstName lastName avatar isOnline lastSeen');
    
    res.status(201).json({
      success: true,
      data: { chat },
      message: 'Приватный чат создан'
    });
    
  } catch (error) {
    console.error('Ошибка создания приватного чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании приватного чата'
    });
  }
});

// Создание группового чата
router.post('/group', auth, async (req, res) => {
  try {
    const { name, description, participantIds } = req.body;
    
    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({
        success: false,
        message: 'Название и список участников обязательны'
      });
    }
    
    if (participantIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Групповой чат должен содержать минимум 2 участника'
      });
    }
    
    // Добавляем создателя в список участников
    const allParticipants = [...new Set([req.user.userId, ...participantIds])];
    
    const chat = new Chat({
      type: 'group',
      name,
      description,
      owner: req.user.userId,
      admins: [req.user.userId],
      participants: allParticipants.map(id => ({
        user: id,
        role: id === req.user.userId ? 'owner' : 'member'
      }))
    });
    
    await chat.save();
    
    // Заполняем данные участников
    await chat.populate('participants.user', 'username firstName lastName avatar isOnline lastSeen');
    
    res.status(201).json({
      success: true,
      data: { chat },
      message: 'Групповой чат создан'
    });
    
  } catch (error) {
    console.error('Ошибка создания группового чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании группового чата'
    });
  }
});

// Получение информации о чате
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({
      _id: chatId,
      'participants.user': req.user.userId,
      isActive: true
    })
    .populate('participants.user', 'username firstName lastName avatar isOnline lastSeen')
    .populate('owner', 'username firstName lastName avatar')
    .populate('admins', 'username firstName lastName avatar');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Чат не найден'
      });
    }
    
    res.json({
      success: true,
      data: { chat }
    });
    
  } catch (error) {
    console.error('Ошибка получения чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации о чате'
    });
  }
});

// Обновление информации о чате
router.put('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name, description, avatar } = req.body;
    
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
    
    // Проверяем права на редактирование
    if (chat.type === 'private') {
      return res.status(403).json({
        success: false,
        message: 'Приватные чаты нельзя редактировать'
      });
    }
    
    if (!chat.admins.includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Только администраторы могут редактировать чат'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('participants.user', 'username firstName lastName avatar isOnline lastSeen')
    .populate('owner', 'username firstName lastName avatar')
    .populate('admins', 'username firstName lastName avatar');
    
    res.json({
      success: true,
      data: { chat: updatedChat },
      message: 'Чат обновлен'
    });
    
  } catch (error) {
    console.error('Ошибка обновления чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении чата'
    });
  }
});

// Добавление участника в групповой чат
router.post('/:chatId/participants', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId, role = 'member' } = req.body;
    
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
    
    if (chat.type === 'private') {
      return res.status(403).json({
        success: false,
        message: 'В приватные чаты нельзя добавлять участников'
      });
    }
    
    if (!chat.admins.includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Только администраторы могут добавлять участников'
      });
    }
    
    if (chat.participants.some(p => p.user.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже является участником чата'
      });
    }
    
    chat.participants.push({ user: userId, role });
    await chat.save();
    
    await chat.populate('participants.user', 'username firstName lastName avatar isOnline lastSeen');
    
    res.json({
      success: true,
      data: { chat },
      message: 'Участник добавлен в чат'
    });
    
  } catch (error) {
    console.error('Ошибка добавления участника:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении участника'
    });
  }
});

// Удаление участника из группового чата
router.delete('/:chatId/participants/:userId', auth, async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    
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
    
    if (chat.type === 'private') {
      return res.status(403).json({
        success: false,
        message: 'Из приватных чатов нельзя удалять участников'
      });
    }
    
    if (!chat.admins.includes(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: 'Только администраторы могут удалять участников'
      });
    }
    
    if (userId === chat.owner.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Нельзя удалить владельца чата'
      });
    }
    
    chat.participants = chat.participants.filter(p => p.user.toString() !== userId);
    await chat.save();
    
    await chat.populate('participants.user', 'username firstName lastName avatar isOnline lastSeen');
    
    res.json({
      success: true,
      data: { chat },
      message: 'Участник удален из чата'
    });
    
  } catch (error) {
    console.error('Ошибка удаления участника:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении участника'
    });
  }
});

// Покинуть чат
router.post('/:chatId/leave', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    
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
    
    if (chat.owner.toString() === req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Владелец не может покинуть чат. Передайте права другому участнику.'
      });
    }
    
    chat.participants = chat.participants.filter(p => p.user.toString() !== req.user.userId);
    
    if (chat.type === 'group' && chat.participants.length < 2) {
      chat.isActive = false; // Деактивируем чат если остался 1 участник
    }
    
    await chat.save();
    
    res.json({
      success: true,
      message: 'Вы покинули чат'
    });
    
  } catch (error) {
    console.error('Ошибка выхода из чата:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при выходе из чата'
    });
  }
});

module.exports = router;
