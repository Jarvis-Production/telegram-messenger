const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Путь к файлу базы данных
const dbPath = path.join(__dirname, 'messenger.db');

// Создаем подключение к базе данных
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Ошибка подключения к SQLite:', err.message);
  } else {
    console.log('✅ Подключение к SQLite установлено');
    initDatabase();
  }
});

// Инициализация базы данных
function initDatabase() {
  // Включаем внешние ключи
  db.run('PRAGMA foreign_keys = ON');
  
  // Создаем таблицу пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      avatar TEXT,
      phoneNumber TEXT,
      status TEXT DEFAULT 'offline',
      lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
      isOnline INTEGER DEFAULT 0,
      fcmToken TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Создаем таблицу чатов
  db.run(`
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('private', 'group', 'channel')),
      name TEXT,
      description TEXT,
      avatar TEXT,
      owner INTEGER,
      isActive INTEGER DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner) REFERENCES users (id)
    )
  `);

  // Создаем таблицу участников чатов
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      role TEXT DEFAULT 'member' CHECK(role IN ('member', 'admin', 'owner')),
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isActive INTEGER DEFAULT 1,
      FOREIGN KEY (chatId) REFERENCES chats (id),
      FOREIGN KEY (userId) REFERENCES users (id),
      UNIQUE(chatId, userId)
    )
  `);

  // Создаем таблицу сообщений
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chatId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      type TEXT DEFAULT 'text' CHECK(type IN ('text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'voice')),
      content TEXT,
      media TEXT,
      location TEXT,
      contact TEXT,
      replyToId INTEGER,
      forwardedFromId INTEGER,
      isEdited INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      deletedAt DATETIME,
      deletedById INTEGER,
      isPinned INTEGER DEFAULT 0,
      pinnedAt DATETIME,
      pinnedById INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chatId) REFERENCES chats (id),
      FOREIGN KEY (senderId) REFERENCES users (id),
      FOREIGN KEY (replyToId) REFERENCES messages (id),
      FOREIGN KEY (forwardedFromId) REFERENCES messages (id),
      FOREIGN KEY (deletedById) REFERENCES users (id),
      FOREIGN KEY (pinnedById) REFERENCES users (id)
    )
  `);

  // Создаем таблицу реакций на сообщения
  db.run(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messageId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (messageId) REFERENCES messages (id),
      FOREIGN KEY (userId) REFERENCES users (id),
      UNIQUE(messageId, userId)
    )
  `);

  // Создаем таблицу прочитанных сообщений
  db.run(`
    CREATE TABLE IF NOT EXISTS message_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      messageId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      readAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (messageId) REFERENCES messages (id),
      FOREIGN KEY (userId) REFERENCES users (id),
      UNIQUE(messageId, userId)
    )
  `);

  // Создаем таблицу контактов
  db.run(`
    CREATE TABLE IF NOT EXISTS user_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      contactId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (contactId) REFERENCES users (id),
      UNIQUE(userId, contactId)
    )
  `);

  // Создаем таблицу заблокированных пользователей
  db.run(`
    CREATE TABLE IF NOT EXISTS user_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      blockedUserId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id),
      FOREIGN KEY (blockedUserId) REFERENCES users (id),
      UNIQUE(userId, blockedUserId)
    )
  `);

  // Создаем индексы для оптимизации
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_isOnline ON users(isOnline)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_lastSeen ON users(lastSeen)');
  db.run('CREATE INDEX IF NOT EXISTS idx_chat_participants_chatId ON chat_participants(chatId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_chat_participants_userId ON chat_participants(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_message_reactions_messageId ON message_reactions(messageId)');

  console.log('✅ База данных SQLite инициализирована');
}

// Функция для выполнения запросов с промисами
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Функция для получения одной записи
function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Функция для получения множества записей
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Функция для выполнения транзакций
function transaction(callback) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      try {
        callback();
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
}

module.exports = {
  db,
  runQuery,
  getOne,
  getAll,
  transaction
};
