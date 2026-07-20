import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/_core";
import type { AuditEvent, AuditEventInput } from "./schemas";

/** Filters accepted by `GET /v1/audit/events`. */
export interface AuditEventFilters {
  actorId?: string;
  action?: string;
  runId?: string;
  eventDomain?: string;
  eventType?: string;
  resourceType?: string;
  outcome?: string;
  /** RFC3339 lower bound. */
  from?: string;
  /** RFC3339 upper bound. */
  to?: string;
  pageSize?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * AuditSdk event log (`/v1/audit/events`). The audit service records and queries
 * immutable audit events; it does not manage trails, reports, or compliance
 * checks (compliance lives in `@frontal-labs/governance`).
 */
export class EventsNamespace {
  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(private readonly http: HttpClient) {}

  /**
   * Record a single audit event.
   * @param event - The event data to record.
   * @returns The saved audit event.
   */
  create(event: AuditEventInput): Promise<AuditEvent> {
    return this.http.post("/audit/events", event);
  }

  /**
   * Record multiple audit events atomically.
   * @param events - Array of events to record.
   * @returns An object with counts of recorded and failed events.
   */
  createBatch(
    events: AuditEventInput[]
  ): Promise<{ recorded: number; failed: number }> {
    return this.http.post("/audit/events/batch", { events });
  }

  /**
   * Query audit events with filters (paginated).
   * @param filters - Optional filters to narrow the query.
   * @returns A paginated result of matching audit events.
   */
  async list(filters: AuditEventFilters = {}): Promise<PageResult<AuditEvent>> {
    const raw = await this.http.get("/audit/events", filters);
    return createPageResult(asPagePayload<AuditEvent>(raw), (cursor) =>
      this.list({ ...filters, cursor })
    );
  }

  /**
   * Fetch a single audit event by id.
   * @param eventId - The unique identifier of the event.
   * @returns The audit event.
   */
  get(eventId: string): Promise<AuditEvent> {
    return this.http.get(`/audit/events/${eventId}`);
  }
}

/**
 * Client for the Frontal AuditSdk API (`/v1/audit/*`).
 *
 * Paths are written without the leading `/v1` because the client base URL
 * already includes it.
 */
export class AuditSdk {
  /** Namespace for audit event operations. */
  readonly events: EventsNamespace;

  /**
   * @param http - The HTTP client used for API requests.
   */
  constructor(http: HttpClient) {
    this.events = new EventsNamespace(http);
  }

  /**
   * Record a single audit event (shorthand for `audit.events.create`).
   * @param event - The event data to record.
   * @returns The saved audit event.
   */
  log(event: AuditEventInput): Promise<AuditEvent> {
    return this.events.create(event);
  }
}
