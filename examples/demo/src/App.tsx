import type { JSX } from 'solid-js/jsx-runtime';
import {
  CacheBoundary,
  createCachedResource,
  useCacheBoundaryRefresh,
  fetch,
} from 'solid-cache';
import { Suspense } from 'solid-js';

function sleep(timeout: number): Promise<boolean> {
  return new Promise(resolve => {
    setTimeout(resolve, timeout, true);
  });
}

function Example() {
  const { data, isFetching } = createCachedResource({
    key: 'Example',
    async get() {
      await sleep(1000);
      return `Current time: ${new Date()}`;
    },
  });

  return (
    <Suspense fallback={<h1>Loading...</h1>}>
      <h1
        style={{
          opacity: isFetching() ? 0.5 : 1,
        }}
      >
        {data()}
      </h1>
    </Suspense>
  );
}

interface DogImageResponse {
  message: string;
}

function DogImage() {
  const { data, isFetching } = fetch(
    'https://dog.ceo/api/breed/shiba/images/random',
  ).json<DogImageResponse>();

  return (
    <Suspense>
      <img src={data()?.message} style={{ opacity: isFetching() ? 0.5 : 1 }} />
    </Suspense>
  );
}

function RefreshAll() {
  const refresh = useCacheBoundaryRefresh();

  return (
    <button type="button" onClick={() => refresh(false)}>
      Refresh All
    </button>
  );
}

function RefreshSWR() {
  const refresh = useCacheBoundaryRefresh();

  return (
    <button type="button" onClick={() => refresh(true)}>
      Refresh SWR
    </button>
  );
}

export default function App(): JSX.Element {
  return (
    <CacheBoundary>
      <RefreshAll />
      <RefreshSWR />
      <Example />
      <DogImage />
    </CacheBoundary>
  );
}
