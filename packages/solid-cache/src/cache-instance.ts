import { Cache } from './cache';

export type CacheAction = 'stale-while-revalidate' | 'refresh';

export interface CachePending<T> {
  status: 'pending';
  value: Promise<T>;
}

export interface CacheSuccess<T> {
  status: 'success';
  value: T;
}

export interface CacheFailure {
  status: 'failure';
  value: any;
}

export type CacheResult<T> =
  | CachePending<T>
  | CacheSuccess<T>
  | CacheFailure;

export interface CacheData<T> {
  data?: CacheResult<T>;
  isFetching: boolean;
}

export type CacheListener<T> = (result: CacheData<T>) => void;

export interface CacheRecord<T> {
  result: CacheData<T>
  listeners: Set<CacheListener<T>>;
}

export type CacheActionListener = (action: CacheAction) => void;

export default class CacheInstance {
  private alive = true;

  private listeners = new Set<CacheActionListener>();

  private store = new Map<string, Map<string, CacheRecord<any>>>();

  refresh(action: CacheAction) {
    if (this.alive) {
      for (const listener of this.listeners.keys()) {
        listener(action);
      }
    }
  }

  trackRefresh(listener: CacheActionListener): () => void {
    if (this.alive) {
      this.listeners.add(listener);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  get<T>(
    cache: Cache,
    key: string,
  ): CacheData<T> {
    return this.getRecord<T>(cache, key, { isFetching: false }).result;
  }

  private getRecord<T>(
    cache: Cache,
    key: string,
    result: CacheData<T>,
  ): CacheRecord<T> {
    let currentCache = this.store.get(cache.id);
    if (!currentCache) {
      currentCache = new Map();
      this.store.set(cache.id, currentCache);
    }
    let currentRecord = currentCache.get(key);
    if (!currentRecord) {
      currentRecord = {
        result,
        listeners: new Set(),
      };
      currentCache.set(key, currentRecord);
    }
    return currentRecord as CacheRecord<T>;
  }

  isFetching(
    cache: Cache,
    key: string,
  ): boolean {
    return this.getRecord(cache, key, { isFetching: false }).result.isFetching;
  }

  set<T>(
    cache: Cache,
    key: string,
    result: CacheData<T>,
  ): void {
    if (this.alive) {
      const currentRecord = this.getRecord(cache, key, result);
      currentRecord.result = result;
      for (const listener of currentRecord.listeners.keys()) {
        if (!this.alive) {
          return;
        }
        listener(currentRecord.result);
      }
    }
  }

  subscribe<T>(
    cache: Cache,
    key: string,
    listener: CacheListener<T>,
  ): () => void {
    if (this.alive) {
      const currentRecord = this.getRecord<T>(cache, key, { isFetching: false });
      currentRecord.listeners.add(listener);

      return () => {
        currentRecord.listeners.delete(listener);
      };
    }

    return () => {
      // no-op
    };
  }

  destroy() {
    this.store.clear();
    this.listeners.clear();
    this.alive = false;
  }
}
