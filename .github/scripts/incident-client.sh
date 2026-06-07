#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# incident-client.sh — Incident.io v2 API client for GitHub Actions
#
# Dispatch-pattern script. Source for library use, or call directly.
#
# Usage (direct):
#   incident-client.sh create-status-page <name> <message> <incident_status> <component_statuses_json>
#   incident-client.sh post-update <status_page_incident_id> <message> [incident_status] [component_statuses_json]
#   incident-client.sh resolve <status_page_incident_id> <message>
#   incident-client.sh list-active-incidents
#   incident-client.sh get-status-page-structure <status_page_id>
#   incident-client.sh test-auth
#   incident-client.sh derive-severity <failed_services_count>
#
# Environment:
#   INCIDENT_IO_API_KEY          Required. API key (bearer token).
#   INCIDENT_IO_API_BASE         Optional. Override base URL (default: https://api.incident.io)
#   INCIDENT_IO_STATUS_PAGE_ID   Required for status page operations.
#   INCIDENT_IO_COMPONENT_IDS    Comma-separated list of component IDs.
#   INCIDENT_IO_DRY_RUN          If "true", print requests instead of sending.
#   INCIDENT_IO_SEVERITY_MINOR_ID   Severity ID for minor incidents.
#   INCIDENT_IO_SEVERITY_MAJOR_ID   Severity ID for major incidents.
# ---------------------------------------------------------------------------

readonly API_BASE="${INCIDENT_IO_API_BASE:-https://api.incident.io}"
readonly API_KEY="${INCIDENT_IO_API_KEY:-}"
readonly DRY_RUN="${INCIDENT_IO_DRY_RUN:-false}"
readonly STATUS_PAGE_ID="${INCIDENT_IO_STATUS_PAGE_ID:-}"
readonly MAX_RETRIES=3
readonly RETRY_BASE_SECS=1

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

idempotency_key() {
  local prefix="${1:-frontal-sdk}"
  echo "${prefix}-$(date -u +%Y%m%d-%H%M)"
}

require_api_key() {
  if [[ -z "$API_KEY" ]]; then
    echo "FATAL: INCIDENT_IO_API_KEY is not set" >&2
    exit 1
  fi
}

api_request() {
  local method="$1" path="$2" body="${3:-}" attempt=0
  local url="$API_BASE$path"

  while [[ "$attempt" -lt "$MAX_RETRIES" ]]; do
    attempt=$((attempt + 1))

    local curl_args=(-s -w '\n%{http_code}' -X "$method" "$url")
    curl_args+=(-H "Authorization: Bearer $API_KEY")
    curl_args+=(-H "Content-Type: application/json")
    curl_args+=(--connect-timeout 10 --max-time 30)
    [[ -n "$body" ]] && curl_args+=(-d "$body")

    local response http_code
    response="$(curl "${curl_args[@]}" 2>/dev/null)" || true
    http_code="$(echo "$response" | tail -n1)"
    local response_body
    response_body="$(echo "$response" | sed '$d')"

    if [[ -z "${http_code:-}" || "$http_code" == "000" ]]; then
      local wait_time="$((RETRY_BASE_SECS * 2 ** (attempt - 1)))"
      echo "Transport error — retrying in ${wait_time}s (attempt $attempt/$MAX_RETRIES)" >&2
      sleep "$wait_time"
      continue
    fi

    if [[ "$http_code" -eq 429 ]]; then
      local retry_after="$((RETRY_BASE_SECS * 2 ** (attempt - 1)))"
      local jitter="$((RANDOM % (retry_after / 2 + 1)))"
      local wait_time="$((retry_after + jitter))"
      echo "Rate limited (429) — retrying in ${wait_time}s (attempt $attempt/$MAX_RETRIES)" >&2
      sleep "$wait_time"
      continue
    fi

    if [[ "$http_code" -ge 500 ]]; then
      echo "Server error ($http_code) — retrying (attempt $attempt/$MAX_RETRIES)" >&2
      sleep "$((RETRY_BASE_SECS * 2 ** (attempt - 1)))"
      continue
    fi

    echo "HTTP_STATUS=$http_code"
    echo "$response_body"
    return 0
  done

  echo "FATAL: API request failed after $MAX_RETRIES attempts" >&2
  return 1
}

parse_body() { grep -v '^HTTP_STATUS=' || true; }
parse_status() { grep '^HTTP_STATUS=' | cut -d= -f2; }

# ---------------------------------------------------------------------------
# API operations
# ---------------------------------------------------------------------------

cmd_test_auth() {
  require_api_key
  echo "Testing Incident.io API authentication..."
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would GET /v2/identity"
    return 0
  fi
  local result
  result="$(api_request GET /v2/identity)"
  local status
  status="$(echo "$result" | parse_status)"
  if [[ "$status" == "200" ]]; then
    echo "Authentication successful"
    echo "$result" | parse_body | jq .
    return 0
  else
    echo "Authentication failed (HTTP $status)"
    echo "$result" | parse_body
    return 1
  fi
}

cmd_create_status_page() {
  local name="${1:-}" message="${2:-}" incident_status="${3:-investigating}" component_statuses_json="${4:-[]}"
  if [[ -z "$name" || -z "$STATUS_PAGE_ID" ]]; then
    echo "FATAL: name and INCIDENT_IO_STATUS_PAGE_ID are required" >&2
    exit 1
  fi
  require_api_key
  local idem_key
  idem_key="$(idempotency_key "frontal-sdk-sp")"

  local body
  body="$(jq -c -n '{
    status_page_id: $spid,
    name: $name,
    incident_status: $status,
    message: $msg,
    notify_subscribers: true,
    component_statuses: $comps,
    idempotency_key: $idem
  }' --arg spid "$STATUS_PAGE_ID" --arg name "$name" --arg status "$incident_status" \
     --arg msg "$message" --argjson comps "$component_statuses_json" --arg idem "$idem_key")"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would POST /v2/status_page_incidents"
    echo "$body" | jq .
    echo "STATUS_PAGE_INCIDENT_ID=dry-run-sp-id"
    return 0
  fi

  echo "Creating status page incident: $name"
  local result
  result="$(api_request POST /v2/status_page_incidents "$body")"
  local status
  status="$(echo "$result" | parse_status)"

  if [[ "$status" == "201" ]]; then
    local sp_incident_id
    sp_incident_id="$(echo "$result" | parse_body | jq -r '.status_page_incident.id')"
    echo "status_page_incident_id=$sp_incident_id" >> "$GITHUB_OUTPUT"
    echo "Status page incident created: $sp_incident_id"
    echo "$result" | parse_body | jq .
  else
    echo "Failed to create status page incident (HTTP $status)"
    echo "$result" | parse_body
    return 1
  fi
}

cmd_post_update() {
  local sp_incident_id="${1:-}" message="${2:-}" incident_status="${3:-}" component_statuses_json="${4:-}"
  if [[ -z "$sp_incident_id" || -z "$message" ]]; then
    echo "FATAL: status_page_incident_id and message are required" >&2
    exit 1
  fi
  require_api_key

  local body
  body="$(jq -c -n '{
    status_page_incident_id: $id,
    message: $msg,
    notify_subscribers: true
  }' --arg id "$sp_incident_id" --arg msg "$message")"

  if [[ -n "$incident_status" ]]; then
    body="$(echo "$body" | jq -c --arg st "$incident_status" '. + {incident_status: $st}')"
  fi
  if [[ -n "$component_statuses_json" && "$component_statuses_json" != "null" ]]; then
    body="$(echo "$body" | jq -c --argjson comps "$component_statuses_json" '. + {component_statuses: $comps}')"
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would POST /v2/status_page_incident_updates"
    echo "$body" | jq .
    return 0
  fi

  echo "Posting update to status page incident: $sp_incident_id"
  local result
  result="$(api_request POST /v2/status_page_incident_updates "$body")"
  local status
  status="$(echo "$result" | parse_status)"

  if [[ "$status" == "201" ]]; then
    echo "Update posted successfully"
    echo "$result" | parse_body | jq .
  else
    echo "Failed to post update (HTTP $status)"
    echo "$result" | parse_body
    return 1
  fi
}

cmd_resolve() {
  local sp_incident_id="${1:-}"
  local message="${2:-All SDK synthetic checks passing. SDK is fully operational.}"
  if [[ -z "$sp_incident_id" ]]; then
    echo "FATAL: status_page_incident_id is required" >&2
    exit 1
  fi
  require_api_key

  local body
  body="$(jq -c -n '{
    status_page_incident_id: $id,
    incident_status: "resolved",
    message: $msg,
    notify_subscribers: true
  }' --arg id "$sp_incident_id" --arg msg "$message")"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would POST /v2/status_page_incident_updates (resolve)"
    echo "$body" | jq .
    return 0
  fi

  echo "Resolving status page incident: $sp_incident_id"
  local result
  result="$(api_request POST /v2/status_page_incident_updates "$body")"
  local status
  status="$(echo "$result" | parse_status)"

  if [[ "$status" == "201" ]]; then
    echo "Incident resolved — all components auto-reverted to operational"
    echo "$result" | parse_body | jq .
  else
    echo "Failed to resolve incident (HTTP $status)"
    echo "$result" | parse_body
    return 1
  fi
}

cmd_list_active_incidents() {
  require_api_key
  local query="status_category[one_of]=live&status_category[one_of]=triage"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would GET /v2/incidents?$query"
    return 0
  fi
  local result
  result="$(api_request GET "/v2/incidents?$query")"
  local status
  status="$(echo "$result" | parse_status)"
  if [[ "$status" == "200" ]]; then
    echo "$result" | parse_body | jq -r '.incidents[] | "\(.id) \(.name) [\(.severity.name // "unknown")]"'
  else
    echo "Failed to list incidents (HTTP $status)" >&2
    return 1
  fi
}

cmd_get_status_page_structure() {
  local sp_id="${1:-$STATUS_PAGE_ID}"
  require_api_key
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would GET /v2/status_page_structures/$sp_id"
    return 0
  fi
  local result
  result="$(api_request GET "/v2/status_page_structures/$sp_id")"
  local status
  status="$(echo "$result" | parse_status)"
  if [[ "$status" == "200" ]]; then
    echo "$result" | parse_body | jq .
  else
    echo "Failed to get status page structure (HTTP $status)" >&2
    return 1
  fi
}

cmd_derive_severity() {
  local failed_services="${1:-0}"
  local thresholds_file="${GITHUB_WORKSPACE:-.}/.github/incident/thresholds.json"
  local minor_max=1 major_max=2
  if [[ -f "$thresholds_file" ]]; then
    minor_max="$(jq -r '.severity.minor.max_failed_services // 1' "$thresholds_file")"
    major_max="$(jq -r '.severity.major.max_failed_services // 2' "$thresholds_file")"
  fi
  if [[ "$failed_services" -le "$minor_max" ]]; then
    echo "${INCIDENT_IO_SEVERITY_MINOR_ID:-minor}"
  elif [[ "$failed_services" -le "$major_max" ]]; then
    echo "${INCIDENT_IO_SEVERITY_MAJOR_ID:-major}"
  else
    echo "${INCIDENT_IO_SEVERITY_CRITICAL_ID:-critical}"
  fi
}

cmd_resolve_component() {
  local component_name="${1:-SDKs}"
  require_api_key

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "DRY RUN: Would resolve component ID for '$component_name'"
    echo "resolved_component_id=dry-run-component-id"
    return 0
  fi

  local structure
  structure="$(cmd_get_status_page_structure "$STATUS_PAGE_ID")"
  local cid
  cid="$(echo "$structure" | jq -r --arg name "$component_name" \
    '.status_page_structure.components[]? | select(.name == $name) | .component_id // empty' 2>/dev/null)"

  if [[ -z "$cid" ]]; then
    echo "FATAL: Could not find component '$component_name' on status page $STATUS_PAGE_ID" >&2
    echo "Available components:"
    echo "$structure" | jq -r '.status_page_structure.components[]? | "  - \(.name) (\(.component_id))"' 2>/dev/null
    return 1
  fi

  echo "Resolved component '$component_name' → $cid"
  echo "resolved_component_id=$cid" >> "$GITHUB_OUTPUT"
  echo "$cid"
}

# ---------------------------------------------------------------------------
# dispatch
# ---------------------------------------------------------------------------

case "${1:-}" in
  test-auth)
    cmd_test_auth
    ;;
  create-status-page)
    cmd_create_status_page "${2:-}" "${3:-}" "${4:-}" "${5:-}"
    ;;
  post-update)
    cmd_post_update "${2:-}" "${3:-}" "${4:-}" "${5:-}"
    ;;
  resolve)
    cmd_resolve "${2:-}" "${3:-}"
    ;;
  list-active-incidents)
    cmd_list_active_incidents
    ;;
  get-status-page-structure)
    cmd_get_status_page_structure "${2:-}"
    ;;
  derive-severity)
    cmd_derive_severity "${2:-}"
    ;;
  resolve-component)
    cmd_resolve_component "${2:-SDKs}"
    ;;
  *)
    echo "Usage: $0 {test-auth|create-status-page|post-update|resolve|list-active-incidents|get-status-page-structure|derive-severity|resolve-component [name]}" >&2
    exit 1
    ;;
esac
