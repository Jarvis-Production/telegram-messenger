const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/UserSQLite');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Регистрация нового пользователя
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, phoneNumber } = req.body;

    // Проверка обязательных полей
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Все обязательные поля должны быть заполнены'
      });
    }

    // Проверка длины пароля
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Пароль должен содержать минимум 6 символов'
      });
    }

    // Проверка уникальности username и email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким именем уже существует'
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Пользователь с таким email уже существует'
        });
      }
    }

    // Создание нового пользователя
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      phoneNumber
    });

    await user.save();

    // Генерация JWT токена
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при регистрации пользователя'
    });
  }
});

// Вход пользователя
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/username и пароль обязательны'
      });
    }

    // Поиск пользователя по email или username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверные учетные данные'
      });
    }

    // Проверка пароля
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверные учетные данные'
      });
    }

    // Обновление статуса онлайн
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Генерация JWT токена
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при входе в систему'
    });
  }
});

// Выход пользователя
router.post('/logout', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.json({
      success: true,
      message: 'Выход выполнен успешно'
    });

  } catch (error) {
    console.error('Ошибка выхода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при выходе из системы'
    });
  }
});

// Обновление FCM токена для push-уведомлений
router.post('/fcm-token', auth, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM токен обязателен'
      });
    }

    await User.findByIdAndUpdate(req.user.userId, {
      fcmToken: fcmToken
    });

    res.json({
      success: true,
      message: 'FCM токен обновлен'
    });

  } catch (error) {
    console.error('Ошибка обновления FCM токена:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении FCM токена'
    });
  }
});

// Обновление пароля
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Текущий и новый пароль обязательны'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Новый пароль должен содержать минимум 6 символов'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Проверка текущего пароля
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверный текущий пароль'
      });
    }

    // Обновление пароля
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Пароль успешно изменен'
    });

  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при смене пароля'
    });
  }
});

// Получение профиля текущего пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении профиля'
    });
  }
});

// Обновление профиля
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, avatar } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (avatar !== undefined) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    res.json({
      success: true,
      message: 'Профиль обновлен',
      data: {
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении профиля'
    });
  }
});

module.exports = router;
