# Incident Management

Automated Incident.io status page integration for the Frontal SDK monorepo.
Runs synthetic health checks against all SDK services every 15 minutes and
manages the full incident lifecycle — no manual status page updates needed.

## Architecture

```
synthetic-monitor.yml (every 15 min)
  ├── sdk-e2e.sh → scripts/monitor.ts (TypeScript SDK checks)
  │                  + Widget API check (frontal-status.com)
  ├── flap-state.sh (hysteresis / flapping prevention)
  └── incident-client.sh → Incident.io API
         ├── Create incident (after 3 consecutive failures)
         ├── Update incident (status + component health)
         └── Resolve incident (after 2 consecutive passes)

status-page-sync.yml (hourly)
  └── Fetch status page structure, cross-reference flap state
      Detect stale incidents, generate component status snapshots

flap-state-cleanup.yml (daily)
  └── Trim history, verify linked incidents exist, fix stale state

incident-manager.yml (manual)
  └── Force create / update / resolve, status checks
```

## Widget API

The public status page is hosted at `https://frontal-status.com`.
The unauthenticated Widget API at `https://frontal-status.com/api/v1/summary`
returns `ongoing_incidents`, `in_progress_maintenances`, and `scheduled_maintenances`.

This is checked by `sdk-e2e.sh` as a lightweight connectivity probe and by
`status-page-sync.yml` for public/private reconciliation.

## Incident Lifecycle

```
Service checks failing
        │
        ▼
[consecutive_failures >= 3?]
        │ YES                    │ NO
        ▼                        ▼
[Create incident]          [No action — accumulating failures]
  status: investigating
  component: degraded_performance / partial_outage / full_outage
        │
        ▼ (next check still failing)
[Update incident]
  status: identified (30-120 min) or monitoring (>120 min)
        │
        ▼ (checks pass, consecutive_successes >= 2)
[Resolve incident]
  status: resolved
  all components → operational
```

## Flapping Prevention

| Variable | Default | Purpose |
|----------|---------|---------|
| `MONITOR_FAIL_THRESHOLD` | 3 | Consecutive failures before creating an incident |
| `MONITOR_RECOVER_THRESHOLD` | 2 | Consecutive passes before resolving |

State persists via `actions/cache` with key `flap-state-sdk-*`. The
`flap-state-cleanup.yml` daily job verifies the cache is consistent.

## Component Configuration

`.github/incident/components.json` defines which status page components
to manage by **name** (not hardcoded UUID). At runtime, `incident-client.sh
resolve-component` calls the Incident.io API to look up the actual
`component_id` for the named component.

```json
[
  {
    "name": "SDKs",
    "description": "Frontal SDK packages"
  }
]
```

The resolution happens at the start of each `synthetic-monitor.yml` run
(via `ShowStatusPageStructure`), so component ID changes in Incident.io
are handled automatically — no config updates needed.

To verify which component ID is being used:
```bash
.github/scripts/incident-client.sh resolve-component "SDKs"
```

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `INCIDENT_IO_API_KEY` | API key with status page write scope |
| `FRONTAL_API_KEY` | API key for SDK health checks |

## Required Variables

| Variable | Purpose |
|----------|---------|
| `INCIDENT_IO_STATUS_PAGE_ID` | UUID of the status page |
| `INCIDENT_IO_SEVERITY_MINOR_ID` | Severity UUID for minor incidents |
| `INCIDENT_IO_SEVERITY_MAJOR_ID` | Severity UUID for major incidents |

## Manual Operations

- **Check status**: Run `incident-manager.yml` with action `status-check`
- **Force resolve**: Run `incident-manager.yml` with action `force-resolve`
- **Force create**: Run `incident-manager.yml` with action `force-create`
- **Silence during maintenance**: Set `dry_run: true` on `synthetic-monitor.yml`
- **Trigger ad-hoc check**: Run `synthetic-monitor.yml` via `workflow_dispatch`

## Recovery

- **Corrupt flap state**: `flap-state-cleanup.yml` detects and resets daily
- **Stale incident in flap state**: Cleanup verifies incident exists on API; if 404, clears reference
- **Incident.io API down**: 3 retries with exponential backoff + jitter; skips the cycle on exhaustion
- **Rate limited (429)**: Jittered backoff, skips cycle if unresolved
- **Monitoring script crash**: Default healthy fallback result prevents false alerts

## Files

| File | Purpose |
|------|---------|
| `.github/scripts/incident-client.sh` | Incident.io v2 API client (dispatch pattern) |
| `.github/scripts/flap-state.sh` | Flap prevention state machine |
| `.github/scripts/sdk-e2e.sh` | SDK E2E runner + Widget API check |
| `.github/incident/components.json` | Component ID mapping |
| `.github/incident/thresholds.json` | Flap thresholds and severity config |
| `.github/workflows/synthetic-monitor.yml` | Main monitoring (15-min) |
| `.github/workflows/status-page-sync.yml` | Hourly component health sync |
| `.github/workflows/incident-manager.yml` | Manual incident management |
| `.github/workflows/flap-state-cleanup.yml` | Daily state cleanup |
| `.github/workflows/validate-status-page.yml` | PR validation + config tests |
| `scripts/monitor.ts` | TypeScript SDK health checks |
