import type { Flag, TargetingRule } from "./schemas";

interface CacheEntry {
  flag: Flag;
  rules: TargetingRule[];
  fetchedAt: number;
}

export interface FlagCacheConfig {
  ttlMs: number;
}

const DEFAULT_TTL_MS = 60_000; // 1 minute

export class FlagCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly config: FlagCacheConfig;

  constructor(config: Partial<FlagCacheConfig> = {}) {
    this.config = { ttlMs: config.ttlMs ?? DEFAULT_TTL_MS };
  }

  get(key: string): { flag: Flag; rules: TargetingRule[] } | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.fetchedAt >= this.config.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return { flag: entry.flag, rules: entry.rules };
  }

  set(flag: Flag, rules: TargetingRule[]): void {
    this.store.set(flag.key, { flag, rules, fetchedAt: Date.now() });
  }

  setAll(entries: Array<{ flag: Flag; rules: TargetingRule[] }>): void {
    for (const { flag, rules } of entries) {
      this.set(flag, rules);
    }
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
