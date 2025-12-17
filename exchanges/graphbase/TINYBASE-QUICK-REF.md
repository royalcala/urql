# TinyBase Integration - Quick Reference

## Installation

```bash
npm install exchange-graphbase
# or
pnpm add exchange-graphbase
```

TinyBase is automatically installed as a dependency.

## Basic Usage

```typescript
import { cacheExchange, getTinyBaseStore } from 'exchange-graphbase';

// Get the TinyBase store
const store = getTinyBaseStore();

// Access data
const users = store.getTable('User'); // All users
const user = store.getRow('User', '1'); // Specific user
const name = store.getCell('User', '1', 'name'); // Specific field
```

## Helper Functions

```typescript
import {
  getEntitiesByType, // Get all entities of a type
  getEntity, // Get a specific entity
  getEntityField, // Get a specific field value
  getAllTypenames, // Get all type names (table names)
  getAllTables, // Get all tables
  hydrateTinyBaseFromGraphBase, // Manual hydration
  exportTinyBaseStore, // Export store for external use
} from 'exchange-graphbase';

// Examples
const allUsers = getEntitiesByType('User');
const user = getEntity('User', '1');
const userName = getEntityField('User', '1', 'name');
const types = getAllTypenames(); // ['User', 'Post', ...]
```

## React Hooks (from TinyBase)

```typescript
import { useRow, useCell, useTable } from 'tinybase/ui-react';
import { getTinyBaseStore } from 'exchange-graphbase';

const store = getTinyBaseStore();

// In your component
const user = useRow('User', userId, store); // Re-render on any field change
const name = useCell('User', userId, 'name', store); // Re-render only when name changes
const users = useTable('User', store); // Re-render when table changes
```

## Queries (Filtering)

```typescript
import { createQueries } from 'tinybase';
import { useResultTable } from 'tinybase/ui-react';
import { getTinyBaseStore } from 'exchange-graphbase';

const store = getTinyBaseStore();
const queries = createQueries(store);

// Define a query
queries.setQueryDefinition('activeUsers', 'User', ({ select, where }) => {
  select('name');
  select('email');
  where('isActive', true);
});

// Use in React
const activeUsers = useResultTable('activeUsers', queries);
```

## Indexes (Fast Lookups)

```typescript
import { createIndexes } from 'tinybase';
import { getTinyBaseStore } from 'exchange-graphbase';

const store = getTinyBaseStore();
const indexes = createIndexes(store);

// Create index
indexes.setIndexDefinition('usersByEmail', 'User', 'email');

// Fast lookup
const userIds = indexes.getSliceRowIds('usersByEmail', 'alice@example.com');
const user = store.getRow('User', userIds[0]);
```

## Listeners (Change Detection)

```typescript
import { getTinyBaseStore } from 'exchange-graphbase';

const store = getTinyBaseStore();

// Table listener
store.addTableListener('User', () => {
  console.log('User table changed');
});

// Row listener
store.addRowListener('User', '1', () => {
  console.log('User 1 changed');
});

// Cell listener
store.addCellListener('User', '1', 'name', (store, tableId, rowId, cellId, newCell) => {
  console.log('Name changed to:', newCell);
});
```

## Store Methods

```typescript
import { cacheExchange } from 'exchange-graphbase';

const cache = cacheExchange({
  /* config */
});

// Access TinyBase from the cache store
const tinybase = cache.store.getTinyBase();

// Manually hydrate TinyBase from current GraphBase data
cache.store.hydrateTinyBase();
```

## Data Structure

```
GraphQL Entity          →  TinyBase Structure
-----------------          -------------------
Type: User              →  Table: "User"
Entity: User:1          →  Row: "1" in "User" table
Field: name             →  Cell: "name" in row "1"
Value: "Alice"          →  Cell value: "Alice"
```

## Limitations

- **Scalar fields only**: Only string, number, boolean, and null values are synced
- **No arrays**: Array fields are not synced to TinyBase
- **No links**: Entity relationships are not included in TinyBase tables
- **No optimistic data**: Only base layer data is synced

## Learn More

- [TinyBase Documentation](https://tinybase.org/)
- [TinyBase React Hooks](https://tinybase.org/api/ui-react/)
- [Full Documentation](./TINYBASE.md)
