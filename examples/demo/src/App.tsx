/* @jsxImportSource solid-js */
import { JSX } from "solid-js/jsx-runtime";
import { CacheBoundary, createCachedResource, useCacheBoundaryRefresh } from "solid-cache";
import { Suspense } from 'solid-js';

function sleep(timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout, true);
  });
}

function Example() {
  const { data, isFetching } = createCachedResource(
    () => null,
    () => 'Example',
    async () => {
      await sleep(3000);
      return `Current time: ${new Date()}`;
    },
  );

  return (
    <Suspense fallback={<h1>Loading...</h1>}>
      <h1 style={{
        opacity: isFetching() ? 0.5 : 1
      }}>{data()}</h1>
    </Suspense>
  );
}

function RefreshAll() {
  const refresh = useCacheBoundaryRefresh();

  return (
    <button type="button" onClick={() => refresh('refresh')}>
      Refresh All
    </button>
  );
}

function RefreshSWR() {
  const refresh = useCacheBoundaryRefresh();

  return (
    <button type="button" onClick={() => refresh('stale-while-revalidate')}>
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
      <Example />
      <Example />
    </CacheBoundary>
  )
}