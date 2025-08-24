const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'voice'],
    default: 'text'
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text' || this.type === 'location';
    },
    trim: true,
    maxlength: 4096
  },
  media: {
    url: String,
    thumbnail: String,
    filename: String,
    size: Number, // в байтах
    duration: Number, // для аудио/видео в секундах
    width: Number, // для изображений/видео
    height: Number, // для изображений/видео
    mimeType: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    name: String
  },
  contact: {
    name: String,
    phone: String,
    email: String
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  forwardedFrom: {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedAt: Date,
  pinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    clientMessageId: String, // ID сообщения на клиенте
    deviceId: String, // ID устройства, с которого отправлено
    appVersion: String, // версия приложения
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true
    }
  }
}, {
  timestamps: true
});

// Виртуальное поле для количества реакций
messageSchema.virtual('reactionCount').get(function() {
  return this.reactions.length;
});

// Виртуальное поле для количества прочитавших
messageSchema.virtual('readCount').get(function() {
  return this.readBy.length;
});

// Метод для добавления реакции
messageSchema.methods.addReaction = function(userId, emoji) {
  // Удаляем существующую реакцию пользователя
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );
  
  // Добавляем новую реакцию
  this.reactions.push({
    user: userId,
    emoji: emoji,
    timestamp: new Date()
  });
  
  return this.reactions;
};

// Метод для удаления реакции
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => 
    r.user.toString() !== userId.toString()
  );
  return this.reactions;
};

// Метод для отметки сообщения как прочитанного
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => 
    r.user.toString() === userId.toString()
  );
  
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }
  
  return this.readBy;
};

// Метод для редактирования сообщения
messageSchema.methods.edit = function(newContent, userId) {
  if (this.type !== 'text') {
    throw new Error('Только текстовые сообщения можно редактировать');
  }
  
  // Сохраняем историю редактирования
  this.editHistory.push({
    content: this.content,
    editedAt: new Date()
  });
  
  this.content = newContent;
  this.isEdited = true;
  
  return this;
};

// Метод для мягкого удаления сообщения
messageSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  // Очищаем контент для удаленных сообщений
  this.content = 'Сообщение удалено';
  this.media = null;
  this.location = null;
  this.contact = null;
};

// Метод для получения публичного представления сообщения
messageSchema.methods.getPublicMessage = function() {
  if (this.isDeleted) {
    return {
      _id: this._id,
      type: 'deleted',
      content: 'Сообщение удалено',
      sender: this.sender,
      chat: this.chat,
      createdAt: this.createdAt,
      isDeleted: true
    };
  }
  
  return {
    _id: this._id,
    type: this.type,
    content: this.content,
    media: this.media,
    location: this.location,
    contact: this.contact,
    sender: this.sender,
    chat: this.chat,
    replyTo: this.replyTo,
    forwardedFrom: this.forwardedFrom,
    reactions: this.reactions,
    readBy: this.readBy,
    isEdited: this.isEdited,
    isPinned: this.isPinned,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Индексы для оптимизации
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'reactions.user': 1 });
messageSchema.index({ 'readBy.user': 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ isPinned: 1 });

module.exports = mongoose.model('Message', messageSchema);
