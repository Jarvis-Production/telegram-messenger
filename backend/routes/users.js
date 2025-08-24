const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Получение списка пользователей (для поиска контактов)
router.get('/', auth, async (req, res) => {
  try {
    const { search, limit = 20, page = 1 } = req.query;
    
    let query = { _id: { $ne: req.user.userId } };
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('username firstName lastName avatar isOnline lastSeen')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ isOnline: -1, lastSeen: -1 });
    
    res.json({
      success: true,
      data: { users }
    });
    
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка пользователей'
    });
  }
});

// Получение информации о конкретном пользователе
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
      .select('username firstName lastName avatar isOnline lastSeen status');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
    
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении информации о пользователе'
    });
  }
});

// Добавление пользователя в контакты
router.post('/contacts/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя добавить себя в контакты'
      });
    }
    
    const user = await User.findById(req.user.userId);
    const contactUser = await User.findById(userId);
    
    if (!contactUser) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    if (user.contacts.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже в контактах'
      });
    }
    
    user.contacts.push(userId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Пользователь добавлен в контакты'
    });
    
  } catch (error) {
    console.error('Ошибка добавления в контакты:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении в контакты'
    });
  }
});

// Удаление пользователя из контактов
router.delete('/contacts/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(req.user.userId);
    user.contacts = user.contacts.filter(id => id.toString() !== userId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Пользователь удален из контактов'
    });
    
  } catch (error) {
    console.error('Ошибка удаления из контактов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении из контактов'
    });
  }
});

// Блокировка пользователя
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Нельзя заблокировать себя'
      });
    }
    
    const user = await User.findById(req.user.userId);
    const blockedUser = await User.findById(userId);
    
    if (!blockedUser) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }
    
    if (user.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже заблокирован'
      });
    }
    
    user.blockedUsers.push(userId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Пользователь заблокирован'
    });
    
  } catch (error) {
    console.error('Ошибка блокировки пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при блокировке пользователя'
    });
  }
});

// Разблокировка пользователя
router.delete('/block/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(req.user.userId);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId);
    await user.save();
    
    res.json({
      success: true,
      message: 'Пользователь разблокирован'
    });
    
  } catch (error) {
    console.error('Ошибка разблокировки пользователя:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при разблокировке пользователя'
    });
  }
});

module.exports = router;
