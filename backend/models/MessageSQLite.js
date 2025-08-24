const { getOne, getAll, runQuery } = require('../database/database');

class MessageSQLite {
  // Создание нового сообщения
  static async create(messageData) {
    const { chatId, senderId, content, type = 'text', replyToId, forwardedFromId } = messageData;
    
    const sql = `
      INSERT INTO messages (chatId, senderId, content, type, replyToId, forwardedFromId)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await runQuery(sql, [chatId, senderId, content, type, replyToId, forwardedFromId]);
    
    // Обновляем время последней активности чата
    const Chat = require('./ChatSQLite');
    await Chat.updateLastActivity(chatId);
    
    return this.findById(result.id);
  }

  // Поиск сообщения по ID
  static async findById(id) {
    const sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      WHERE m.id = ? AND m.isDeleted = 0
    `;
    
    return await getOne(sql, [id]);
  }

  // Поиск сообщений по критериям
  static async find(query = {}) {
    let sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      WHERE m.isDeleted = 0
    `;
    let params = [];
    
    if (query.chat) {
      sql += ' AND m.chatId = ?';
      params.push(query.chat);
    }
    
    if (query.sender) {
      sql += ' AND m.senderId = ?';
      params.push(query.sender);
    }
    
    if (query.isDeleted !== undefined) {
      sql += ' AND m.isDeleted = ?';
      params.push(query.isDeleted ? 1 : 0);
    }
    
    if (query.createdAt && query.createdAt.$lt) {
      sql += ' AND m.createdAt < ?';
      params.push(query.createdAt.$lt);
    }
    
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(query.limit));
    }
    
    if (query.skip) {
      sql += ' OFFSET ?';
      params.push(parseInt(query.skip));
    }
    
    sql += ' ORDER BY m.createdAt DESC';
    
    return await getAll(sql, params);
  }

  // Поиск одного сообщения
  static async findOne(criteria) {
    let sql, params;
    
    if (criteria._id) {
      sql = `
        SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
        FROM messages m
        INNER JOIN users u ON m.senderId = u.id
        WHERE m.id = ? AND m.isDeleted = 0
      `;
      params = [criteria._id];
    } else if (criteria.chat && criteria.sender) {
      sql = `
        SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
        FROM messages m
        INNER JOIN users u ON m.senderId = u.id
        WHERE m.chatId = ? AND m.senderId = ? AND m.isDeleted = 0
        ORDER BY m.createdAt DESC
        LIMIT 1
      `;
      params = [criteria.chat, criteria.sender];
    } else {
      return null;
    }
    
    return await getOne(sql, params);
  }

  // Обновление сообщения
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'chatId' && key !== 'senderId') {
        fields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    if (updateData.isEdited !== undefined) {
      fields.push('isEdited = ?');
      params.push(updateData.isEdited ? 1 : 0);
    }
    
    params.push(id);
    
    const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);
    
    return this.findById(id);
  }

  // Удаление сообщения
  static async findByIdAndDelete(id, deletedById) {
    const sql = `
      UPDATE messages 
      SET isDeleted = 1, deletedAt = CURRENT_TIMESTAMP, deletedById = ?
      WHERE id = ?
    `;
    
    await runQuery(sql, [deletedById, id]);
    
    return this.findById(id);
  }

  // Подсчет сообщений
  static async countDocuments(query = {}) {
    let sql = 'SELECT COUNT(*) as count FROM messages WHERE isDeleted = 0';
    let params = [];
    
    if (query.chat) {
      sql += ' AND chatId = ?';
      params.push(query.chat);
    }
    
    if (query.sender) {
      sql += ' AND senderId = ?';
      params.push(query.sender);
    }
    
    const result = await getOne(sql, params);
    return result ? result.count : 0;
  }

  // Сохранение сообщения (для совместимости с Mongoose)
  async save() {
    if (this.id) {
      // Обновление существующего сообщения
      const updateData = {
        content: this.content,
        type: this.type,
        media: this.media,
        location: this.location,
        contact: this.contact
      };
      
      return await MessageSQLite.findByIdAndUpdate(this.id, updateData);
    } else {
      // Создание нового сообщения
      return await MessageSQLite.create({
        chatId: this.chat || this.chatId,
        senderId: this.sender || this.senderId,
        content: this.content,
        type: this.type,
        replyToId: this.replyTo || this.replyToId,
        forwardedFromId: this.forwardedFrom || this.forwardedFromId
      });
    }
  }

  // Получение сообщений чата с пагинацией
  static async getChatMessages(chatId, page = 1, limit = 50, before = null) {
    let sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ? AND m.isDeleted = 0
    `;
    let params = [chatId];
    
    if (before) {
      sql += ' AND m.createdAt < ?';
      params.push(before);
    }
    
    sql += ' ORDER BY m.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const messages = await getAll(sql, params);
    
    // Получаем общее количество сообщений
    const total = await this.countDocuments({ chat: chatId });
    
    return {
      messages: messages.reverse(), // Возвращаем в хронологическом порядке
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  // Поиск сообщений по тексту
  static async searchMessages(chatId, searchTerm, userId) {
    const sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      INNER JOIN chat_participants cp ON m.chatId = cp.chatId
      WHERE m.chatId = ? AND cp.userId = ? AND cp.isActive = 1
      AND m.isDeleted = 0 AND m.content LIKE ?
      ORDER BY m.createdAt DESC
      LIMIT 100
    `;
    
    const searchPattern = `%${searchTerm}%`;
    return await getAll(sql, [chatId, userId, searchPattern]);
  }

  // Получение реакций на сообщение
  static async getReactions(messageId) {
    const sql = `
      SELECT mr.*, u.username, u.firstName, u.lastName
      FROM message_reactions mr
      INNER JOIN users u ON mr.userId = u.id
      WHERE mr.messageId = ? AND u.isActive = 1
    `;
    
    return await getAll(sql, [messageId]);
  }

  // Добавление реакции
  static async addReaction(messageId, userId, emoji) {
    const sql = 'INSERT OR REPLACE INTO message_reactions (messageId, userId, emoji) VALUES (?, ?, ?)';
    await runQuery(sql, [messageId, userId, emoji]);
  }

  // Удаление реакции
  static async removeReaction(messageId, userId) {
    const sql = 'DELETE FROM message_reactions WHERE messageId = ? AND userId = ?';
    await runQuery(sql, [messageId, userId]);
  }

  // Отметка сообщения как прочитанного
  static async markAsRead(messageId, userId) {
    const sql = 'INSERT OR IGNORE INTO message_reads (messageId, userId) VALUES (?, ?)';
    await runQuery(sql, [messageId, userId]);
  }

  // Получение количества непрочитанных сообщений
  static async getUnreadCount(chatId, userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM messages m
      LEFT JOIN message_reads mr ON m.id = mr.messageId AND mr.userId = ?
      WHERE m.chatId = ? AND m.senderId != ? AND m.isDeleted = 0
      AND mr.id IS NULL
    `;
    
    const result = await getOne(sql, [userId, chatId, userId]);
    return result ? result.count : 0;
  }

  // Закрепление сообщения
  static async pinMessage(messageId, pinnedById) {
    const sql = `
      UPDATE messages 
      SET isPinned = 1, pinnedAt = CURRENT_TIMESTAMP, pinnedById = ?
      WHERE id = ?
    `;
    
    await runQuery(sql, [pinnedById, messageId]);
  }

  // Открепление сообщения
  static async unpinMessage(messageId) {
    const sql = `
      UPDATE messages 
      SET isPinned = 0, pinnedAt = NULL, pinnedById = NULL
      WHERE id = ?
    `;
    
    await runQuery(sql, [messageId]);
  }

  // Получение закрепленных сообщений чата
  static async getPinnedMessages(chatId) {
    const sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ? AND m.isPinned = 1 AND m.isDeleted = 0
      ORDER BY m.pinnedAt DESC
    `;
    
    return await getAll(sql, [chatId]);
  }
}

module.exports = MessageSQLite;
