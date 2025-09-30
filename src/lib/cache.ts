export class Cache<T> {
  private store = new Map<string, { value: T; expiry: number }>();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    this.ttl = ttl;
  }

  set(key: string, value: T) {
    const expiry = Date.now() + this.ttl;
    this.store.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const cached = this.store.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.store.delete(key);
      return null;
    }
    return cached.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear() {
    this.store.clear();
  }

  entries(): T[] {
    return [...this.store.values()]
      .filter(({ expiry }) => expiry > Date.now())
      .map(({ value }) => value);
  }

  get size(): number {
    return this.entries().length;
  }
}