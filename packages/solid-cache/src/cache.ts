let ID = 0;

export interface Cache {
  id: string;
}

export function createCache(): Cache {
  const id = ID;
  ID += 1;
  return {
    id: `cache-${id}`,
  };
}
