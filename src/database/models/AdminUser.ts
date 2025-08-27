import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AdminUser as AdminUserType } from '@/types';
import { config } from '@/config/environment';

export interface IAdminUser extends Omit<AdminUserType, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  passwordHash: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): Omit<AdminUserType, 'passwordHash'>;
}

const AdminUserSchema = new Schema<IAdminUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_]+$/,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false, // Don't include by default
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin',
    required: true,
  },
  lastLogin: {
    type: Date,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

// Indexes
AdminUserSchema.index({ createdAt: -1 });
AdminUserSchema.index({ lastLogin: -1 });

// Virtual for id field
AdminUserSchema.virtual('id').get(function(this: IAdminUser) {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
AdminUserSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    // Remove MongoDB specific fields
    if (ret._id) delete ret._id;
    if (ret.__v !== undefined) delete ret.__v;
    // Remove sensitive data
    if (ret.passwordHash) delete ret.passwordHash;
    return ret;
  },
});

// Pre-save middleware for password hashing
AdminUserSchema.pre('save', async function(this: IAdminUser, next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Hash password with configured rounds
    const salt = await bcrypt.genSalt(config.security.bcryptRounds);
    this['passwordHash'] = await bcrypt.hash(this['passwordHash'], salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Pre-save validation
AdminUserSchema.pre('save', function(this: IAdminUser, next) {
  // Validate username format
  if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
    return next(new Error('Username can only contain letters, numbers, and underscores'));
  }

  // Ensure username is lowercase
  this.username = this.username.toLowerCase();

  next();
});

// Static methods
AdminUserSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase() }).select('+passwordHash');
};

AdminUserSchema.statics.createAdmin = async function(username: string, password: string) {
  // Validate password strength
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const admin = new this({
    username: username.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save middleware
    role: 'admin',
  });

  return admin.save();
};

AdminUserSchema.statics.updateLastLogin = function(userId: mongoose.Types.ObjectId) {
  return this.findByIdAndUpdate(
    userId,
    { lastLogin: new Date() },
    { new: true }
  );
};

AdminUserSchema.statics.changePassword = async function(
  userId: mongoose.Types.ObjectId,
  newPassword: string
) {
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const admin = await this.findById(userId);
  if (!admin) {
    throw new Error('Admin user not found');
  }

  admin['passwordHash'] = newPassword; // Will be hashed by pre-save middleware
  return admin['save']();
};

// Instance methods
AdminUserSchema.methods.comparePassword = async function(
  this: IAdminUser,
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

AdminUserSchema.methods.updateLastLogin = function(this: IAdminUser) {
  this['lastLogin'] = new Date();
  return this['save']();
};

AdminUserSchema.methods.toSafeObject = function(this: IAdminUser) {
  const obj = this['toObject']();
  if (obj.passwordHash) delete obj.passwordHash;
  return obj;
};

AdminUserSchema.methods.isValidPassword = function(password: string): boolean {
  return password.length >= 6;
};

export const AdminUser = mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

// Ensure indexes are created
AdminUserSchema.post('init', function() {
  // Create indexes manually
  AdminUser.createIndexes().catch(error => {
    console.warn('Failed to create indexes for AdminUser:', error);
  });
});

export default AdminUser;
