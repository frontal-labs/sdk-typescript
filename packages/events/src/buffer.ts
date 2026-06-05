import type { PublishEvent } from "./schemas";

export interface EventBufferConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  maxBufferSize: number;
}

const DEFAULT_CONFIG: EventBufferConfig = {
  maxBatchSize: 100,
  flushIntervalMs: 1000,
  maxBufferSize: 10000,
};

interface BufferedEntry {
  topic: string;
  event: PublishEvent;
}

export class EventBuffer {
  private readonly queue: BufferedEntry[] = [];
  private readonly config: EventBufferConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private publishFn: (
    topic: string,
    events: PublishEvent[]
  ) => Promise<unknown>;
  private flushing = false;

  constructor(
    publishFn: (topic: string, events: PublishEvent[]) => Promise<unknown>,
    config: Partial<EventBufferConfig> = {}
  ) {
    this.publishFn = publishFn;
    this.config = { ...DEFAULT_CONFIG, ...config };
    const self = this;
    this.timer = setInterval(() => {
      void self.flush();
    }, this.config.flushIntervalMs);
  }

  add(topic: string, event: PublishEvent): void {
    if (this.queue.length >= this.config.maxBufferSize) {
      const head = this.queue.shift();
      if (head) this.queue.length;
    }
    this.queue.push({ topic, event });
    if (this.queue.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;

    try {
      const entries = this.queue.splice(0, this.queue.length);
      const batches = new Map<string, PublishEvent[]>();
      for (const entry of entries) {
        const list = batches.get(entry.topic) ?? [];
        list.push(entry.event);
        batches.set(entry.topic, list);
      }

      const promises: Promise<unknown>[] = [];
      for (const [topic, events] of batches) {
        const result = this.publishFn(topic, events);
        if (result instanceof Promise) {
          promises.push(result.catch(() => {}));
        }
      }
      await Promise.all(promises);
    } finally {
      this.flushing = false;
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    void this.flush();
  }

  get pending(): number {
    return this.queue.length;
  }
}
