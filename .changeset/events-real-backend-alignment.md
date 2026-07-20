---
"@frontal-labs/events": major
---

Align the events client with the real events gateway (`/v1/events/*`). The
published spec exposes a different (analytics) events API; the SDK now targets
the real service routes:

- `publish()` posts to `/events/publish` (topic in the body), not
  `/events/topics/{topic}/publish`.
- `subscribe()` and `subscriptions.create()` post to `/events/subscriptions`
  (topic in the body), not `/events/topics/{topic}/subscribe`.
- `schemas.validate()` posts to `/events/schemas/validate` (schema id in the
  body), not `/events/schemas/{id}/validate`.
- Removed the fabricated `deadLetter` namespace (`/events/dead-letter*` does not
  exist) and added the real resource namespaces: `replays`, `consumers`,
  `consumerGroups`, `routes`, `buses`, `archives`, `retentionPolicies`, and
  `policies`. Failed-event recovery now lives under `events.replays`.
