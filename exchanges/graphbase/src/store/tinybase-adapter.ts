import { createStore, type Store, type Tables, type Cell } from 'tinybase';
import type { EntityField } from '../types';
import type { InMemoryData } from './data';

/**
 * TinyBase Adapter for GraphBase
 *
 * This adapter integrates TinyBase with GraphBase's entity storage.
 * Each GraphQL entity type becomes a TinyBase table, and each entity
 * instance becomes a row in that table.
 */

let tinybaseStore: Store | null = null;

/**
 * Initialize or get the TinyBase store
 */
export const getTinyBaseStore = (): Store => {
  if (!tinybaseStore) {
    tinybaseStore = createStore();
  }
  return tinybaseStore;
};

/**
 * Reset the TinyBase store
 */
export const resetTinyBaseStore = (): void => {
  tinybaseStore = null;
};

/**
 * Parse entity key to extract typename and entity id
 * Entity keys are typically in the format: "TypeName:id" or just "TypeName"
 */
const parseEntityKey = (
  entityKey: string
): { typename: string; id: string } => {
  const colonIndex = entityKey.indexOf(':');
  if (colonIndex !== -1) {
    return {
      typename: entityKey.substring(0, colonIndex),
      id: entityKey.substring(colonIndex + 1),
    };
  }
  // For root query or entities without explicit IDs
  return { typename: entityKey, id: '__root' };
};

/**
 * Sync a single entity record to TinyBase
 *
 * @param entityKey - The entity key (e.g., "User:1")
 * @param fieldKey - The field name
 * @param value - The field value (scalar only)
 */
export const syncRecordToTinyBase = (
  entityKey: string,
  fieldKey: string,
  value: EntityField
): void => {
  const store = getTinyBaseStore();
  const { typename, id } = parseEntityKey(entityKey);

  // Only sync scalar values (not arrays or undefined)
  if (value === undefined || Array.isArray(value)) {
    return;
  }

  // Convert the value to a TinyBase-compatible type (Cell)
  // TinyBase accepts: string, number, boolean, or null
  let cellValue: Cell;
  if (typeof value === 'object' && value !== null) {
    // For ScalarObject, convert to string (JSON)
    cellValue = JSON.stringify(value);
  } else {
    cellValue = value as Cell;
  }

  // Set the cell in TinyBase
  // Table = typename, Row = entity id, Cell = field name
  store.setCell(typename, id, fieldKey, cellValue);
};

/**
 * Sync an entire entity to TinyBase
 *
 * @param entityKey - The entity key (e.g., "User:1")
 * @param fields - Object containing all field key-value pairs
 */
export const syncEntityToTinyBase = (
  entityKey: string,
  fields: Record<string, EntityField>
): void => {
  const store = getTinyBaseStore();
  const { typename, id } = parseEntityKey(entityKey);

  const row: Record<string, Cell> = {};

  // Convert all scalar fields to TinyBase format
  for (const [fieldKey, value] of Object.entries(fields)) {
    if (value !== undefined && !Array.isArray(value)) {
      if (typeof value === 'object' && value !== null) {
        // For ScalarObject, convert to string (JSON)
        row[fieldKey] = JSON.stringify(value);
      } else {
        row[fieldKey] = value as Cell;
      }
    }
  }

  // Set the entire row in TinyBase
  store.setRow(typename, id, row);
};

/**
 * Remove an entity from TinyBase
 *
 * @param entityKey - The entity key (e.g., "User:1")
 */
export const removeEntityFromTinyBase = (entityKey: string): void => {
  const store = getTinyBaseStore();
  const { typename, id } = parseEntityKey(entityKey);
  store.delRow(typename, id);
};

/**
 * Get all entities of a specific type from TinyBase
 *
 * @param typename - The GraphQL typename
 * @returns Object mapping entity IDs to their field data
 */
export const getEntitiesByType = (
  typename: string
): Record<string, Record<string, any>> => {
  const store = getTinyBaseStore();
  const table = store.getTable(typename);
  return table || {};
};

/**
 * Get a specific entity from TinyBase
 *
 * @param typename - The GraphQL typename
 * @param id - The entity ID
 * @returns The entity's field data or undefined if not found
 */
export const getEntity = (
  typename: string,
  id: string
): Record<string, any> | undefined => {
  const store = getTinyBaseStore();
  const row = store.getRow(typename, id);
  // TinyBase returns {} for non-existent rows, return undefined instead
  return Object.keys(row).length === 0 ? undefined : row;
};

/**
 * Get a specific field value from an entity
 *
 * @param typename - The GraphQL typename
 * @param id - The entity ID
 * @param fieldKey - The field name
 * @returns The field value or undefined if not found
 */
export const getEntityField = (
  typename: string,
  id: string,
  fieldKey: string
): any => {
  const store = getTinyBaseStore();
  return store.getCell(typename, id, fieldKey);
};

/**
 * Get all table names (typenames) in TinyBase
 *
 * @returns Array of table names
 */
export const getAllTypenames = (): string[] => {
  const store = getTinyBaseStore();
  return store.getTableIds();
};

/**
 * Get all TinyBase tables
 *
 * @returns All tables in the store
 */
export const getAllTables = (): Tables => {
  const store = getTinyBaseStore();
  return store.getTables();
};

/**
 * Hydrate TinyBase from GraphBase InMemoryData
 *
 * @param data - The GraphBase InMemoryData instance
 */
export const hydrateTinyBaseFromGraphBase = (data: InMemoryData): void => {
  const store = getTinyBaseStore();

  // Clear existing data
  store.delTables();

  // Iterate through all entities by type
  for (const [typename, entityKeys] of data.types.entries()) {
    for (const entityKey of entityKeys) {
      const { id } = parseEntityKey(entityKey);

      // Get all records for this entity from the base layer
      const entityRecords = data.records.base.get(entityKey);

      if (entityRecords) {
        const row: Record<string, Cell> = {};

        for (const [fieldKey, value] of Object.entries(entityRecords)) {
          if (value !== undefined && !Array.isArray(value)) {
            if (typeof value === 'object' && value !== null) {
              // For ScalarObject, convert to string (JSON)
              row[fieldKey] = JSON.stringify(value);
            } else {
              row[fieldKey] = value as Cell;
            }
          }
        }

        if (Object.keys(row).length > 0) {
          store.setRow(typename, id, row);
        }
      }
    }
  }
};

/**
 * Export the TinyBase store for external use
 * This allows consumers to use TinyBase APIs directly
 */
export const exportTinyBaseStore = () => getTinyBaseStore();
