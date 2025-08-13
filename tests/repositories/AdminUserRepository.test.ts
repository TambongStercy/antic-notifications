import mongoose from 'mongoose';
import { AdminUserRepository, AdminUserFilters, CreateAdminUserData, UpdateAdminUserData } from '@/database/repositories/AdminUserRepository';
import { AdminUser, IAdminUser } from '@/database/models/AdminUser';
import { PaginationOptions } from '@/types';

describe('AdminUserRepository', () => {
  let repository: AdminUserRepository;

  beforeEach(() => {
    repository = new AdminUserRepository();
  });

  const createTestAdminUser = async (overrides: Partial<CreateAdminUserData> = {}): Promise<IAdminUser> => {
    const defaultData: CreateAdminUserData = {
      username: 'testadmin',
      password: 'password123',
      role: 'admin',
      ...overrides,
    };
    return await repository.createAdmin(defaultData);
  };

  describe('createAdmin', () => {
    it('should create a new admin user', async () => {
      const userData: CreateAdminUserData = {
        username: 'newadmin',
        password: 'password123',
        role: 'admin',
      };

      const result = await repository.createAdmin(userData);

      expect(result).toBeDefined();
      expect(result.username).toBe('newadmin');
      expect(result.role).toBe('admin');
      expect(result.createdAt).toBeDefined();
      expect(result.passwordHash).toBeDefined();
    });

    it('should convert username to lowercase', async () => {
      const userData: CreateAdminUserData = {
        username: 'NewAdmin',
        password: 'password123',
      };

      const result = await repository.createAdmin(userData);

      expect(result.username).toBe('newadmin');
    });

    it('should throw error for duplicate username', async () => {
      await createTestAdminUser({ username: 'duplicate' });

      const userData: CreateAdminUserData = {
        username: 'duplicate',
        password: 'password123',
      };

      await expect(repository.createAdmin(userData)).rejects.toThrow('already exists');
    });

    it('should throw error for short password', async () => {
      const userData: CreateAdminUserData = {
        username: 'testuser',
        password: '123',
      };

      await expect(repository.createAdmin(userData)).rejects.toThrow('at least 6 characters');
    });

    it('should throw error for invalid username format', async () => {
      const userData: CreateAdminUserData = {
        username: 'test@user',
        password: 'password123',
      };

      await expect(repository.createAdmin(userData)).rejects.toThrow('letters, numbers, and underscores');
    });

    it('should throw error for username too short', async () => {
      const userData: CreateAdminUserData = {
        username: 'ab',
        password: 'password123',
      };

      await expect(repository.createAdmin(userData)).rejects.toThrow('between 3 and 50 characters');
    });

    it('should throw error for username too long', async () => {
      const userData: CreateAdminUserData = {
        username: 'a'.repeat(51),
        password: 'password123',
      };

      await expect(repository.createAdmin(userData)).rejects.toThrow('between 3 and 50 characters');
    });
  });

  describe('findByUsername', () => {
    beforeEach(async () => {
      await createTestAdminUser({ username: 'testuser' });
    });

    it('should find admin user by username with password hash', async () => {
      const result = await repository.findByUsername('testuser');

      expect(result).toBeDefined();
      expect(result!.username).toBe('testuser');
      expect(result!.passwordHash).toBeDefined();
    });

    it('should be case insensitive', async () => {
      const result = await repository.findByUsername('TestUser');

      expect(result).toBeDefined();
      expect(result!.username).toBe('testuser');
    });

    it('should return null for non-existent user', async () => {
      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUsernameSafe', () => {
    beforeEach(async () => {
      await createTestAdminUser({ username: 'testuser' });
    });

    it('should find admin user by username without password hash', async () => {
      const result = await repository.findByUsernameSafe('testuser');

      expect(result).toBeDefined();
      expect(result!.username).toBe('testuser');
      expect(result!.passwordHash).toBeUndefined();
    });
  });

  describe('authenticate', () => {
    beforeEach(async () => {
      await createTestAdminUser({ username: 'testuser', password: 'correctpassword' });
    });

    it('should authenticate user with correct credentials', async () => {
      const result = await repository.authenticate('testuser', 'correctpassword');

      expect(result).toBeDefined();
      expect(result!.username).toBe('testuser');
    });

    it('should return null for incorrect password', async () => {
      const result = await repository.authenticate('testuser', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const result = await repository.authenticate('nonexistent', 'password');

      expect(result).toBeNull();
    });

    it('should update last login on successful authentication', async () => {
      const beforeAuth = new Date();
      const result = await repository.authenticate('testuser', 'correctpassword');

      expect(result).toBeDefined();
      
      // Check that lastLogin was updated
      const updatedUser = await repository.findByUsernameSafe('testuser');
      expect(updatedUser!.lastLogin).toBeDefined();
      expect(updatedUser!.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeAuth.getTime());
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const user = await createTestAdminUser();
      const beforeUpdate = new Date();
      
      const result = await repository.updateLastLogin(user._id);

      expect(result).toBeDefined();
      expect(result!.lastLogin).toBeDefined();
      expect(result!.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('changePassword', () => {
    let testUser: IAdminUser;

    beforeEach(async () => {
      testUser = await createTestAdminUser({ password: 'oldpassword' });
    });

    it('should change password with correct current password', async () => {
      const result = await repository.changePassword(
        testUser._id.toString(),
        'oldpassword',
        'newpassword123'
      );

      expect(result).toBeDefined();
      
      // Verify new password works
      const authResult = await repository.authenticate(testUser.username, 'newpassword123');
      expect(authResult).toBeDefined();
    });

    it('should throw error for incorrect current password', async () => {
      await expect(
        repository.changePassword(testUser._id.toString(), 'wrongpassword', 'newpassword123')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for short new password', async () => {
      await expect(
        repository.changePassword(testUser._id.toString(), 'oldpassword', '123')
      ).rejects.toThrow('at least 6 characters');
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(
        repository.changePassword(nonExistentId, 'oldpassword', 'newpassword123')
      ).rejects.toThrow('Admin user not found');
    });
  });

  describe('resetPassword', () => {
    let testUser: IAdminUser;

    beforeEach(async () => {
      testUser = await createTestAdminUser({ password: 'oldpassword' });
    });

    it('should reset password without requiring current password', async () => {
      const result = await repository.resetPassword(testUser._id.toString(), 'newpassword123');

      expect(result).toBeDefined();
      
      // Verify new password works
      const authResult = await repository.authenticate(testUser.username, 'newpassword123');
      expect(authResult).toBeDefined();
    });

    it('should throw error for short new password', async () => {
      await expect(
        repository.resetPassword(testUser._id.toString(), '123')
      ).rejects.toThrow('at least 6 characters');
    });

    it('should throw error for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(
        repository.resetPassword(nonExistentId, 'newpassword123')
      ).rejects.toThrow('Admin user not found');
    });
  });

  describe('updateAdminUser', () => {
    let testUser: IAdminUser;

    beforeEach(async () => {
      testUser = await createTestAdminUser({ username: 'originaluser' });
    });

    it('should update username', async () => {
      const updateData: UpdateAdminUserData = { username: 'newusername' };
      const result = await repository.updateAdminUser(testUser._id.toString(), updateData);

      expect(result).toBeDefined();
      expect(result!.username).toBe('newusername');
    });

    it('should convert username to lowercase', async () => {
      const updateData: UpdateAdminUserData = { username: 'NewUserName' };
      const result = await repository.updateAdminUser(testUser._id.toString(), updateData);

      expect(result!.username).toBe('newusername');
    });

    it('should throw error for duplicate username', async () => {
      await createTestAdminUser({ username: 'existinguser' });
      
      const updateData: UpdateAdminUserData = { username: 'existinguser' };
      
      await expect(
        repository.updateAdminUser(testUser._id.toString(), updateData)
      ).rejects.toThrow('already taken');
    });

    it('should allow updating to same username', async () => {
      const updateData: UpdateAdminUserData = { username: 'originaluser' };
      const result = await repository.updateAdminUser(testUser._id.toString(), updateData);

      expect(result).toBeDefined();
      expect(result!.username).toBe('originaluser');
    });

    it('should throw error for invalid username format', async () => {
      const updateData: UpdateAdminUserData = { username: 'invalid@username' };
      
      await expect(
        repository.updateAdminUser(testUser._id.toString(), updateData)
      ).rejects.toThrow('letters, numbers, and underscores');
    });
  });

  describe('findWithFilters', () => {
    beforeEach(async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await createTestAdminUser({ username: 'user1' });
      await createTestAdminUser({ username: 'user2' });
      
      // Update one user's last login
      const user1 = await repository.findByUsernameSafe('user1');
      await repository.updateLastLogin(user1!._id);
    });

    it('should filter by username', async () => {
      const filters: AdminUserFilters = { username: 'user1' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].username).toBe('user1');
    });

    it('should filter by role', async () => {
      const filters: AdminUserFilters = { role: 'admin' };
      const paginationOptions: PaginationOptions = { page: 1, limit: 10 };

      const result = await repository.findWithFilters(filters, paginationOptions);

      expect(result.data).toHaveLength(2);
      expect(result.data.every(user => user.role === 'admin')).toBe(true);
    });
  });

  describe('getAdminStats', () => {
    beforeEach(async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const oldDate = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      // Create users with different creation and login dates
      const user1 = await createTestAdminUser({ username: 'user1' });
      const user2 = await createTestAdminUser({ username: 'user2' });
      const user3 = await createTestAdminUser({ username: 'user3' });

      // Update creation dates manually
      await AdminUser.findByIdAndUpdate(user1._id, { createdAt: recentDate });
      await AdminUser.findByIdAndUpdate(user2._id, { createdAt: oldDate });

      // Update last login for some users
      await repository.updateLastLogin(user1._id);
      await AdminUser.findByIdAndUpdate(user2._id, { lastLogin: oldDate });
    });

    it('should return correct admin statistics', async () => {
      const stats = await repository.getAdminStats();

      expect(stats.totalAdmins).toBe(3);
      expect(stats.activeAdmins).toBe(1); // Only user1 has recent login
      expect(stats.recentlyCreated).toBe(1); // Only user1 was created recently
    });
  });

  describe('getRecentlyActive', () => {
    beforeEach(async () => {
      const user1 = await createTestAdminUser({ username: 'user1' });
      const user2 = await createTestAdminUser({ username: 'user2' });
      const user3 = await createTestAdminUser({ username: 'user3' });

      // Update last login with different times
      await AdminUser.findByIdAndUpdate(user1._id, { 
        lastLogin: new Date(Date.now() - 1000) 
      });
      await AdminUser.findByIdAndUpdate(user2._id, { 
        lastLogin: new Date(Date.now() - 2000) 
      });
      // user3 has no lastLogin
    });

    it('should return recently active users ordered by last login', async () => {
      const result = await repository.getRecentlyActive(5);

      expect(result).toHaveLength(2); // Only users with lastLogin
      expect(result[0].username).toBe('user1'); // Most recent
      expect(result[1].username).toBe('user2');
    });

    it('should respect limit parameter', async () => {
      const result = await repository.getRecentlyActive(1);

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user1');
    });
  });

  describe('hasAnyAdmins', () => {
    it('should return true when admin users exist', async () => {
      await createTestAdminUser();
      const result = await repository.hasAnyAdmins();

      expect(result).toBe(true);
    });

    it('should return false when no admin users exist', async () => {
      const result = await repository.hasAnyAdmins();

      expect(result).toBe(false);
    });
  });

  describe('createInitialAdminIfNeeded', () => {
    it('should create initial admin when none exist', async () => {
      const result = await repository.createInitialAdminIfNeeded('initialadmin', 'initialpass');

      expect(result).toBeDefined();
      expect(result!.username).toBe('initialadmin');
      
      // Verify admin was created
      const hasAdmins = await repository.hasAnyAdmins();
      expect(hasAdmins).toBe(true);
    });

    it('should not create admin when admins already exist', async () => {
      await createTestAdminUser();
      const result = await repository.createInitialAdminIfNeeded();

      expect(result).toBeNull();
    });

    it('should use default credentials when none provided', async () => {
      const result = await repository.createInitialAdminIfNeeded();

      expect(result).toBeDefined();
      expect(result!.username).toBe('admin');
      
      // Verify default password works
      const authResult = await repository.authenticate('admin', 'admin123');
      expect(authResult).toBeDefined();
    });
  });

  describe('deleteAdminUser', () => {
    it('should delete admin user', async () => {
      const user1 = await createTestAdminUser({ username: 'user1' });
      const user2 = await createTestAdminUser({ username: 'user2' });

      const result = await repository.deleteAdminUser(user1._id.toString());

      expect(result).toBeDefined();
      expect(result!.username).toBe('user1');

      const found = await repository.findByUsernameSafe('user1');
      expect(found).toBeNull();
    });

    it('should throw error when trying to delete last admin', async () => {
      const user = await createTestAdminUser();

      await expect(
        repository.deleteAdminUser(user._id.toString())
      ).rejects.toThrow('Cannot delete the last admin user');
    });

    it('should return null for non-existent user', async () => {
      await createTestAdminUser(); // Ensure we have at least one admin
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      const result = await repository.deleteAdminUser(nonExistentId);

      expect(result).toBeNull();
    });
  });
});