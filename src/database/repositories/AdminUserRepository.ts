import { BaseRepository } from './BaseRepository';
import { AdminUser, IAdminUser } from '@/database/models/AdminUser';
import { PaginationOptions, PaginatedResponse } from '@/types';
import logger from '@/utils/logger';
import mongoose from 'mongoose';

export interface AdminUserFilters {
  username?: string;
  role?: 'admin';
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface CreateAdminUserData {
  username: string;
  password: string;
  role?: 'admin';
}

export interface UpdateAdminUserData {
  username?: string;
  role?: 'admin';
}

export class AdminUserRepository extends BaseRepository<IAdminUser> {
  constructor() {
    super(AdminUser);
  }

  /**
   * Find admin user by username (includes password hash for authentication)
   */
  async findByUsername(username: string): Promise<IAdminUser | null> {
    try {
      return await AdminUser.findOne({ username: username.toLowerCase() })
        .select('+passwordHash')
        .exec();
    } catch (error) {
      logger.error(`Error finding admin user by username ${username}:`, error);
      throw error;
    }
  }

  /**
   * Find admin user by username (safe - no password hash)
   */
  async findByUsernameSafe(username: string): Promise<IAdminUser | null> {
    try {
      return await this.findOne({ username: username.toLowerCase() });
    } catch (error) {
      logger.error(`Error finding admin user by username ${username}:`, error);
      throw error;
    }
  }

  /**
   * Create a new admin user
   */
  async createAdmin(userData: CreateAdminUserData): Promise<IAdminUser> {
    try {
      const { username, password, role = 'admin' } = userData;

      // Check if username already exists
      const existingUser = await this.findByUsernameSafe(username);
      if (existingUser) {
        throw new Error(`Admin user with username '${username}' already exists`);
      }

      // Validate password strength
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      if (username.length < 3 || username.length > 50) {
        throw new Error('Username must be between 3 and 50 characters long');
      }

      const adminUser = await this.create({
        username: username.toLowerCase(),
        passwordHash: password, // Will be hashed by pre-save middleware
        role,
        createdAt: new Date(),
      } as Partial<IAdminUser>);

      logger.info(`Created new admin user: ${username}`);
      return adminUser;
    } catch (error) {
      logger.error('Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Authenticate admin user
   */
  async authenticate(username: string, password: string): Promise<IAdminUser | null> {
    try {
      const user = await this.findByUsername(username);
      
      if (!user) {
        logger.warn(`Authentication failed: User ${username} not found`);
        return null;
      }

      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        logger.warn(`Authentication failed: Invalid password for user ${username}`);
        return null;
      }

      // Update last login
      await this.updateLastLogin(user._id);
      
      logger.info(`User ${username} authenticated successfully`);
      return user;
    } catch (error) {
      logger.error(`Error authenticating user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: mongoose.Types.ObjectId): Promise<IAdminUser | null> {
    try {
      return await this.updateById(userId.toString(), {
        lastLogin: new Date(),
      });
    } catch (error) {
      logger.error(`Error updating last login for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<IAdminUser> {
    try {
      // Validate new password
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Find user with password hash
      const user = await AdminUser.findById(userId).select('+passwordHash').exec();
      
      if (!user) {
        throw new Error('Admin user not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      const updatedUser = await user.save();

      logger.info(`Password changed for user ${user.username}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error changing password for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(userId: string, newPassword: string): Promise<IAdminUser> {
    try {
      // Validate new password
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      const user = await AdminUser.findById(userId).exec();
      
      if (!user) {
        throw new Error('Admin user not found');
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      const updatedUser = await user.save();

      logger.info(`Password reset for user ${user.username}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error resetting password for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update admin user data
   */
  async updateAdminUser(
    userId: string,
    updateData: UpdateAdminUserData
  ): Promise<IAdminUser | null> {
    try {
      const { username, role } = updateData;
      const update: any = {};

      if (username) {
        // Validate username format
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }

        if (username.length < 3 || username.length > 50) {
          throw new Error('Username must be between 3 and 50 characters long');
        }

        // Check if username is already taken by another user
        const existingUser = await this.findByUsernameSafe(username);
        if (existingUser && existingUser._id.toString() !== userId) {
          throw new Error(`Username '${username}' is already taken`);
        }

        update.username = username.toLowerCase();
      }

      if (role) {
        update.role = role;
      }

      const updatedUser = await this.updateById(userId, update);
      
      if (updatedUser) {
        logger.info(`Updated admin user ${updatedUser.username}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error(`Error updating admin user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Find admin users with filters and pagination
   */
  async findWithFilters(
    filters: AdminUserFilters,
    paginationOptions: PaginationOptions
  ): Promise<PaginatedResponse<IAdminUser>> {
    try {
      const query = this.buildFilterQuery(filters);
      return await this.findWithPagination(query, paginationOptions);
    } catch (error) {
      logger.error('Error finding admin users with filters:', error);
      throw error;
    }
  }

  /**
   * Get admin user statistics
   */
  async getAdminStats(): Promise<{
    totalAdmins: number;
    activeAdmins: number; // Logged in within last 30 days
    recentlyCreated: number; // Created within last 7 days
  }> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [totalAdmins, activeAdmins, recentlyCreated] = await Promise.all([
        this.count(),
        this.count({ lastLogin: { $gte: thirtyDaysAgo } }),
        this.count({ createdAt: { $gte: sevenDaysAgo } }),
      ]);

      return {
        totalAdmins,
        activeAdmins,
        recentlyCreated,
      };
    } catch (error) {
      logger.error('Error getting admin statistics:', error);
      throw error;
    }
  }

  /**
   * Get recently active admin users
   */
  async getRecentlyActive(limit: number = 10): Promise<IAdminUser[]> {
    try {
      return await this.find(
        { lastLogin: { $exists: true } },
        {
          sort: { lastLogin: -1 },
          limit,
        }
      );
    } catch (error) {
      logger.error('Error getting recently active admin users:', error);
      throw error;
    }
  }

  /**
   * Check if any admin users exist
   */
  async hasAnyAdmins(): Promise<boolean> {
    try {
      return await this.exists({});
    } catch (error) {
      logger.error('Error checking if any admin users exist:', error);
      throw error;
    }
  }

  /**
   * Create initial admin user if none exist
   */
  async createInitialAdminIfNeeded(
    username: string = 'admin',
    password: string = 'admin123'
  ): Promise<IAdminUser | null> {
    try {
      const hasAdmins = await this.hasAnyAdmins();
      
      if (!hasAdmins) {
        logger.warn('No admin users found. Creating initial admin user.');
        const initialAdmin = await this.createAdmin({
          username,
          password,
          role: 'admin',
        });
        
        logger.warn(`Initial admin user created with username: ${username}`);
        logger.warn('Please change the default password immediately!');
        
        return initialAdmin;
      }

      return null;
    } catch (error) {
      logger.error('Error creating initial admin user:', error);
      throw error;
    }
  }

  /**
   * Delete admin user (with safety checks)
   */
  async deleteAdminUser(userId: string): Promise<IAdminUser | null> {
    try {
      // Check if this is the last admin user
      const totalAdmins = await this.count();
      
      if (totalAdmins <= 1) {
        throw new Error('Cannot delete the last admin user');
      }

      const deletedUser = await this.deleteById(userId);
      
      if (deletedUser) {
        logger.info(`Deleted admin user: ${deletedUser.username}`);
      }

      return deletedUser;
    } catch (error) {
      logger.error(`Error deleting admin user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Build MongoDB filter query from AdminUserFilters
   */
  private buildFilterQuery(filters: AdminUserFilters): any {
    const query: any = {};

    if (filters.username) {
      query.username = { $regex: filters.username, $options: 'i' };
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.createdAfter || filters.createdBefore) {
      query.createdAt = {};
      if (filters.createdAfter) {
        query.createdAt.$gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        query.createdAt.$lte = filters.createdBefore;
      }
    }

    if (filters.lastLoginAfter || filters.lastLoginBefore) {
      query.lastLogin = {};
      if (filters.lastLoginAfter) {
        query.lastLogin.$gte = filters.lastLoginAfter;
      }
      if (filters.lastLoginBefore) {
        query.lastLogin.$lte = filters.lastLoginBefore;
      }
    }

    return query;
  }

  /**
   * Validate admin user data
   */
  private validateAdminUserData(data: CreateAdminUserData | UpdateAdminUserData): void {
    if ('username' in data && data.username) {
      if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      if (data.username.length < 3 || data.username.length > 50) {
        throw new Error('Username must be between 3 and 50 characters long');
      }
    }

    if ('password' in data && data.password) {
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
    }
  }
}

export default AdminUserRepository;