/**
 * Example: Using TinyBase with Exchange GraphBase
 *
 * This example demonstrates how to access GraphQL entities as TinyBase tables
 */

import { createClient, gql } from '@urql/core';
import {
  cacheExchange,
  getTinyBaseStore,
  getEntitiesByType,
} from 'exchange-graphbase';

// Create a urql client with GraphBase cache
const client = createClient({
  url: 'https://api.example.com/graphql',
  exchanges: [
    cacheExchange({
      keys: {
        User: data => data.id,
        Post: data => data.id,
      },
    }),
  ],
});

// Query some data
const USERS_QUERY = gql`
  query Users {
    users {
      id
      name
      email
      isActive
    }
  }
`;

async function example() {
  // Execute a GraphQL query
  const result = await client.query(USERS_QUERY, {}).toPromise();

  console.log('GraphQL Result:', result.data);

  // Access the data through TinyBase
  const store = getTinyBaseStore();

  // Get all users from TinyBase
  const usersTable = store.getTable('User');
  console.log('Users Table:', usersTable);
  // Output: { "1": { name: "Alice", email: "alice@...", isActive: true }, ... }

  // Get a specific user
  const user1 = store.getRow('User', '1');
  console.log('User 1:', user1);
  // Output: { name: "Alice", email: "alice@example.com", isActive: true }

  // Get a specific field
  const userName = store.getCell('User', '1', 'name');
  console.log('User 1 Name:', userName);
  // Output: "Alice"

  // Use helper functions
  const allUsers = getEntitiesByType('User');
  console.log('All Users (helper):', allUsers);

  // Get all table names
  const tableNames = store.getTableIds();
  console.log('All Tables:', tableNames);
  // Output: ['User', 'Post', ...]
}

// React example with TinyBase hooks
import { useRow, useCell, useTable } from 'tinybase/ui-react';

function UserProfile({ userId }: { userId: string }) {
  const store = getTinyBaseStore();

  // This component will re-render when any field of this user changes
  const user = useRow('User', userId, store);

  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Status: {user.isActive ? 'Active' : 'Inactive'}</p>
    </div>
  );
}

function UserName({ userId }: { userId: string }) {
  const store = getTinyBaseStore();

  // This component only re-renders when the user's name changes
  const name = useCell('User', userId, 'name', store);

  return <span>{name}</span>;
}

function AllUsersTable() {
  const store = getTinyBaseStore();

  // This component re-renders when the User table changes
  const users = useTable('User', store);

  return (
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(users).map(([id, user]) => (
          <tr key={id}>
            <td>{id}</td>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.isActive ? '✓' : '✗'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Advanced: Using TinyBase Queries for filtering
import { createQueries } from 'tinybase';
import { useResultTable } from 'tinybase/ui-react';

function setupQueries() {
  const store = getTinyBaseStore();
  const queries = createQueries(store);

  // Define a query to get active users only
  queries.setQueryDefinition('activeUsers', 'User', ({ select, where }) => {
    select('name');
    select('email');
    where('isActive', true);
  });

  return queries;
}

function ActiveUsersList() {
  const queries = setupQueries();

  // This will reactively update when active users change
  const activeUsers = useResultTable('activeUsers', queries);

  return (
    <ul>
      {Object.entries(activeUsers).map(([id, user]) => (
        <li key={id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}

// Advanced: Using TinyBase Indexes for fast lookups
import { createIndexes } from 'tinybase';

function setupIndexes() {
  const store = getTinyBaseStore();
  const indexes = createIndexes(store);

  // Create an index for looking up users by email
  indexes.setIndexDefinition('usersByEmail', 'User', 'email');

  return indexes;
}

function findUserByEmail(email: string) {
  const indexes = setupIndexes();
  const store = getTinyBaseStore();

  // Fast lookup by email
  const userIds = indexes.getSliceRowIds('usersByEmail', email);

  if (userIds.length === 0) return null;

  return store.getRow('User', userIds[0]);
}

// Example: Listening to changes
function setupListeners() {
  const store = getTinyBaseStore();

  // Listen to all changes in the User table
  store.addTableListener('User', () => {
    console.log('User table changed!');
  });

  // Listen to changes for a specific user
  store.addRowListener('User', '1', () => {
    console.log('User 1 changed!');
  });

  // Listen to changes for a specific cell
  store.addCellListener(
    'User',
    '1',
    'name',
    (store, tableId, rowId, cellId, newCell) => {
      console.log(`User 1's name changed to: ${newCell}`);
    }
  );
}

export {
  example,
  UserProfile,
  UserName,
  AllUsersTable,
  ActiveUsersList,
  findUserByEmail,
  setupListeners,
};
