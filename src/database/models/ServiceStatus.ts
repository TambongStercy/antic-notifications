import mongoose, { Schema, Document } from 'mongoose';
import { ServiceStatus, ServiceType, ConnectionStatus } from '@/types';

export interface IServiceStatus extends Omit<ServiceStatus, 'service'>, Document {
  _id: mongoose.Types.ObjectId;
  service: ServiceType;
}

const ServiceStatusSchema = new Schema<IServiceStatus>({
  service: {
    type: String,
    enum: ['whatsapp', 'telegram'] as ServiceType[],
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'authenticating'] as ConnectionStatus[],
    required: true,
    default: 'disconnected',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true,
  },
  metadata: {
    qrCode: {
      type: String,
      select: false, // Don't include by default for security
    },
    botToken: {
      type: String,
      select: false, // Don't include by default for security
    },
    // Store provider-specific credentials securely
    credentials: {
      type: Schema.Types.Mixed,
      select: false,
      default: undefined,
    },
    connectionInfo: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes
ServiceStatusSchema.index({ service: 1, status: 1 });
ServiceStatusSchema.index({ lastUpdated: -1 });

// Virtual for id field
ServiceStatusSchema.virtual('id').get(function (this: IServiceStatus) {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
ServiceStatusSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc, ret) {
    delete ret._id;
    delete ret.__v;
    // Remove sensitive data from JSON output
    if (ret.metadata?.botToken) {
      ret.metadata.botToken = '***';
    }
    return ret;
  },
});

// Pre-save middleware
ServiceStatusSchema.pre('save', function (this: IServiceStatus, next) {
  this.lastUpdated = new Date();
  next();
});

// Static methods
ServiceStatusSchema.statics.findByService = function (service: ServiceType) {
  return this.findOne({ service });
};

ServiceStatusSchema.statics.updateServiceStatus = function (
  service: ServiceType,
  status: ConnectionStatus,
  metadata?: Partial<IServiceStatus['metadata']>
) {
  return this.findOneAndUpdate(
    { service },
    {
      status,
      lastUpdated: new Date(),
      ...(metadata && { $set: { metadata } }),
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );
};

ServiceStatusSchema.statics.getAllStatuses = function () {
  return this.find({}).select('-metadata.qrCode -metadata.botToken');
};

ServiceStatusSchema.statics.getConnectedServices = function () {
  return this.find({ status: 'connected' }).select('service status lastUpdated');
};

// Instance methods
ServiceStatusSchema.methods.updateStatus = function (
  status: ConnectionStatus,
  metadata?: Partial<IServiceStatus['metadata']>
) {
  this.status = status;
  this.lastUpdated = new Date();

  if (metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  return this.save();
};

ServiceStatusSchema.methods.setQRCode = function (qrCode: string) {
  this.status = 'authenticating';
  this.metadata = { ...this.metadata, qrCode };
  this.lastUpdated = new Date();
  return this.save();
};

ServiceStatusSchema.methods.setBotToken = function (botToken: string) {
  this.metadata = { ...this.metadata, botToken };
  this.lastUpdated = new Date();
  return this.save();
};

ServiceStatusSchema.methods.clearSensitiveData = function () {
  if (this.metadata) {
    delete this.metadata.qrCode;
    delete this.metadata.botToken;
  }
  return this.save();
};

ServiceStatusSchema.methods.isConnected = function (): boolean {
  return this.status === 'connected';
};

ServiceStatusSchema.methods.isAuthenticating = function (): boolean {
  return this.status === 'authenticating';
};

ServiceStatusSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  // Remove sensitive information
  if (obj.metadata?.botToken) {
    obj.metadata.botToken = '***';
  }
  if (obj.metadata?.qrCode) {
    obj.metadata.qrCode = '[QR_CODE_PRESENT]';
  }
  return obj;
};

// Create indexes after model creation
ServiceStatusSchema.post('init', function () {
  // Ensure unique constraint
  this.constructor.createIndexes();
});

export const ServiceStatus = mongoose.model<IServiceStatus>('ServiceStatus', ServiceStatusSchema);
export default ServiceStatus;