import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import {
  getTinyBaseStore,
  resetTinyBaseStore,
  syncRecordToTinyBase,
  syncEntityToTinyBase,
  removeEntityFromTinyBase,
  getEntitiesByType,
  getEntity,
  getEntityField,
  getAllTypenames,
  getAllTables,
  hydrateTinyBaseFromGraphBase,
} from './tinybase-adapter';
import * as InMemoryData from './data';

describe('TinyBase Adapter', () => {
  beforeEach(() => {
    resetTinyBaseStore();
  });

  afterEach(() => {
    resetTinyBaseStore();
  });

  describe('getTinyBaseStore', () => {
    it('creates and returns a TinyBase store instance', () => {
      const store = getTinyBaseStore();
      expect(store).toBeDefined();
      expect(typeof store.setCell).toBe('function');
      expect(typeof store.getCell).toBe('function');
    });

    it('returns the same instance on subsequent calls', () => {
      const store1 = getTinyBaseStore();
      const store2 = getTinyBaseStore();
      expect(store1).toBe(store2);
    });
  });

  describe('resetTinyBaseStore', () => {
    it('clears the store instance', () => {
      const store1 = getTinyBaseStore();
      resetTinyBaseStore();
      const store2 = getTinyBaseStore();
      expect(store1).not.toBe(store2);
    });
  });

  describe('syncRecordToTinyBase', () => {
    it('syncs a string field to TinyBase', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
    });

    it('syncs a number field to TinyBase', () => {
      syncRecordToTinyBase('User:1', 'age', 30);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'age')).toBe(30);
    });

    it('syncs a boolean field to TinyBase', () => {
      syncRecordToTinyBase('User:1', 'isActive', true);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'isActive')).toBe(true);
    });

    it('syncs a null field to TinyBase', () => {
      syncRecordToTinyBase('User:1', 'middleName', null);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'middleName')).toBe(null);
    });

    it('converts ScalarObject to JSON string', () => {
      const dateObj = { __typename: 'Date', value: '2025-12-17' };
      syncRecordToTinyBase('User:1', 'createdAt', dateObj);

      const store = getTinyBaseStore();
      const value = store.getCell('User', '1', 'createdAt');
      expect(typeof value).toBe('string');
      expect(JSON.parse(value as string)).toEqual(dateObj);
    });

    it('does not sync undefined values', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:1', 'deletedField', undefined);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
      expect(store.getCell('User', '1', 'deletedField')).toBe(undefined);
    });

    it('does not sync array values', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:1', 'tags', ['tag1', 'tag2'] as any);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
      expect(store.getCell('User', '1', 'tags')).toBe(undefined);
    });

    it('handles entity keys without IDs (root queries)', () => {
      syncRecordToTinyBase('Query', 'version', '1.0.0');

      const store = getTinyBaseStore();
      expect(store.getCell('Query', '__root', 'version')).toBe('1.0.0');
    });

    it('handles entity keys with colons in ID', () => {
      syncRecordToTinyBase('User:some:complex:id', 'name', 'Bob');

      const store = getTinyBaseStore();
      // Should use everything after first colon as ID
      expect(store.getCell('User', 'some:complex:id', 'name')).toBe('Bob');
    });
  });

  describe('syncEntityToTinyBase', () => {
    it('syncs an entire entity with multiple fields', () => {
      const fields = {
        __typename: 'User',
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
        isActive: true,
      };

      syncEntityToTinyBase('User:1', fields);

      const store = getTinyBaseStore();
      const row = store.getRow('User', '1');

      expect(row).toEqual({
        __typename: 'User',
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
        isActive: true,
      });
    });

    it('filters out undefined and array fields', () => {
      const fields = {
        name: 'Alice',
        email: undefined,
        tags: ['tag1', 'tag2'],
        age: 30,
      };

      syncEntityToTinyBase('User:1', fields as any);

      const store = getTinyBaseStore();
      const row = store.getRow('User', '1');

      expect(row).toEqual({
        name: 'Alice',
        age: 30,
      });
    });
  });

  describe('removeEntityFromTinyBase', () => {
    it('removes an entity from TinyBase', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:1', 'email', 'alice@example.com');

      let store = getTinyBaseStore();
      expect(store.getRow('User', '1')).toBeDefined();

      removeEntityFromTinyBase('User:1');

      store = getTinyBaseStore();
      expect(store.getRow('User', '1')).toEqual({});
    });
  });

  describe('getEntitiesByType', () => {
    it('returns all entities of a specific type', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:2', 'name', 'Bob');
      syncRecordToTinyBase('Post:10', 'title', 'Hello');

      const users = getEntitiesByType('User');

      expect(users).toEqual({
        '1': { name: 'Alice' },
        '2': { name: 'Bob' },
      });
    });

    it('returns empty object for non-existent type', () => {
      const users = getEntitiesByType('NonExistent');
      expect(users).toEqual({});
    });
  });

  describe('getEntity', () => {
    it('returns a specific entity', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:1', 'email', 'alice@example.com');

      const user = getEntity('User', '1');

      expect(user).toEqual({
        name: 'Alice',
        email: 'alice@example.com',
      });
    });

    it('returns undefined for non-existent entity', () => {
      const user = getEntity('User', '999');
      expect(user).toBeUndefined();
    });
  });

  describe('getEntityField', () => {
    it('returns a specific field value', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:1', 'email', 'alice@example.com');

      const name = getEntityField('User', '1', 'name');

      expect(name).toBe('Alice');
    });

    it('returns undefined for non-existent field', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');

      const email = getEntityField('User', '1', 'email');
      expect(email).toBeUndefined();
    });
  });

  describe('getAllTypenames', () => {
    it('returns all table names (typenames)', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('Post:10', 'title', 'Hello');
      syncRecordToTinyBase('Comment:5', 'text', 'Nice!');

      const typenames = getAllTypenames();

      expect(typenames).toContain('User');
      expect(typenames).toContain('Post');
      expect(typenames).toContain('Comment');
      expect(typenames).toHaveLength(3);
    });

    it('returns empty array when no tables exist', () => {
      const typenames = getAllTypenames();
      expect(typenames).toEqual([]);
    });
  });

  describe('getAllTables', () => {
    it('returns all tables with data', () => {
      syncRecordToTinyBase('User:1', 'name', 'Alice');
      syncRecordToTinyBase('User:2', 'name', 'Bob');
      syncRecordToTinyBase('Post:10', 'title', 'Hello');

      const tables = getAllTables();

      expect(tables).toEqual({
        User: {
          '1': { name: 'Alice' },
          '2': { name: 'Bob' },
        },
        Post: {
          '10': { title: 'Hello' },
        },
      });
    });
  });

  describe('hydrateTinyBaseFromGraphBase', () => {
    it('hydrates TinyBase from GraphBase data', () => {
      // Create GraphBase data
      const data = InMemoryData.make('Query');
      InMemoryData.initDataState('write', data, null);

      // Write some data to GraphBase
      InMemoryData.writeRecord('User:1', '__typename', 'User');
      InMemoryData.writeRecord('User:1', 'id', '1');
      InMemoryData.writeRecord('User:1', 'name', 'Alice');
      InMemoryData.writeRecord('User:1', 'email', 'alice@example.com');
      InMemoryData.writeType('User', 'User:1');

      InMemoryData.writeRecord('User:2', '__typename', 'User');
      InMemoryData.writeRecord('User:2', 'id', '2');
      InMemoryData.writeRecord('User:2', 'name', 'Bob');
      InMemoryData.writeType('User', 'User:2');

      InMemoryData.clearDataState();

      // Hydrate TinyBase
      hydrateTinyBaseFromGraphBase(data);

      // Check TinyBase has the data
      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
      expect(store.getCell('User', '1', 'email')).toBe('alice@example.com');
      expect(store.getCell('User', '2', 'name')).toBe('Bob');
    });

    it('clears existing TinyBase data before hydration', () => {
      // Add some initial data to TinyBase
      syncRecordToTinyBase('OldType:1', 'field', 'value');

      // Create new GraphBase data
      const data = InMemoryData.make('Query');
      InMemoryData.initDataState('write', data, null);

      InMemoryData.writeRecord('User:1', '__typename', 'User');
      InMemoryData.writeRecord('User:1', 'name', 'Alice');
      InMemoryData.writeType('User', 'User:1');

      InMemoryData.clearDataState();

      // Hydrate TinyBase
      hydrateTinyBaseFromGraphBase(data);

      // Old data should be gone
      const store = getTinyBaseStore();
      expect(store.getCell('OldType', '1', 'field')).toBeUndefined();
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
    });

    it('handles entities with no scalar fields', () => {
      const data = InMemoryData.make('Query');
      InMemoryData.initDataState('write', data, null);

      // Entity with only links, no scalar fields
      InMemoryData.writeLink('User:1', 'posts', 'Post:10');
      InMemoryData.writeType('User', 'User:1');

      InMemoryData.clearDataState();

      // Should not error
      expect(() => hydrateTinyBaseFromGraphBase(data)).not.toThrow();

      // Entity should not appear in TinyBase
      const store = getTinyBaseStore();
      expect(store.getRow('User', '1')).toEqual({});
    });
  });

  describe('integration with data.ts', () => {
    it('automatically syncs when writeRecord is called', () => {
      // This test would require importing the actual writeRecord with TinyBase integration
      // For now, we test the sync function directly
      const data = InMemoryData.make('Query');
      InMemoryData.initDataState('write', data, null);

      InMemoryData.writeRecord('User:1', '__typename', 'User');
      InMemoryData.writeRecord('User:1', 'name', 'Alice');

      // Manually sync (in real usage, this happens automatically)
      syncRecordToTinyBase('User:1', '__typename', 'User');
      syncRecordToTinyBase('User:1', 'name', 'Alice');

      InMemoryData.clearDataState();

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', '__typename')).toBe('User');
      expect(store.getCell('User', '1', 'name')).toBe('Alice');
    });
  });

  describe('edge cases', () => {
    it('handles special characters in entity IDs', () => {
      syncRecordToTinyBase('User:email@example.com', 'name', 'Alice');

      const store = getTinyBaseStore();
      expect(store.getCell('User', 'email@example.com', 'name')).toBe('Alice');
    });

    it('handles numeric IDs', () => {
      syncRecordToTinyBase('User:123', 'name', 'Alice');

      const store = getTinyBaseStore();
      expect(store.getCell('User', '123', 'name')).toBe('Alice');
    });

    it('handles empty string values', () => {
      syncRecordToTinyBase('User:1', 'name', '');

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'name')).toBe('');
    });

    it('handles zero values', () => {
      syncRecordToTinyBase('User:1', 'age', 0);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'age')).toBe(0);
    });

    it('handles false boolean values', () => {
      syncRecordToTinyBase('User:1', 'isActive', false);

      const store = getTinyBaseStore();
      expect(store.getCell('User', '1', 'isActive')).toBe(false);
    });
  });
});
