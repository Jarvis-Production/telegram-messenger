const bcrypt = require('bcryptjs');
const { getOne, getAll, runQuery } = require('../database/database');

class UserSQLite {
  // Создание нового пользователя
  static async create(userData) {
    const { username, email, password, firstName, lastName, phoneNumber } = userData;
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const sql = `
      INSERT INTO users (username, email, password, firstName, lastName, phoneNumber)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await runQuery(sql, [username, email, hashedPassword, firstName, lastName, phoneNumber]);
    
    // Получаем созданного пользователя
    return this.findById(result.id);
  }

  // Поиск пользователя по ID
  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ? AND isActive = 1';
    return await getOne(sql, [id]);
  }

  // Поиск пользователя по username или email
  static async findOne(criteria) {
    let sql, params;
    
    if (criteria.username) {
      sql = 'SELECT * FROM users WHERE username = ? AND isActive = 1';
      params = [criteria.username];
    } else if (criteria.email) {
      sql = 'SELECT * FROM users WHERE email = ? AND isActive = 1';
      params = [criteria.email];
    } else if (criteria.$or) {
      // Поддержка $or для совместимости с Mongoose
      const conditions = criteria.$or.map(cond => {
        if (cond.username) return 'username = ?';
        if (cond.email) return 'email = ?';
        return '1 = 0';
      }).join(' OR ');
      
      sql = `SELECT * FROM users WHERE (${conditions}) AND isActive = 1`;
      params = criteria.$or.map(cond => cond.username || cond.email);
    } else {
      return null;
    }
    
    return await getOne(sql, params);
  }

  // Поиск всех пользователей с фильтрацией
  static async find(filter = {}) {
    let sql = 'SELECT * FROM users WHERE isActive = 1';
    let params = [];
    
    if (filter._id && filter._id.$ne) {
      sql += ' AND id != ?';
      params.push(filter._id.$ne);
    }
    
    if (filter.search) {
      sql += ' AND (username LIKE ? OR firstName LIKE ? OR lastName LIKE ?)';
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filter.limit));
    }
    
    if (filter.page) {
      const offset = (parseInt(filter.page) - 1) * (parseInt(filter.limit) || 20);
      sql += ' OFFSET ?';
      params.push(offset);
    }
    
    sql += ' ORDER BY isOnline DESC, lastSeen DESC';
    
    return await getAll(sql, params);
  }

  // Обновление пользователя
  static async findByIdAndUpdate(id, updateData, options = {}) {
    const fields = [];
    const params = [];
    
    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'password') {
        fields.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });
    
    if (updateData.password) {
      fields.push('password = ?');
      params.push(await bcrypt.hash(updateData.password, 12));
    }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);
    
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);
    
    return this.findById(id);
  }

  // Проверка пароля
  static async comparePassword(userId, candidatePassword) {
    const user = await this.findById(userId);
    if (!user) return false;
    
    return bcrypt.compare(candidatePassword, user.password);
  }

  // Получение публичного профиля
  static getPublicProfile(user) {
    if (!user) return null;
    
    return {
      _id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      avatar: user.avatar,
      status: user.status,
      isOnline: Boolean(user.isOnline),
      lastSeen: user.lastSeen
    };
  }

  // Обновление статуса онлайн
  static async updateOnlineStatus(userId, isOnline) {
    const sql = `
      UPDATE users 
      SET isOnline = ?, lastSeen = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await runQuery(sql, [isOnline ? 1 : 0, userId]);
  }

  // Получение контактов пользователя
  static async getContacts(userId) {
    const sql = `
      SELECT u.* FROM users u
      INNER JOIN user_contacts uc ON u.id = uc.contactId
      WHERE uc.userId = ? AND u.isActive = 1
    `;
    
    return await getAll(sql, [userId]);
  }

  // Добавление контакта
  static async addContact(userId, contactId) {
    const sql = 'INSERT OR IGNORE INTO user_contacts (userId, contactId) VALUES (?, ?)';
    await runQuery(sql, [userId, contactId]);
  }

  // Удаление контакта
  static async removeContact(userId, contactId) {
    const sql = 'DELETE FROM user_contacts WHERE userId = ? AND contactId = ?';
    await runQuery(sql, [userId, contactId]);
  }

  // Получение заблокированных пользователей
  static async getBlockedUsers(userId) {
    const sql = `
      SELECT u.* FROM users u
      INNER JOIN user_blocks ub ON u.id = ub.blockedUserId
      WHERE ub.userId = ? AND u.isActive = 1
    `;
    
    return await getAll(sql, [userId]);
  }

  // Блокировка пользователя
  static async blockUser(userId, blockedUserId) {
    const sql = 'INSERT OR IGNORE INTO user_blocks (userId, blockedUserId) VALUES (?, ?)';
    await runQuery(sql, [userId, blockedUserId]);
  }

  // Разблокировка пользователя
  static async unblockUser(userId, blockedUserId) {
    const sql = 'DELETE FROM user_blocks WHERE userId = ? AND blockedUserId = ?';
    await runQuery(sql, [userId, blockedUserId]);
  }

  // Проверка, заблокирован ли пользователь
  static async isBlocked(userId, blockedUserId) {
    const sql = 'SELECT id FROM user_blocks WHERE userId = ? AND blockedUserId = ?';
    const result = await getOne(sql, [userId, blockedUserId]);
    return !!result;
  }
}

module.exports = UserSQLite;
