/* @jsxImportSource solid-js */
import {
  createComponent,
  createComputed,
  createContext,
  createMemo,
  createResource,
  createSignal,
  JSX,
  on,
  onCleanup,
  Resource,
  untrack,
  useContext,
} from 'solid-js';
import {
  createCache,
} from './cache';
import CacheInstance, {
  CacheData,
  CacheResult,
} from './cache-instance';

function signalToResource<T>(
  result: () => CacheResult<T> | undefined,
): Resource<T | undefined> {
  const [data] = createResource(
    () => result(),
    (currentResult) => {
      if (currentResult.status === 'failure') {
        throw currentResult.value;
      }
      return currentResult.value;
    },
  );

  return data;
}

const CacheContext = createContext<CacheInstance>();

export interface CacheBoundaryProps {
  children?: JSX.Element;
}

export function CacheBoundary(props: CacheBoundaryProps): JSX.Element {
  const instance = new CacheInstance();

  onCleanup(() => {
    instance.destroy();
  });

  return (
    createComponent(CacheContext.Provider, {
      value: instance,
      get children() {
        return props.children;
      },
    })
  );
}

function useCacheContext(): CacheInstance {
  const ctx = useContext(CacheContext);

  if (!ctx) {
    throw new Error('Missing `<CacheBoundary>`');
  }

  return ctx;
}

export function useCacheBoundaryRefresh() {
  const ctx = useCacheContext();

  return (swr?: boolean) => {
    ctx.refresh(swr);
  };
}

const cachedResource = createCache();

export interface CachedResource<T> {
  data: Resource<T>;
  isFetching: () => boolean;
}

export interface CachedResourceOptionsWithSource<Source, Value> {
  source: () => Source;
  key: (currentSource: Source) => string;
  get: (currentSource: Source) => Promise<Value>;
}

export interface CachedResourceOptionsWithoutSource<Value> {
  key: string;
  get: () => Promise<Value>;
}

function createCachedResourceWithSource<Source, Value>(
  options: CachedResourceOptionsWithSource<Source, Value>,
): CachedResource<Value | undefined> {
  const ctx = useCacheContext();

  const currentSource = createMemo(() => options.source());
  const currentKey = createMemo(() => options.key(currentSource()));

  const [result, setResult] = createSignal<CacheData<Value>>(
    ctx.get(cachedResource, untrack(currentKey)),
  );

  // Bind cache to local signal
  createComputed(() => {
    const targetKey = currentKey();

    onCleanup(
      ctx.subscribe<Value>(
        cachedResource,
        targetKey,
        setResult,
      ),
    );

    // Sync local signal
    setResult(ctx.get<Value>(cachedResource, targetKey));
  });

  function createRecord(
    targetKey: string,
    targetSource: Source,
    swr?: boolean,
  ) {
    // Dedupe when there's an on-going fetch
    if (ctx.isFetching(cachedResource, targetKey)) {
      return;
    }

    const fetchedResult = options.get(targetSource);

    fetchedResult.then(
      (value) => {
        ctx.set(cachedResource, targetKey, {
          data: {
            status: 'success',
            value,
          },
          isFetching: false,
        });
      },
      (value) => {
        ctx.set(cachedResource, targetKey, {
          data: {
            status: 'failure',
            value,
          },
          isFetching: false,
        });
      },
    );

    if (swr) {
      ctx.set(cachedResource, targetKey, {
        data: ctx.get(cachedResource, targetKey)?.data,
        isFetching: true,
      });
    } else {
      ctx.set(cachedResource, targetKey, {
        data: {
          status: 'pending',
          value: fetchedResult,
        },
        isFetching: true,
      });
    }
  }

  // Manage fetcher
  createComputed(
    on(currentKey, (keyValue) => {
      const currentResult = ctx.get<Value>(cachedResource, keyValue);
      if (!currentResult.data) {
        createRecord(keyValue, untrack(currentSource), false);
      }
    }),
  );

  // Manage fetcher by refresh action
  createComputed(() => {
    onCleanup(
      ctx.trackRefresh((swr) => {
        createRecord(
          untrack(currentKey),
          untrack(currentSource),
          swr,
        );
      }),
    );
  });

  return {
    data: signalToResource(() => result().data),
    isFetching: () => result().isFetching,
  };
}

function createCachedResourceWithoutSource<Value>(
  options: CachedResourceOptionsWithoutSource<Value>,
): CachedResource<Value | undefined> {
  const ctx = useCacheContext();

  const key = untrack(() => options.key);

  const [result, setResult] = createSignal<CacheData<Value>>(
    ctx.get(cachedResource, key),
  );

  // Bind cache to local signal
  createComputed(() => {
    onCleanup(
      ctx.subscribe<Value>(
        cachedResource,
        key,
        setResult,
      ),
    );

    // Sync local signal
    setResult(ctx.get<Value>(cachedResource, key));
  });

  function createRecord(
    targetKey: string,
    swr?: boolean,
  ) {
    // Dedupe when there's an on-going fetch
    if (ctx.isFetching(cachedResource, targetKey)) {
      return;
    }

    const fetchedResult = options.get();

    fetchedResult.then(
      (value) => {
        ctx.set(cachedResource, targetKey, {
          data: {
            status: 'success',
            value,
          },
          isFetching: false,
        });
      },
      (value) => {
        ctx.set(cachedResource, targetKey, {
          data: {
            status: 'failure',
            value,
          },
          isFetching: false,
        });
      },
    );

    if (swr) {
      ctx.set(cachedResource, targetKey, {
        data: ctx.get(cachedResource, targetKey)?.data,
        isFetching: true,
      });
    } else {
      ctx.set(cachedResource, targetKey, {
        data: {
          status: 'pending',
          value: fetchedResult,
        },
        isFetching: true,
      });
    }
  }

  const currentResult = ctx.get<Value>(cachedResource, key);
  if (!currentResult.data) {
    createRecord(key, false);
  }

  // Manage fetcher by refresh action
  createComputed(() => {
    onCleanup(
      ctx.trackRefresh((swr) => {
        createRecord(
          key,
          swr,
        );
      }),
    );
  });

  return {
    data: signalToResource(() => result().data),
    isFetching: () => result().isFetching,
  };
}

export function createCachedResource<Source, Value>(
  options: CachedResourceOptionsWithSource<Source, Value>,
): CachedResource<Value | undefined>
export function createCachedResource<Value>(
  options: CachedResourceOptionsWithoutSource<Value>,
): CachedResource<Value | undefined>
export function createCachedResource<Source, Value>(
  options:
    | CachedResourceOptionsWithSource<Source, Value>
    | CachedResourceOptionsWithoutSource<Value>,
): CachedResource<Value | undefined> {
  if ('source' in options) {
    return createCachedResourceWithSource(options);
  }
  return createCachedResourceWithoutSource(options);
}
