import type { PublishEvent } from "./schemas";

/** Configuration for the event buffer. */
export interface EventBufferConfig {
  /** Maximum number of events to include in a single flush batch. */
  maxBatchSize: number;
  /** Interval in milliseconds between automatic flushes. */
  flushIntervalMs: number;
  /** Maximum number of events buffered before dropping the oldest. */
  maxBufferSize: number;
}

const DEFAULT_CONFIG: EventBufferConfig = {
  maxBatchSize: 100,
  flushIntervalMs: 1000,
  maxBufferSize: 10_000,
};

interface BufferedEntry {
  topic: string;
  event: PublishEvent;
}

/** In-memory event buffer that batches events by topic and flushes them on a schedule or when the batch size is reached. */
export class EventBuffer {
  private readonly queue: BufferedEntry[] = [];
  private readonly config: EventBufferConfig;
  private timer: ReturnType<typeof setInterval> | null = null;
  private publishFn: (
    topic: string,
    events: PublishEvent[]
  ) => Promise<unknown>;
  private flushing = false;

  /**
   * @param publishFn - Async function to publish a batch of events for a given topic.
   * @param config - Optional buffer configuration overrides.
   */
  constructor(
    publishFn: (topic: string, events: PublishEvent[]) => Promise<unknown>,
    config: Partial<EventBufferConfig> = {}
  ) {
    this.publishFn = publishFn;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.timer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Add an event to the buffer. If the buffer reaches `maxBatchSize`, a flush is triggered.
   * @param topic - The topic to publish the event to.
   * @param event - The event data.
   */
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

  /**
   * Flush all buffered events, grouped by topic, through the publish function.
   * @returns A promise that resolves when the flush completes.
   */
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

  /**
   * Destroy the buffer: stop the periodic flush timer and flush remaining events.
   */
  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    void this.flush();
  }

  /** Number of events currently buffered and awaiting flush. */
  get pending(): number {
    return this.queue.length;
  }
}
