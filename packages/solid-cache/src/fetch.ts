import type { CachedResource } from './core';
import { createCachedResource } from './core';

const nativeFetch = globalThis.fetch;

type Signalify<T> = T | (() => T);

function isSignal<T>(value: Signalify<T>): value is () => T {
  return typeof value === 'function';
}

function fromSignal<T>(value: Signalify<T>): T {
  if (isSignal(value)) {
    return value();
  }
  return value;
}

function serializeInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

export class FetchResponse {
  private input: Signalify<RequestInfo | URL>;

  private init?: Signalify<RequestInit | undefined>;

  constructor(
    input: Signalify<RequestInfo | URL>,
    init?: Signalify<RequestInit | undefined>,
  ) {
    this.input = input;
    this.init = init;
  }

  arrayBuffer(): CachedResource<ArrayBuffer | undefined> {
    return createCachedResource({
      source: () => fromSignal(this.input),
      key: serializeInput,
      get: async (localInput) => {
        const response = await nativeFetch(
          localInput,
          fromSignal(this.init),
        );
        return response.arrayBuffer();
      },
    });
  }

  blob(): CachedResource<Blob | undefined> {
    return createCachedResource({
      source: () => fromSignal(this.input),
      key: serializeInput,
      get: async (localInput) => {
        const response = await nativeFetch(
          localInput,
          fromSignal(this.init),
        );
        return response.blob();
      },
    });
  }

  formData(): CachedResource<FormData | undefined> {
    return createCachedResource({
      source: () => fromSignal(this.input),
      key: serializeInput,
      get: async (localInput) => {
        const response = await nativeFetch(
          localInput,
          fromSignal(this.init),
        );
        return response.formData();
      },
    });
  }

  json<T>(): CachedResource<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return createCachedResource({
      source: () => fromSignal(this.input),
      key: serializeInput,
      get: async (localInput) => {
        const response = await nativeFetch(
          localInput,
          fromSignal(this.init),
        );
        return response.json();
      },
    });
  }

  text(): CachedResource<string | undefined> {
    return createCachedResource({
      source: () => fromSignal(this.input),
      key: serializeInput,
      get: async (localInput) => {
        const response = await nativeFetch(
          localInput,
          fromSignal(this.init),
        );
        return response.text();
      },
    });
  }
}

export function fetch(
  input: Signalify<RequestInfo | URL>,
  init?: Signalify<RequestInit | undefined>,
): FetchResponse {
  return new FetchResponse(input, init);
}
