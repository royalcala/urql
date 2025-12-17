import {
  gql,
  createClient,
  ExchangeIO,
  Operation,
  OperationResult,
} from '@urql/core';

import { vi, expect, it, describe, beforeEach, afterEach } from 'vitest';

import { pipe, share, map, tap, publish, makeSubject } from 'wonka';

import { queryResponse } from '../../../packages/core/src/test-utils';
import { cacheExchange } from './cacheExchange';
import {
  getTinyBaseStore,
  resetTinyBaseStore,
  getEntitiesByType,
  getEntity,
  getEntityField,
  getAllTypenames,
} from './store/tinybase-adapter';

const dispatchDebug = vi.fn();

describe('TinyBase Integration with GraphQL', () => {
  beforeEach(() => {
    resetTinyBaseStore();
  });

  afterEach(() => {
    resetTinyBaseStore();
  });

  it('syncs GraphQL query data to TinyBase', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        user {
          id
          name
          email
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '123',
        name: 'Alice',
        email: 'alice@example.com',
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check that data is in TinyBase
    const store = getTinyBaseStore();
    expect(store.getCell('User', '123', 'name')).toBe('Alice');
    expect(store.getCell('User', '123', 'email')).toBe('alice@example.com');

    // Check helper functions
    const user = getEntity('User', '123');
    expect(user).toEqual({
      __typename: 'User',
      id: '123',
      name: 'Alice',
      email: 'alice@example.com',
    });

    const userName = getEntityField('User', '123', 'name');
    expect(userName).toBe('Alice');
  });

  it('syncs multiple entities of the same type', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        users {
          id
          name
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      users: [
        {
          __typename: 'User',
          id: '1',
          name: 'Alice',
        },
        {
          __typename: 'User',
          id: '2',
          name: 'Bob',
        },
        {
          __typename: 'User',
          id: '3',
          name: 'Charlie',
        },
      ],
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check all users are in TinyBase
    const users = getEntitiesByType('User');
    expect(Object.keys(users)).toHaveLength(3);
    expect(users['1']?.name).toBe('Alice');
    expect(users['2']?.name).toBe('Bob');
    expect(users['3']?.name).toBe('Charlie');
  });

  it('syncs nested entities', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        user {
          id
          name
          posts {
            id
            title
            author {
              id
              name
            }
          }
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '1',
        name: 'Alice',
        posts: [
          {
            __typename: 'Post',
            id: '10',
            title: 'Hello World',
            author: {
              __typename: 'User',
              id: '1',
              name: 'Alice',
            },
          },
          {
            __typename: 'Post',
            id: '11',
            title: 'GraphQL is awesome',
            author: {
              __typename: 'User',
              id: '1',
              name: 'Alice',
            },
          },
        ],
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check that both User and Post entities are in TinyBase
    const typenames = getAllTypenames();
    expect(typenames).toContain('User');
    expect(typenames).toContain('Post');

    // Check User data
    const user = getEntity('User', '1');
    expect(user?.name).toBe('Alice');

    // Check Post data
    const posts = getEntitiesByType('Post');
    expect(Object.keys(posts)).toHaveLength(2);
    expect(posts['10']?.title).toBe('Hello World');
    expect(posts['11']?.title).toBe('GraphQL is awesome');
  });

  it('updates entities when mutations are executed', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    // First, execute a query to populate data
    const query = gql`
      {
        user(id: "1") {
          id
          name
          email
        }
      }
    `;

    const queryOp = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const queryData = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '1',
        name: 'Alice',
        email: 'alice@example.com',
      },
    };

    // Then execute a mutation to update
    const mutation = gql`
      mutation {
        updateUser(id: "1", name: "Alice Smith") {
          id
          name
          email
        }
      }
    `;

    const mutationOp = client.createRequestOperation('mutation', {
      key: 2,
      query: mutation,
      variables: undefined,
    });

    const mutationData = {
      __typename: 'Mutation',
      updateUser: {
        __typename: 'User',
        id: '1',
        name: 'Alice Smith',
        email: 'alice@example.com',
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      if (forwardOp.kind === 'query') {
        return { ...queryResponse, operation: forwardOp, data: queryData };
      } else {
        return { ...queryResponse, operation: forwardOp, data: mutationData };
      }
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    // Execute query
    next(queryOp);

    // Check initial data
    let userName = getEntityField('User', '1', 'name');
    expect(userName).toBe('Alice');

    // Execute mutation
    next(mutationOp);

    // Check updated data
    userName = getEntityField('User', '1', 'name');
    expect(userName).toBe('Alice Smith');
  });

  it('handles different scalar types correctly', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        product {
          id
          name
          price
          inStock
          rating
          description
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      product: {
        __typename: 'Product',
        id: 'prod-1',
        name: 'GraphQL Book',
        price: 29.99,
        inStock: true,
        rating: 4.5,
        description: null,
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check different scalar types
    const product = getEntity('Product', 'prod-1');
    expect(product?.name).toBe('GraphQL Book');
    expect(product?.price).toBe(29.99);
    expect(product?.inStock).toBe(true);
    expect(product?.rating).toBe(4.5);
    expect(product?.description).toBe(null);
  });

  it('does not sync optimistic updates to TinyBase', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const mutation = gql`
      mutation {
        updateUser(id: "1", name: "Bob") {
          id
          name
        }
      }
    `;

    const mutationOp = client.createRequestOperation('mutation', {
      key: 1,
      query: mutation,
      variables: undefined,
    });

    const optimisticData = {
      __typename: 'Mutation',
      updateUser: {
        __typename: 'User',
        id: '1',
        name: 'Optimistic Name',
      },
    };

    const actualData = {
      __typename: 'Mutation',
      updateUser: {
        __typename: 'User',
        id: '1',
        name: 'Bob',
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: actualData };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({
        optimistic: {
          updateUser: (args, cache, info) => {
            return optimisticData.updateUser;
          },
        },
      })({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(mutationOp);

    // TinyBase should have the actual data, not optimistic
    const userName = getEntityField('User', '1', 'name');
    expect(userName).toBe('Bob');
  });

  it('syncs data from cache hits (second query)', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        author {
          id
          name
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      author: {
        __typename: 'Author',
        id: '123',
        name: 'John Doe',
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    // First query - cache miss
    next(op);

    let author = getEntity('Author', '123');
    expect(author?.name).toBe('John Doe');

    // Second query - should be cache hit
    next(op);

    // Data should still be in TinyBase
    author = getEntity('Author', '123');
    expect(author?.name).toBe('John Doe');

    // Response should only be called once (first query)
    expect(response).toHaveBeenCalledTimes(1);
    // Result should be called twice (both queries)
    expect(result).toHaveBeenCalledTimes(2);
  });

  it('works with custom keys configuration', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        article {
          slug
          title
          author {
            username
            bio
          }
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      article: {
        __typename: 'Article',
        slug: 'hello-world',
        title: 'Hello World',
        author: {
          __typename: 'Author',
          username: 'alice',
          bio: 'Software Engineer',
        },
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({
        keys: {
          Article: data => data.slug as string,
          Author: data => data.username as string,
        },
      })({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check that entities use custom keys
    const article = getEntity('Article', 'hello-world');
    expect(article?.title).toBe('Hello World');

    const author = getEntity('Author', 'alice');
    expect(author?.bio).toBe('Software Engineer');
  });

  it('handles queries with variables', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: { id: '42' },
    });

    const expected = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '42',
        name: 'Variable User',
        email: 'var@example.com',
      },
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check that data is in TinyBase with correct ID
    const user = getEntity('User', '42');
    expect(user?.name).toBe('Variable User');
    expect(user?.email).toBe('var@example.com');
  });

  it('syncs multiple entity types in a single query', () => {
    const client = createClient({
      url: 'http://0.0.0.0',
      exchanges: [],
    });

    const query = gql`
      {
        user {
          id
          name
        }
        posts {
          id
          title
        }
        comments {
          id
          text
        }
      }
    `;

    const op = client.createRequestOperation('query', {
      key: 1,
      query,
      variables: undefined,
    });

    const expected = {
      __typename: 'Query',
      user: {
        __typename: 'User',
        id: '1',
        name: 'Alice',
      },
      posts: [
        {
          __typename: 'Post',
          id: '10',
          title: 'First Post',
        },
        {
          __typename: 'Post',
          id: '11',
          title: 'Second Post',
        },
      ],
      comments: [
        {
          __typename: 'Comment',
          id: '100',
          text: 'Great post!',
        },
      ],
    };

    const response = vi.fn((forwardOp: Operation): OperationResult => {
      return { ...queryResponse, operation: forwardOp, data: expected };
    });

    const { source: ops$, next } = makeSubject<Operation>();
    const result = vi.fn();
    const forward: ExchangeIO = ops$ => pipe(ops$, map(response), share);

    pipe(
      cacheExchange({})({ forward, client, dispatchDebug })(ops$),
      tap(result),
      publish
    );

    next(op);

    // Check all entity types are present
    const typenames = getAllTypenames();
    expect(typenames).toContain('User');
    expect(typenames).toContain('Post');
    expect(typenames).toContain('Comment');

    // Verify entity counts
    const users = getEntitiesByType('User');
    const posts = getEntitiesByType('Post');
    const comments = getEntitiesByType('Comment');

    expect(Object.keys(users)).toHaveLength(1);
    expect(Object.keys(posts)).toHaveLength(2);
    expect(Object.keys(comments)).toHaveLength(1);
  });
});
