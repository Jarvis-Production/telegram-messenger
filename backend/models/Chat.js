const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['private', 'group', 'channel'],
    required: true
  },
  name: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  avatar: {
    type: String,
    default: null
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'owner'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'group' || this.type === 'channel';
    }
  },
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date,
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'location'],
      default: 'text'
    }
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowInvites: {
      type: Boolean,
      default: true
    },
    allowMedia: {
      type: Boolean,
      default: true
    },
    slowMode: {
      enabled: {
        type: Boolean,
        default: false
      },
      interval: {
        type: Number,
        default: 0 // в секундах
      }
    },
    pinnedMessages: [{
      message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      },
      pinnedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      pinnedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  metadata: {
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Виртуальное поле для количества участников
chatSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Метод для проверки, является ли пользователь участником
chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => 
    p.user.toString() === userId.toString() && p.isActive
  );
};

// Метод для проверки, является ли пользователь администратором
chatSchema.methods.isAdmin = function(userId) {
  return this.admins.some(admin => admin.toString() === userId.toString()) ||
         this.owner.toString() === userId.toString();
};

// Метод для добавления участника
chatSchema.methods.addParticipant = function(userId, role = 'member') {
  if (!this.isParticipant(userId)) {
    this.participants.push({
      user: userId,
      role: role,
      joinedAt: new Date(),
      isActive: true
    });
    
    if (role === 'admin') {
      this.admins.push(userId);
    }
    
    return true;
  }
  return false;
};

// Метод для удаления участника
chatSchema.methods.removeParticipant = function(userId) {
  const participantIndex = this.participants.findIndex(p => 
    p.user.toString() === userId.toString()
  );
  
  if (participantIndex !== -1) {
    this.participants[participantIndex].isActive = false;
    
    // Удаляем из администраторов
    this.admins = this.admins.filter(admin => 
      admin.toString() !== userId.toString()
    );
    
    return true;
  }
  return false;
};

// Метод для обновления последнего сообщения
chatSchema.methods.updateLastMessage = function(message) {
  this.lastMessage = {
    content: message.content,
    sender: message.sender,
    timestamp: message.createdAt,
    type: message.type
  };
  
  // Обновляем счетчик непрочитанных для всех участников кроме отправителя
  this.participants.forEach(participant => {
    if (participant.user.toString() !== message.sender.toString() && participant.isActive) {
      const currentCount = this.unreadCount.get(participant.user.toString()) || 0;
      this.unreadCount.set(participant.user.toString(), currentCount + 1);
    }
  });
};

// Индексы для оптимизации
chatSchema.index({ type: 1 });
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ isActive: 1 });

module.exports = mongoose.model('Chat', chatSchema);
