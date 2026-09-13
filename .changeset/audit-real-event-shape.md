---
"@frontal-labs/audit": major
---

Align the audit SDK with the real `/v1/audit/events` service (closes the audit item of the SDK alignment plan).

**Breaking — event shape.** Inputs, filters and stored events now use the backend's fields instead of the previously fabricated ones:

| Before | After |
| --- | --- |
| `resource: { type, id }` | `resourceType`, `resourceId` |
| `status` | `outcome` (`"success" \| "failure" \| "denied"`, default `"success"`) |
| `actor: { userId }` (read) / `actorUserId` (filter) | `actorId` (+ optional `actorType`) |
| `timeFrom` / `timeTo` | `from` / `to` |
| `timestamp` | `createdAt` |
| — | `eventDomain`, `eventType`, `runId`, `sequence`, `requestId`, `idempotencyKey`, `tenantId`, `ipAddress`, `userAgent` |

- Inputs and filters are validated with Zod before the request (`AuditEventInputSchema`, `AuditEventFiltersSchema`); `pageSize`/`offset` filters are exposed.
- Removed the leftover `AuditReportSchema` / `AuditQuerySchema` types — the service has no reports; compliance lives in `@frontal-labs/governance`.
- Routes were already the real ones (`POST/GET /audit/events`, `POST /audit/events/batch`, `GET /audit/events/:id`); no change there.
