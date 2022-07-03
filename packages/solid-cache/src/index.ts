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
  CacheAction,
  CacheData,
} from './cache-instance';

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

  return (action: CacheAction) => {
    ctx.refresh(action);
  };
}

const cachedResource = createCache();

export interface CachedResource<T> {
  data: Resource<T>;
  isFetching: () => boolean;
}

export function createCachedResource<Source, Value>(
  source: () => Source,
  key: (currentSource: Source) => string,
  fetcher: (currentSource: Source) => Promise<Value>,
): CachedResource<Value | undefined> {
  const ctx = useCacheContext();

  const currentSource = createMemo(() => source());
  const currentKey = createMemo(() => key(currentSource()));

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
    swr: boolean,
  ) {
    // Dedupe when there's an on-going fetch
    if (ctx.isFetching(cachedResource, targetKey)) {
      return;
    }

    const fetchedResult = fetcher(targetSource);

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
      ctx.trackRefresh((action) => {
        createRecord(
          untrack(currentKey),
          untrack(currentSource),
          action === 'stale-while-revalidate',
        );
      }),
    );
  });

  const [data] = createResource(
    () => result().data,
    (currentResult) => {
      if (currentResult.status === 'failure') {
        throw currentResult.value;
      }
      return currentResult.value;
    },
  );

  return {
    data,
    isFetching: () => result().isFetching,
  };
}
