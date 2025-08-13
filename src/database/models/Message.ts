import mongoose, { Schema, Document } from 'mongoose';
import { MessageRecord, ServiceType, MessageStatus } from '@/types';

export interface IMessage extends Omit<MessageRecord, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const MessageSchema = new Schema<IMessage>({
  service: {
    type: String,
    enum: ['whatsapp', 'telegram'] as ServiceType[],
    required: true,
    index: true,
  },
  recipient: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  message: {
    type: String,
    required: true,
    maxlength: 4096, // WhatsApp message limit
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'] as MessageStatus[],
    default: 'pending',
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  errorMessage: {
    type: String,
    maxlength: 1000,
  },
  messageId: {
    type: String,
    sparse: true, // Allow null values but create index for non-null values
    index: true,
  },
  requestedBy: {
    type: String,
    index: true,
    default: 'admin',
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes for better query performance
MessageSchema.index({ service: 1, status: 1 });
MessageSchema.index({ service: 1, timestamp: -1 });
MessageSchema.index({ recipient: 1, timestamp: -1 });
MessageSchema.index({ timestamp: -1 }); // For pagination

// Virtual for id field
MessageSchema.virtual('id').get(function (this: IMessage) {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
MessageSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Pre-save middleware for validation
MessageSchema.pre('save', function (this: IMessage, next) {
  // Validate recipient format based on service
  if (this.service === 'whatsapp') {
    // WhatsApp format: phone number with country code
    const whatsappRegex = /^\d{10,15}$/;
    if (!whatsappRegex.test(this.recipient.replace(/[^\d]/g, ''))) {
      return next(new Error('Invalid WhatsApp recipient format. Must be a valid phone number.'));
    }
  } else if (this.service === 'telegram') {
    // Telegram format: E.164 phone number (preferred), @username, or numeric chat ID
    const isPhone = /^\+?[1-9]\d{1,14}$/.test(this.recipient);
    const isUsername = /^@[a-zA-Z0-9_]{5,32}$/.test(this.recipient);
    const isId = /^\d+$/.test(this.recipient);
    if (!(isPhone || isUsername || isId)) {
      return next(new Error('Invalid Telegram recipient format. Must be a phone number, chat ID, or @username.'));
    }
  }

  next();
});

// Static methods
MessageSchema.statics.findByService = function (service: ServiceType) {
  return this.find({ service }).sort({ timestamp: -1 });
};

MessageSchema.statics.findByStatus = function (status: MessageStatus) {
  return this.find({ status }).sort({ timestamp: -1 });
};

MessageSchema.statics.findByRecipient = function (recipient: string) {
  return this.find({ recipient }).sort({ timestamp: -1 });
};

MessageSchema.statics.getMessageStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          service: '$service',
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.service',
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
          },
        },
        total: { $sum: '$count' },
      },
    },
  ]);
};

// Instance methods
MessageSchema.methods.markAsSent = function (messageId?: string) {
  this.status = 'sent';
  if (messageId) {
    this.messageId = messageId;
  }
  return this.save();
};

MessageSchema.methods.markAsFailed = function (errorMessage: string) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  return this.save();
};

MessageSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  // Remove sensitive information if needed
  return obj;
};

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export default Message;