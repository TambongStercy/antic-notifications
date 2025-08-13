import mongoose, { Schema, Document } from 'mongoose';
import { BaseRepository } from '@/database/repositories/BaseRepository';
import { PaginationOptions } from '@/types';

// Test model interface
interface ITestModel extends Document {
  name: string;
  value: number;
  createdAt: Date;
}

// Test schema
const TestSchema = new Schema<ITestModel>({
  name: { type: String, required: true },
  value: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Test model
const TestModel = mongoose.model<ITestModel>('TestModel', TestSchema);

// Test repository implementation
class TestRepository extends BaseRepository<ITestModel> {
  constructor() {
    super(TestModel);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;

  beforeEach(() => {
    repository = new TestRepository();
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const data = { name: 'test', value: 123 };
      const result = await repository.create(data);

      expect(result).toBeDefined();
      expect(result.name).toBe('test');
      expect(result.value).toBe(123);
      expect(result._id).toBeDefined();
    });

    it('should throw error for invalid data', async () => {
      const data = { value: 123 }; // Missing required name field

      await expect(repository.create(data)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      const created = await repository.create({ name: 'test', value: 123 });
      const found = await repository.findById(created._id.toString());

      expect(found).toBeDefined();
      expect(found!.name).toBe('test');
      expect(found!.value).toBe(123);
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await repository.findById(nonExistentId);

      expect(result).toBeNull();
    });

    it('should throw error for invalid ID format', async () => {
      await expect(repository.findById('invalid-id')).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should find one document by filter', async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 456 });

      const result = await repository.findOne({ name: 'test1' });

      expect(result).toBeDefined();
      expect(result!.name).toBe('test1');
      expect(result!.value).toBe(123);
    });

    it('should return null when no document matches', async () => {
      const result = await repository.findOne({ name: 'nonexistent' });

      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    beforeEach(async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 456 });
      await repository.create({ name: 'test3', value: 789 });
    });

    it('should find all documents when no filter provided', async () => {
      const results = await repository.find();

      expect(results).toHaveLength(3);
    });

    it('should find documents matching filter', async () => {
      const results = await repository.find({ value: { $gt: 200 } });

      expect(results).toHaveLength(2);
      expect(results.every(doc => doc.value > 200)).toBe(true);
    });

    it('should apply query options', async () => {
      const results = await repository.find({}, { limit: 2, sort: { value: -1 } });

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(789);
      expect(results[1].value).toBe(456);
    });
  });

  describe('findWithPagination', () => {
    beforeEach(async () => {
      // Create 10 test documents
      for (let i = 1; i <= 10; i++) {
        await repository.create({ name: `test${i}`, value: i * 100 });
      }
    });

    it('should return paginated results', async () => {
      const paginationOptions: PaginationOptions = {
        page: 1,
        limit: 3,
        sortBy: 'value',
        sortOrder: 'asc',
      };

      const result = await repository.findWithPagination({}, paginationOptions);

      expect(result.data).toHaveLength(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.pages).toBe(4);
      expect(result.data[0].value).toBe(100);
    });

    it('should return second page correctly', async () => {
      const paginationOptions: PaginationOptions = {
        page: 2,
        limit: 3,
        sortBy: 'value',
        sortOrder: 'asc',
      };

      const result = await repository.findWithPagination({}, paginationOptions);

      expect(result.data).toHaveLength(3);
      expect(result.data[0].value).toBe(400);
    });

    it('should handle empty results', async () => {
      const result = await repository.findWithPagination(
        { name: 'nonexistent' },
        { page: 1, limit: 10 }
      );

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });
  });

  describe('updateById', () => {
    it('should update document by ID', async () => {
      const created = await repository.create({ name: 'test', value: 123 });
      const updated = await repository.updateById(created._id.toString(), { value: 456 });

      expect(updated).toBeDefined();
      expect(updated!.value).toBe(456);
      expect(updated!.name).toBe('test');
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await repository.updateById(nonExistentId, { value: 456 });

      expect(result).toBeNull();
    });
  });

  describe('updateOne', () => {
    it('should update one document by filter', async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 123 });

      const updated = await repository.updateOne({ value: 123 }, { value: 456 });

      expect(updated).toBeDefined();
      expect(updated!.value).toBe(456);

      // Verify only one document was updated
      const allDocs = await repository.find({ value: 456 });
      expect(allDocs).toHaveLength(1);
    });
  });

  describe('updateMany', () => {
    it('should update multiple documents', async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 123 });
      await repository.create({ name: 'test3', value: 456 });

      const result = await repository.updateMany({ value: 123 }, { value: 999 });

      expect(result.matchedCount).toBe(2);
      expect(result.modifiedCount).toBe(2);

      const updatedDocs = await repository.find({ value: 999 });
      expect(updatedDocs).toHaveLength(2);
    });
  });

  describe('deleteById', () => {
    it('should delete document by ID', async () => {
      const created = await repository.create({ name: 'test', value: 123 });
      const deleted = await repository.deleteById(created._id.toString());

      expect(deleted).toBeDefined();
      expect(deleted!.name).toBe('test');

      const found = await repository.findById(created._id.toString());
      expect(found).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await repository.deleteById(nonExistentId);

      expect(result).toBeNull();
    });
  });

  describe('deleteOne', () => {
    it('should delete one document by filter', async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 123 });

      const deleted = await repository.deleteOne({ value: 123 });

      expect(deleted).toBeDefined();

      const remaining = await repository.find({ value: 123 });
      expect(remaining).toHaveLength(1);
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple documents', async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 123 });
      await repository.create({ name: 'test3', value: 456 });

      const result = await repository.deleteMany({ value: 123 });

      expect(result.deletedCount).toBe(2);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].value).toBe(456);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await repository.create({ name: 'test1', value: 123 });
      await repository.create({ name: 'test2', value: 456 });
      await repository.create({ name: 'test3', value: 123 });
    });

    it('should count all documents when no filter provided', async () => {
      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('should count documents matching filter', async () => {
      const count = await repository.count({ value: 123 });

      expect(count).toBe(2);
    });

    it('should return 0 for no matches', async () => {
      const count = await repository.count({ value: 999 });

      expect(count).toBe(0);
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await repository.create({ name: 'test', value: 123 });
    });

    it('should return true when document exists', async () => {
      const exists = await repository.exists({ name: 'test' });

      expect(exists).toBe(true);
    });

    it('should return false when document does not exist', async () => {
      const exists = await repository.exists({ name: 'nonexistent' });

      expect(exists).toBe(false);
    });
  });
});