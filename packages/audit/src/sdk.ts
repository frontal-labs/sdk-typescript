import {
  asPagePayload,
  createPageResult,
  type HttpClient,
  type PageResult,
} from "@frontal-labs/core";
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
  constructor(private readonly http: HttpClient) {}

  /** Record a single audit event. */
  create(event: AuditEventInput): Promise<AuditEvent> {
    return this.http.post("/audit/events", event);
  }

  /** Record multiple audit events atomically. */
  createBatch(
    events: AuditEventInput[]
  ): Promise<{ recorded: number; failed: number }> {
    return this.http.post("/audit/events/batch", { events });
  }

  /** Query audit events with filters (paginated). */
  async list(filters: AuditEventFilters = {}): Promise<PageResult<AuditEvent>> {
    const raw = await this.http.get("/audit/events", filters);
    return createPageResult(asPagePayload<AuditEvent>(raw), (cursor) =>
      this.list({ ...filters, cursor })
    );
  }

  /** Fetch a single audit event by id. */
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
  readonly events: EventsNamespace;

  constructor(http: HttpClient) {
    this.events = new EventsNamespace(http);
  }

  /** Record a single audit event (shorthand for `audit.events.create`). */
  log(event: AuditEventInput): Promise<AuditEvent> {
    return this.events.create(event);
  }
}
