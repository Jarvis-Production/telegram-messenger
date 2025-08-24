const { getOne, getAll, runQuery } = require('../database/database');

class ChatSQLite {
  // Создание нового чата
  static async create(chatData) {
    const { type, name, description, owner, participants } = chatData;
    
    const sql = `
      INSERT INTO chats (type, name, description, owner)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await runQuery(sql, [type, name, description, owner]);
    const chatId = result.id;
    
    // Добавляем участников
    if (participants && participants.length > 0) {
      for (const participant of participants) {
        await this.addParticipant(chatId, participant.user, participant.role || 'member');
      }
    }
    
    return this.findById(chatId);
  }

  // Поиск чата по ID
  static async findById(id) {
    const sql = 'SELECT * FROM chats WHERE id = ? AND isActive = 1';
    const chat = await getOne(sql, [id]);
    
    if (chat) {
      chat.participants = await this.getParticipants(id);
      chat.owner = await this.getOwner(id);
    }
    
    return chat;
  }

  // Поиск чата по критериям
  static async findOne(criteria) {
    let sql, params;
    
    if (criteria.type && criteria['participants.user']) {
      // Поиск приватного чата между двумя пользователями
      const userIds = Array.isArray(criteria['participants.user']) 
        ? criteria['participants.user'] 
        : [criteria['participants.user']];
      
      sql = `
        SELECT c.* FROM chats c
        INNER JOIN chat_participants cp1 ON c.id = cp1.chatId
        INNER JOIN chat_participants cp2 ON c.id = cp2.chatId
        WHERE c.type = ? AND c.isActive = 1
        AND cp1.userId = ? AND cp2.userId = ?
        AND cp1.isActive = 1 AND cp2.isActive = 1
      `;
      params = [criteria.type, userIds[0], userIds[1]];
    } else if (criteria._id) {
      sql = 'SELECT * FROM chats WHERE id = ? AND isActive = 1';
      params = [criteria._id];
    } else {
      return null;
    }
    
    const chat = await getOne(sql, params);
    
    if (chat) {
      chat.participants = await this.getParticipants(chat.id);
      chat.owner = await this.getOwner(chat.id);
    }
    
    return chat;
  }

  // Поиск всех чатов пользователя
  static async find(filter = {}) {
    let sql = `
      SELECT DISTINCT c.* FROM chats c
      INNER JOIN chat_participants cp ON c.id = cp.chatId
      WHERE cp.userId = ? AND c.isActive = 1 AND cp.isActive = 1
    `;
    let params = [filter['participants.user']];
    
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filter.limit));
    }
    
    sql += ' ORDER BY c.updatedAt DESC';
    
    const chats = await getAll(sql, params);
    
    // Заполняем данные участников и владельца для каждого чата
    for (const chat of chats) {
      chat.participants = await this.getParticipants(chat.id);
      chat.owner = await this.getOwner(chat.id);
    }
    
    return chats;
  }

  // Обновление чата
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'participants') {
        fields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);
    
    const sql = `UPDATE chats SET ${fields.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);
    
    return this.findById(id);
  }

  // Сохранение чата (для совместимости с Mongoose)
  async save() {
    if (this.id) {
      // Обновление существующего чата
      const updateData = {
        name: this.name,
        description: this.description,
        avatar: this.avatar
      };
      
      return await ChatSQLite.findByIdAndUpdate(this.id, updateData);
    } else {
      // Создание нового чата
      return await ChatSQLite.create({
        type: this.type,
        name: this.name,
        description: this.description,
        owner: this.owner,
        participants: this.participants
      });
    }
  }

  // Получение участников чата
  static async getParticipants(chatId) {
    const sql = `
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.isOnline, u.lastSeen, cp.role
      FROM chat_participants cp
      INNER JOIN users u ON cp.userId = u.id
      WHERE cp.chatId = ? AND cp.isActive = 1 AND u.isActive = 1
    `;
    
    const participants = await getAll(sql, [chatId]);
    
    return participants.map(p => ({
      user: {
        _id: p.id,
        username: p.username,
        firstName: p.firstName,
        lastName: p.lastName,
        avatar: p.avatar,
        isOnline: Boolean(p.isOnline),
        lastSeen: p.lastSeen
      },
      role: p.role
    }));
  }

  // Получение владельца чата
  static async getOwner(chatId) {
    const sql = `
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
      FROM users u
      INNER JOIN chats c ON c.owner = u.id
      WHERE c.id = ? AND u.isActive = 1
    `;
    
    return await getOne(sql, [chatId]);
  }

  // Добавление участника
  static async addParticipant(chatId, userId, role = 'member') {
    const sql = 'INSERT OR IGNORE INTO chat_participants (chatId, userId, role) VALUES (?, ?, ?)';
    await runQuery(sql, [chatId, userId, role]);
  }

  // Удаление участника
  static async removeParticipant(chatId, userId) {
    const sql = 'UPDATE chat_participants SET isActive = 0 WHERE chatId = ? AND userId = ?';
    await runQuery(sql, [chatId, userId]);
  }

  // Проверка, является ли пользователь участником
  static async isParticipant(chatId, userId) {
    const sql = 'SELECT id FROM chat_participants WHERE chatId = ? AND userId = ? AND isActive = 1';
    const result = await getOne(sql, [chatId, userId]);
    return !!result;
  }

  // Проверка, является ли пользователь администратором
  static async isAdmin(chatId, userId) {
    const sql = 'SELECT role FROM chat_participants WHERE chatId = ? AND userId = ? AND isActive = 1';
    const result = await getOne(sql, [chatId, userId]);
    return result && (result.role === 'admin' || result.role === 'owner');
  }

  // Проверка, является ли пользователь владельцем
  static async isOwner(chatId, userId) {
    const sql = 'SELECT owner FROM chats WHERE id = ? AND isActive = 1';
    const result = await getOne(sql, [chatId]);
    return result && result.owner === userId;
  }

  // Получение последнего сообщения
  static async getLastMessage(chatId) {
    const sql = `
      SELECT m.*, u.username, u.firstName, u.lastName, u.avatar
      FROM messages m
      INNER JOIN users u ON m.senderId = u.id
      WHERE m.chatId = ? AND m.isDeleted = 0
      ORDER BY m.createdAt DESC
      LIMIT 1
    `;
    
    return await getOne(sql, [chatId]);
  }

  // Обновление времени последней активности
  static async updateLastActivity(chatId) {
    const sql = 'UPDATE chats SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
    await runQuery(sql, [chatId]);
  }

  // Деактивация чата
  static async deactivate(chatId) {
    const sql = 'UPDATE chats SET isActive = 0 WHERE id = ?';
    await runQuery(sql, [chatId]);
  }
}

module.exports = ChatSQLite;
