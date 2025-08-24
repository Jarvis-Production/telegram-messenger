const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Хранилище активных подключений
const activeConnections = new Map();

const socketHandler = (io) => {
  // Middleware для аутентификации Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Токен не предоставлен'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Пользователь не найден'));
      }

      socket.userId = decoded.userId;
      socket.userData = user;
      next();
    } catch (error) {
      next(new Error('Ошибка аутентификации'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 Пользователь ${socket.userData.username} подключился`);

    // Сохранение подключения
    activeConnections.set(socket.userId, socket.id);

    // Обновление статуса пользователя
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
        status: 'online'
      });

      // Уведомление других пользователей о том, что пользователь онлайн
      socket.broadcast.emit('user:status', {
        userId: socket.userId,
        status: 'online',
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }

    // Присоединение к личным чатам пользователя
    try {
      const userChats = await Chat.find({
        'participants.user': socket.userId,
        isActive: true
      });

      userChats.forEach(chat => {
        socket.join(`chat:${chat._id}`);
      });
    } catch (error) {
      console.error('Ошибка присоединения к чатам:', error);
    }

    // Обработка отправки сообщения
    socket.on('message:send', async (data) => {
      try {
        const { chatId, content, type = 'text', replyTo, media, location, contact } = data;

        // Проверка участия в чате
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isParticipant(socket.userId)) {
          socket.emit('message:error', {
            message: 'Доступ к чату запрещен'
          });
          return;
        }

        // Создание нового сообщения
        const message = new Message({
          chat: chatId,
          sender: socket.userId,
          type,
          content,
          replyTo,
          media,
          location,
          contact,
          metadata: {
            platform: socket.userData.platform || 'web',
            deviceId: socket.handshake.auth.deviceId,
            appVersion: socket.handshake.auth.appVersion
          }
        });

        await message.save();

        // Обновление последнего сообщения в чате
        await chat.updateLastMessage(message);

        // Получение полного сообщения с данными отправителя
        const fullMessage = await Message.findById(message._id)
          .populate('sender', 'username firstName lastName avatar')
          .populate('replyTo', 'content sender');

        // Отправка сообщения всем участникам чата
        io.to(`chat:${chatId}`).emit('message:new', {
          message: fullMessage.getPublicMessage(),
          chatId
        });

        // Отправка подтверждения отправителю
        socket.emit('message:sent', {
          messageId: message._id,
          chatId,
          timestamp: message.createdAt
        });

        // Отправка push-уведомлений (если настроено)
        await sendPushNotifications(chat, fullMessage, socket.userId);

      } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        socket.emit('message:error', {
          message: 'Ошибка при отправке сообщения'
        });
      }
    });

    // Обработка реакции на сообщение
    socket.on('message:react', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('message:error', {
            message: 'Сообщение не найдено'
          });
          return;
        }

        // Проверка участия в чате
        const chat = await Chat.findById(message.chat);
        if (!chat || !chat.isParticipant(socket.userId)) {
          socket.emit('message:error', {
            message: 'Доступ к чату запрещен'
          });
          return;
        }

        // Добавление/обновление реакции
        message.addReaction(socket.userId, emoji);
        await message.save();

        // Уведомление всех участников чата
        io.to(`chat:${message.chat}`).emit('message:reaction', {
          messageId,
          reactions: message.reactions,
          chatId: message.chat
        });

      } catch (error) {
        console.error('Ошибка реакции на сообщение:', error);
        socket.emit('message:error', {
          message: 'Ошибка при добавлении реакции'
        });
      }
    });

    // Обработка отметки сообщения как прочитанного
    socket.on('message:read', async (data) => {
      try {
        const { messageId, chatId } = data;

        const message = await Message.findById(messageId);
        if (!message) {
          return;
        }

        // Проверка участия в чате
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isParticipant(socket.userId)) {
          return;
        }

        // Отметка как прочитанного
        message.markAsRead(socket.userId);
        await message.save();

        // Обновление счетчика непрочитанных в чате
        const unreadCount = chat.unreadCount.get(socket.userId.toString()) || 0;
        if (unreadCount > 0) {
          chat.unreadCount.set(socket.userId.toString(), Math.max(0, unreadCount - 1));
          await chat.save();
        }

        // Уведомление отправителя о прочтении
        const senderSocketId = activeConnections.get(message.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read', {
            messageId,
            readBy: socket.userId,
            chatId
          });
        }

      } catch (error) {
        console.error('Ошибка отметки сообщения как прочитанного:', error);
      }
    });

    // Обработка печатания
    socket.on('typing:start', async (data) => {
      try {
        const { chatId } = data;

        // Проверка участия в чате
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isParticipant(socket.userId)) {
          return;
        }

        // Уведомление других участников
        socket.to(`chat:${chatId}`).emit('typing:start', {
          userId: socket.userId,
          username: socket.userData.username,
          chatId
        });

      } catch (error) {
        console.error('Ошибка обработки печатания:', error);
      }
    });

    socket.on('typing:stop', async (data) => {
      try {
        const { chatId } = data;

        // Проверка участия в чате
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.isParticipant(socket.userId)) {
          return;
        }

        // Уведомление других участников
        socket.to(`chat:${chatId}`).emit('typing:stop', {
          userId: socket.userId,
          chatId
        });

      } catch (error) {
        console.error('Ошибка обработки остановки печатания:', error);
      }
    });

    // Обработка изменения статуса
    socket.on('user:status', async (data) => {
      try {
        const { status } = data;

        await User.findByIdAndUpdate(socket.userId, {
          status,
          lastSeen: new Date()
        });

        // Уведомление всех пользователей об изменении статуса
        socket.broadcast.emit('user:status', {
          userId: socket.userId,
          status,
          lastSeen: new Date()
        });

      } catch (error) {
        console.error('Ошибка изменения статуса:', error);
      }
    });

    // Обработка отключения
    socket.on('disconnect', async () => {
      console.log(`🔌 Пользователь ${socket.userData.username} отключился`);

      // Удаление подключения
      activeConnections.delete(socket.userId);

      // Обновление статуса пользователя
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: false,
          lastSeen: new Date(),
          status: 'offline'
        });

        // Уведомление других пользователей
        socket.broadcast.emit('user:status', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Ошибка обновления статуса при отключении:', error);
      }
    });
  });

  return io;
};

// Функция отправки push-уведомлений
async function sendPushNotifications(chat, message, senderId) {
  try {
    // Получение FCM токенов всех участников кроме отправителя
    const participants = chat.participants.filter(p => 
      p.user.toString() !== senderId.toString() && p.isActive
    );

    const userIds = participants.map(p => p.user);
    const users = await User.find({ _id: { $in: userIds } });

    // Здесь должна быть логика отправки через Firebase Cloud Messaging
    // Для простоты просто логируем
    console.log(`📱 Отправка push-уведомлений для чата ${chat._id}`);
    
    users.forEach(user => {
      if (user.fcmToken) {
        console.log(`Отправка уведомления пользователю ${user.username}`);
        // FCM.send({
        //   token: user.fcmToken,
        //   notification: {
        //     title: message.sender.firstName,
        //     body: message.content || 'Новое сообщение'
        //   }
        // });
      }
    });

  } catch (error) {
    console.error('Ошибка отправки push-уведомлений:', error);
  }
}

module.exports = socketHandler;
