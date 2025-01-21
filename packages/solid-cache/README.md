# solid-cache

> Cache boundaries and resource caching in SolidJS

[![NPM](https://img.shields.io/npm/v/solid-cache.svg)](https://www.npmjs.com/package/solid-cache) [![JavaScript Style Guide](https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb)](https://github.com/airbnb/javascript)[![Open in CodeSandbox](https://img.shields.io/badge/Open%20in-CodeSandbox-blue?style=flat-square&logo=codesandbox)](https://codesandbox.io/s/github/LXSMNSYC/solid-cache/tree/main/examples/demo)
[![Open in Codeanywhere](https://img.shields.io/badge/Open%20in-Codeanywhere-blue?style=flat-square&logo=codeanywhere)](https://app.codeanywhere.com/#https://github.com/LXSMNSYC/solid-cache/tree/main/examples/demo)

## Install

```bash
npm i solid-cache
```

```bash
yarn add solid-cache
```

```bash
pnpm add solid-cache
```

## Usage

### `<CacheBoundary>`

`<CacheBoundary>` creates a contextual cache for all the cached resources to read/write resource results.

```jsx
import { CacheBoundary } from 'solid-cache';

export default function App() {
  return (
    <CacheBoundary>
      <Main />
    </CacheBoundary>
  );
}
```

It's ideal to add a `<CacheBoundary>` at the root of your application, but you can also do it granularly such that different parts of the application don't have to share the same cache.

```jsx
<>
  <CacheBoundary>
    <Navigation />
  </CacheBoundary>
  <CacheBoundary>
    <PageContent />
  </CacheBoundary>
</>
```

### `createCachedResource`

A primitive similar to `createResource`, except `createCachedResource` works differently.

For `createCacheResource` to be "cached", it requires a `<CacheBoundary>` as an ancestor component, and it needs a "key" so it knows where to access or share its cached data.

`createCachedResource` also returns `data` and `isFetching`: `data` is a `Resource` while `isFetching` is a reactive boolean signal.

```jsx
import { createCachedResource } from 'solid-cache';

function Profile() {
  const { data, isFetching } = createCachedResource({
    key: '/profile',
    get: () => getUserProfile(),
  });

  return (
    <div
      style={{
        opacity: isFetching() ? 0.5 : 1,
      }}
    >
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileDetails data={data()?.details} />
        <ProfileTimeline data={data()?.posts} />
      </Suspense>
    </div>
  );
}
```

`createCachedResource` can also accept a `source` like `createResource` however it won't refetch if the `key` remains unchanged.

```jsx
const { data, isFetching } = createCachedResource({
  source: () => id(),
  key: (currentId) => `/user/${currentId}`,
  get: (currentID) => getUser(currentId),
});
```

If there are multiple `createCachedResource` instances that share the same key, only one is going to fetch and the rest will re-use the same cached value as the fetching instance.

### `useCacheBoundaryRefresh`

`useCacheBoundaryRefresh` returns a function that makes all `createCachedResource` instances to simultaneously refresh in the same `<CacheBoundary>`.

```js
function RefreshUser() {
  const refresh = useCacheBoundaryRefresh();

  return <RefreshButton onClick={() => refresh()} />
}
```

However, if you want to "refresh in the background" while keeping the old data, you can call `refresh(true)` instead, this way, the UI doesn't need to show a loading UI.

### `fetch`

A wrapper for `createCachedResource` and the native `fetch` API.

```jsx
import { fetch } from 'solid-cache';

function DogImage() {
  const { data, isFetching } = fetch('https://dog.ceo/api/breed/shiba/images/random').json();

  return (
    <Suspense>
      <img
        src={data()?.message}
        style={{ opacity: isFetching() ? 0.5 : 1 }}
      />
    </Suspense>
  );
}
```

## Sponsors

![Sponsors](https://github.com/lxsmnsyc/sponsors/blob/main/sponsors.svg?raw=true)

## License

MIT © [lxsmnsyc](https://github.com/lxsmnsyc)
