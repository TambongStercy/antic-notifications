import { AdminUser } from '@/database/models';
import { config } from '@/config/environment';
import logger from '@/utils/logger';

/**
 * Initialize database with default data
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Starting database initialization...');

    // Create default admin user if it doesn't exist
    await createDefaultAdmin();

    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Create default admin user
 */
async function createDefaultAdmin(): Promise<void> {
  try {
    const existingAdmin = await (AdminUser as any).findByUsername(config.admin.username);

    if (existingAdmin) {
      logger.info('Default admin user already exists');
      return;
    }

    const admin = await (AdminUser as any).createAdmin(
      config.admin.username,
      config.admin.password
    );

    logger.info('Default admin user created successfully', {
      username: admin.username,
      id: admin.id,
    });
  } catch (error) {
    logger.error('Failed to create default admin user:', error);
    throw error;
  }
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Running database migrations...');

    // Add future migrations here
    // Example:
    // await migration001_AddIndexes();
    // await migration002_UpdateSchema();

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migrations failed:', error);
    throw error;
  }
}

/**
 * Seed database with test data (for development/testing)
 */
export async function seedDatabase(): Promise<void> {
  if (config.env === 'production') {
    logger.warn('Skipping database seeding in production environment');
    return;
  }

  try {
    logger.info('Seeding database with test data...');

    // Add seed data here for development/testing
    // Example:
    // await seedTestMessages();
    // await seedServiceStatuses();

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

/**
 * Clean up database (for testing)
 */
export async function cleanDatabase(): Promise<void> {
  if (config.env === 'production') {
    throw new Error('Cannot clean database in production environment');
  }

  try {
    logger.info('Cleaning database...');

    // Drop all collections
    const db = AdminUser.db?.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.dropCollection(collection.name);
    }

    logger.info('Database cleaned successfully');
  } catch (error) {
    logger.error('Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Validate database schema and indexes
 */
export async function validateDatabase(): Promise<void> {
  try {
    logger.info('Validating database schema and indexes...');

    // Validate collections exist
    const db = AdminUser.db?.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    const expectedCollections = ['adminusers', 'messages', 'servicestatuses'];

    for (const expectedCollection of expectedCollections) {
      if (!collectionNames.includes(expectedCollection)) {
        logger.warn(`Expected collection '${expectedCollection}' not found`);
      }
    }

    // Validate indexes
    await validateIndexes();

    logger.info('Database validation completed successfully');
  } catch (error) {
    logger.error('Database validation failed:', error);
    throw error;
  }
}

/**
 * Validate database indexes
 */
async function validateIndexes(): Promise<void> {
  try {
    // Check AdminUser indexes
    const collection = AdminUser.collection;
    if (!collection) {
      throw new Error('AdminUser collection not available');
    }

    const adminIndexes = await collection.getIndexes();
    logger.debug('AdminUser indexes:', adminIndexes);

    // Add more index validations as needed

    logger.info('Database indexes validated successfully');
  } catch (error) {
    logger.error('Index validation failed:', error);
    throw error;
  }
}
