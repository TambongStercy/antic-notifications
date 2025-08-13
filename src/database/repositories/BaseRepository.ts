import { Document, Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationOptions, PaginatedResponse } from '@/types';
import logger from '@/utils/logger';

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      logger.error(`Error creating document in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      return await this.model.findById(id).exec();
    } catch (error) {
      logger.error(`Error finding document by ID in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find one document by filter
   */
  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOne(filter).exec();
    } catch (error) {
      logger.error(`Error finding document in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find multiple documents by filter
   */
  async find(filter: FilterQuery<T> = {}, options?: QueryOptions): Promise<T[]> {
    try {
      return await this.model.find(filter, null, options).exec();
    } catch (error) {
      logger.error(`Error finding documents in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    filter: FilterQuery<T> = {},
    paginationOptions: PaginationOptions
  ): Promise<PaginatedResponse<T>> {
    try {
      const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = paginationOptions;
      const skip = (page - 1) * limit;

      const sortOptions: Record<string, 1 | -1> = {};
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const [data, total] = await Promise.all([
        this.model
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.model.countDocuments(filter).exec(),
      ]);

      const pages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      logger.error(`Error finding documents with pagination in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document by ID
   */
  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true, runValidators: true }
  ): Promise<T | null> {
    try {
      return await this.model.findByIdAndUpdate(id, update, options).exec();
    } catch (error) {
      logger.error(`Error updating document by ID in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update one document by filter
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions = { new: true, runValidators: true }
  ): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(filter, update, options).exec();
    } catch (error) {
      logger.error(`Error updating document in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: any
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    try {
      const result = await this.model.updateMany(filter, update, options).exec();
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      logger.error(`Error updating multiple documents in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document by ID
   */
  async deleteById(id: string): Promise<T | null> {
    try {
      return await this.model.findByIdAndDelete(id).exec();
    } catch (error) {
      logger.error(`Error deleting document by ID in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete one document by filter
   */
  async deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    try {
      return await this.model.findOneAndDelete(filter).exec();
    } catch (error) {
      logger.error(`Error deleting document in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<{ deletedCount: number }> {
    try {
      const result = await this.model.deleteMany(filter).exec();
      return { deletedCount: result.deletedCount };
    } catch (error) {
      logger.error(`Error deleting multiple documents in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents matching filter
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      logger.error(`Error counting documents in ${this.model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.exists(filter).exec();
      return result !== null;
    } catch (error) {
      logger.error(`Error checking document existence in ${this.model.modelName}:`, error);
      throw error;
    }
  }
}