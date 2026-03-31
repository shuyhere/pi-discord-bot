export type PendingEntry<T> = { userId: string; resolve: (value: T) => void };

export function registerPending<T>(params: {
  registry: Map<string, PendingEntry<T>>;
  key: string;
  userId: string;
  resolve: (value: T) => void;
}): void {
  params.registry.set(params.key, { userId: params.userId, resolve: params.resolve });
}

export function registerManyPending<T>(params: {
  registry: Map<string, PendingEntry<T>>;
  keys: string[];
  userId: string;
  resolve: (value: T) => void;
}): void {
  for (const key of params.keys) {
    params.registry.set(key, { userId: params.userId, resolve: params.resolve });
  }
}

export function clearPending<T>(registry: Map<string, PendingEntry<T>>, keys: Array<string | undefined>): boolean {
  let hadAny = false;
  for (const key of keys) {
    if (!key) continue;
    hadAny = registry.delete(key) || hadAny;
  }
  return hadAny;
}

export function resolveOnTimeout(params: {
  timeoutMs?: number;
  run: () => boolean;
}): void {
  setTimeout(() => {
    params.run();
  }, params.timeoutMs ?? 120000);
}
