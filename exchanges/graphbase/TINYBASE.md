# TinyBase Integration for Exchange GraphBase

Exchange GraphBase now includes integrated support for [TinyBase](https://tinybase.org/), allowing you to access your GraphQL entities as TinyBase tables with full reactivity and query capabilities.

## What is TinyBase?

TinyBase is a reactive data store for local-first apps, with a spreadsheet-like API. By integrating it with GraphBase, you can:

- Access GraphQL entities as relational tables
- Use TinyBase's powerful query and indexing features
- Build reactive UIs with TinyBase's React hooks
- Leverage TinyBase's persistence and synchronization capabilities

## How it Works

Each GraphQL entity type becomes a **TinyBase table**, and each entity instance becomes a **row** in that table. The entity's scalar fields become **cells** in the row.

For example:

- GraphQL type `User` → TinyBase table `"User"`
- Entity `User:1` → Row `"1"` in table `"User"`
- Field `name` → Cell `"name"` in that row

## Installation

TinyBase is already installed as a dependency of `exchange-graphbase`.

```bash
npm install exchange-graphbase
# or
pnpm add exchange-graphbase
```

## Usage

### Basic Setup

```typescript
import { cacheExchange, getTinyBaseStore } from 'exchange-graphbase';
import { createClient } from '@urql/core';

const client = createClient({
  url: 'https://api.example.com/graphql',
  exchanges: [
    cacheExchange({
      /* your config */
    }),
    // ... other exchanges
  ],
});

// Access the TinyBase store
const store = getTinyBaseStore();

// Get all users
const users = store.getTable('User');
console.log(users);
// { "1": { name: "Alice", email: "alice@example.com" }, "2": { ... } }

// Get a specific user
const user = store.getRow('User', '1');
console.log(user);
// { name: "Alice", email: "alice@example.com" }

// Get a specific field
const userName = store.getCell('User', '1', 'name');
console.log(userName); // "Alice"
```

### Using the Store Instance

```typescript
import { cacheExchange } from 'exchange-graphbase';

const cache = cacheExchange({
  /* your config */
});

// Inside your app, get the cache instance from urql
// then access TinyBase
const store = cache.store.getTinyBase();

// Or hydrate TinyBase from current GraphBase data
cache.store.hydrateTinyBase();
```

### Helper Functions

Exchange GraphBase provides convenient helper functions:

```typescript
import {
  getEntitiesByType,
  getEntity,
  getEntityField,
  getAllTypenames,
  getAllTables,
  hydrateTinyBaseFromGraphBase,
} from 'exchange-graphbase';

// Get all entities of a specific type
const users = getEntitiesByType('User');

// Get a specific entity
const user = getEntity('User', '1');

// Get a specific field from an entity
const userName = getEntityField('User', '1', 'name');

// Get all type names (table names)
const typeNames = getAllTypenames();
console.log(typeNames); // ['User', 'Post', 'Comment', ...]

// Get all tables
const allTables = getAllTables();
console.log(allTables);
// {
//   User: { "1": { name: "Alice", ... }, "2": { ... } },
//   Post: { "10": { title: "Hello", ... }, ... },
//   ...
// }
```

### React Integration

TinyBase provides excellent React hooks for reactive UIs:

```typescript
import { getTinyBaseStore } from 'exchange-graphbase';
import { useRow, useCell, useTable } from 'tinybase/ui-react';
import { createClient, Provider } from 'urql';

const store = getTinyBaseStore();

// Use TinyBase's React hooks
function UserProfile({ userId }) {
  // Automatically re-renders when user data changes
  const user = useRow('User', userId, store);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

function UserName({ userId }) {
  // Even more granular - only re-renders when name changes
  const name = useCell('User', userId, 'name', store);
  return <span>{name}</span>;
}

function AllUsers() {
  // Get entire table reactively
  const users = useTable('User', store);

  return (
    <ul>
      {Object.entries(users).map(([id, user]) => (
        <li key={id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Advanced: Queries and Indexes

TinyBase supports powerful queries and indexes:

```typescript
import { getTinyBaseStore } from 'exchange-graphbase';
import { createQueries, createIndexes } from 'tinybase';

const store = getTinyBaseStore();
const queries = createQueries(store);
const indexes = createIndexes(store);

// Create a query to filter active users
queries.setQueryDefinition('activeUsers', 'User', ({ select, where }) => {
  select('name');
  select('email');
  where('isActive', true);
});

// Get results
const activeUsers = queries.getResultTable('activeUsers');

// Create an index for efficient lookups
indexes.setIndexDefinition('usersByEmail', 'User', 'email');

// Look up by email
const userId = indexes.getSliceIds('usersByEmail', 'alice@example.com');
```

### Automatic Synchronization

Exchange GraphBase automatically syncs data to TinyBase when:

- New entities are written to the cache
- Entity fields are updated
- You're not in an optimistic update (optimistic layers are not synced)

This happens transparently - you don't need to do anything!

### Manual Hydration

If you need to manually hydrate TinyBase from GraphBase data (e.g., after loading from persistence):

```typescript
import { hydrateTinyBaseFromGraphBase } from 'exchange-graphbase';

// Get the cache store instance from urql
const cacheStore = /* ... your cache store ... */;

// Hydrate TinyBase
hydrateTinyBaseFromGraphBase(cacheStore.data);

// Or use the store method
cacheStore.hydrateTinyBase();
```

## Limitations

- **Scalar fields only**: TinyBase integration only syncs scalar fields (strings, numbers, booleans, null). Entity relationships (links) are not included in TinyBase tables.
- **Arrays not supported**: Array fields are not synced to TinyBase since TinyBase cells are single values.
- **No optimistic data**: Optimistic updates are not reflected in TinyBase to keep the base layer stable.
- **Root queries**: The root `Query` type is stored with a special `__root` ID.

## Why Use TinyBase with GraphBase?

1. **Relational Queries**: Query your GraphQL data like a database with joins, filters, and aggregations
2. **Reactive UI**: Build highly performant UIs with granular reactivity (re-render only when specific cells change)
3. **Indexes**: Create indexes for fast lookups without scanning all entities
4. **Persistence**: Use TinyBase's persistence adapters to save data to localStorage, IndexedDB, etc.
5. **Checkpoints**: TinyBase supports undo/redo functionality
6. **Metrics**: Compute derived values and aggregations reactively
7. **Local-first**: Build offline-capable apps with TinyBase's synchronization features

## Example: Building a User List with Filters

```typescript
import { getTinyBaseStore } from 'exchange-graphbase';
import { createQueries } from 'tinybase';
import { useResultTable } from 'tinybase/ui-react';

const store = getTinyBaseStore();
const queries = createQueries(store);

// Define a filtered query
queries.setQueryDefinition('premiumUsers', 'User', ({ select, where }) => {
  select('name');
  select('email');
  select('plan');
  where('plan', 'premium');
});

function PremiumUsersList() {
  const premiumUsers = useResultTable('premiumUsers', queries);

  return (
    <ul>
      {Object.entries(premiumUsers).map(([id, user]) => (
        <li key={id}>
          {user.name} ({user.email}) - {user.plan}
        </li>
      ))}
    </ul>
  );
}
```

## Learn More

- [TinyBase Documentation](https://tinybase.org/)
- [TinyBase React Hooks](https://tinybase.org/guides/the-basics/getting-started/)
- [GraphBase Documentation](https://formidable.com/open-source/urql/docs/graphcache/)

## License

MIT
