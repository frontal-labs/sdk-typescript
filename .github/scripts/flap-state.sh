#!/usr/bin/env bash
set -uo pipefail
# NOTE: set -e is OFF intentionally — errexit interacts poorly with command
# substitution inside if-conditions in some shell versions.

# ---------------------------------------------------------------------------
# flap-state.sh — Flap prevention state machine for SDK synthetic monitoring
#
# Usage:
#   flap-state.sh init                         Create fresh flap-state.json
#   flap-state.sh update <run-result.json>     Update counters, emit action
#   flap-state.sh resolve                      Mark incident as resolved
#   flap-state.sh evaluate                     Print recommended action
#
# Environment:
#   FLAP_STATE_FILE      Path to flap-state.json (default: ./flap-state.json)
#   FAIL_THRESHOLD       Consecutive failures before alert (default: 3)
#   RECOVER_THRESHOLD    Consecutive successes before resolve (default: 2)
# ---------------------------------------------------------------------------

readonly STATE_FILE="${FLAP_STATE_FILE:-flap-state.json}"
readonly FAIL_THRESHOLD="${FAIL_THRESHOLD:-3}"
readonly RECOVER_THRESHOLD="${RECOVER_THRESHOLD:-2}"

require_jq() {
  if ! command -v jq &>/dev/null; then
    echo "ERROR: jq is required but not installed" >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# init
# ---------------------------------------------------------------------------

cmd_init() {
  require_jq
  cat > "$STATE_FILE" <<'EOF'
{
  "environment": "production",
  "updated_at": "",
  "consecutive_failures": 0,
  "consecutive_successes": 0,
  "status_page_incident_id": null,
  "alerting": false,
  "last_run_timestamp": "",
  "last_failure_details": null,
  "history": []
}
EOF
  local now
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  if jq --arg now "$now" '.updated_at = $now | .last_run_timestamp = $now' "$STATE_FILE" > "${STATE_FILE}.tmp" && \
     jq -e . "${STATE_FILE}.tmp" > /dev/null; then
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
  else
    echo "ERROR: failed to initialize flap state" >&2
    rm -f "${STATE_FILE}.tmp"
    exit 1
  fi
  echo "Initialized fresh flap-state at $STATE_FILE"
  cat "$STATE_FILE"
}

# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------

cmd_update() {
  require_jq
  local run_result="${1:-run-result.json}"

  if [[ ! -f "$run_result" ]]; then
    echo "ERROR: run-result.json not found at $run_result" >&2
    exit 1
  fi

  if [[ ! -f "$STATE_FILE" ]]; then
    echo "State file not found — initializing fresh state"
    cmd_init
  fi

  local now
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local consecutive_failures consecutive_successes alerting
  consecutive_failures="$(jq -r '.consecutive_failures // 0' "$STATE_FILE" 2>/dev/null)" || true
  consecutive_successes="$(jq -r '.consecutive_successes // 0' "$STATE_FILE" 2>/dev/null)" || true
  alerting="$(jq -r '.alerting // false' "$STATE_FILE" 2>/dev/null)" || true
  [[ -z "$consecutive_failures" || "$consecutive_failures" == "null" ]] && consecutive_failures=0
  [[ -z "$consecutive_successes" || "$consecutive_successes" == "null" ]] && consecutive_successes=0
  [[ -z "$alerting" || "$alerting" == "null" ]] && alerting="false"

  local overall_status failed_services total_duration
  overall_status="$(jq -r '.summary.overall_status // "unknown"' "$run_result" 2>/dev/null)" || true
  if [[ -z "$overall_status" || "$overall_status" == "null" ]]; then
    echo "ERROR: invalid run-result.json — missing summary.overall_status" >&2
    exit 1
  fi
  failed_services="$(jq -r '.summary.services_failed // 0' "$run_result" 2>/dev/null)" || true
  [[ -z "$failed_services" || "$failed_services" == "null" ]] && failed_services=0
  total_duration="$(jq -r '.overall_duration_ms // 0' "$run_result" 2>/dev/null)" || true
  [[ -z "$total_duration" || "$total_duration" == "null" ]] && total_duration=0

  local total_checks
  total_checks="$(jq -r '.summary.checks_passed + .summary.checks_failed' "$run_result" 2>/dev/null)" || true
  [[ -z "$total_checks" || "$total_checks" == "null" ]] && total_checks=0

  local failure_details="null"
  if [[ "$overall_status" == "fail" ]]; then
    failure_details="$(jq -c --arg now "$now" '
      [.results[] | select(.status == "fail")] |
      { failed_at: $now, total_failures: length, failures: . }
    ' "$run_result" 2>/dev/null)" || true
    [[ -z "$failure_details" ]] && failure_details="null"
  fi

  # Update hysteresis counters
  if [[ "$overall_status" == "fail" ]]; then
    consecutive_failures=$((consecutive_failures + 1))
    consecutive_successes=0
  else
    consecutive_successes=$((consecutive_successes + 1))
    consecutive_failures=0
  fi

  # Determine action
  local action="no-op"
  if [[ "$alerting" == "false" && "$consecutive_failures" -ge "$FAIL_THRESHOLD" ]]; then
    action="create"
    alerting="true"
  elif [[ "$alerting" == "true" && "$consecutive_failures" -ge "$FAIL_THRESHOLD" ]]; then
    action="update"
  elif [[ "$alerting" == "true" && "$consecutive_successes" -ge "$RECOVER_THRESHOLD" ]]; then
    action="resolve"
    alerting="false"
  fi

  # Append history entry
  local history_entry
  history_entry="$(jq -c -n '{
    timestamp: $now,
    status: $status,
    services_failed: ($failed | tonumber),
    duration_ms: ($dur | tonumber),
    action: $action
  }' --arg now "$now" --arg status "${overall_status:-unknown}" \
     --arg failed "${failed_services:-0}" --arg dur "${total_duration:-0}" --arg action "${action:-no-op}" 2>/dev/null)" || true
  [[ -z "$history_entry" ]] && history_entry='{"timestamp":"","status":"unknown","services_failed":0,"duration_ms":0,"action":"no-op"}'

  # Write updated state
  jq \
    --arg now "$now" \
    --arg cf "$consecutive_failures" \
    --arg cs "$consecutive_successes" \
    --arg alerting "$alerting" \
    --arg details "$failure_details" \
    --arg entry "$history_entry" \
    '
    .updated_at = $now |
    .consecutive_failures = ($cf | tonumber) |
    .consecutive_successes = ($cs | tonumber) |
    .alerting = ($alerting | test("^true$")) |
    .last_failure_details = ($details | fromjson) |
    .last_run_timestamp = $now |
    .history = ([($entry | fromjson)] + .history) | .history |= .[0:96]
    ' "$STATE_FILE" > "${STATE_FILE}.tmp"

  if ! jq -e . "${STATE_FILE}.tmp" > /dev/null; then
    echo "ERROR: flap state update produced invalid JSON — keeping original state" >&2
    rm -f "${STATE_FILE}.tmp"
    exit 1
  fi
  mv "${STATE_FILE}.tmp" "$STATE_FILE"

  echo "action=$action" >> "$GITHUB_OUTPUT"
  echo "consecutive_failures=$consecutive_failures" >> "$GITHUB_OUTPUT"
  echo "consecutive_successes=$consecutive_successes" >> "$GITHUB_OUTPUT"
  echo "alerting=$alerting" >> "$GITHUB_OUTPUT"

  echo "Flap state updated: action=$action failures=$consecutive_failures successes=$consecutive_successes alerting=$alerting"
}

# ---------------------------------------------------------------------------
# resolve
# ---------------------------------------------------------------------------

cmd_resolve() {
  require_jq
  local now
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  if [[ ! -f "$STATE_FILE" ]]; then
    echo "No state file found — nothing to resolve"
    exit 0
  fi

  jq \
    --arg now "$now" \
    '
    .updated_at = $now |
    .alerting = false |
    .consecutive_failures = 0 |
    .consecutive_successes = 0 |
    .status_page_incident_id = null |
    .last_failure_details = null
    ' "$STATE_FILE" > "${STATE_FILE}.tmp"

  if ! jq -e . "${STATE_FILE}.tmp" > /dev/null; then
    echo "ERROR: flap state resolve produced invalid JSON" >&2
    rm -f "${STATE_FILE}.tmp"
    exit 1
  fi
  mv "${STATE_FILE}.tmp" "$STATE_FILE"

  echo "Flap state resolved: alerting=false, counters reset, incident IDs cleared"
}

# ---------------------------------------------------------------------------
# evaluate
# ---------------------------------------------------------------------------

cmd_evaluate() {
  require_jq
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "action=no-op"
    echo "No state file — recommending no-op"
    exit 0
  fi

  local consecutive_failures consecutive_successes alerting action
  consecutive_failures="$(jq -r '.consecutive_failures' "$STATE_FILE")"
  consecutive_successes="$(jq -r '.consecutive_successes' "$STATE_FILE")"
  alerting="$(jq -r '.alerting' "$STATE_FILE")"

  action="no-op"
  if [[ "$alerting" == "false" && "$consecutive_failures" -ge "$FAIL_THRESHOLD" ]]; then
    action="create"
  elif [[ "$alerting" == "true" && "$consecutive_failures" -ge "$FAIL_THRESHOLD" ]]; then
    action="update"
  elif [[ "$alerting" == "true" && "$consecutive_successes" -ge "$RECOVER_THRESHOLD" ]]; then
    action="resolve"
  fi

  echo "action=$action"
  echo "consecutive_failures=$consecutive_failures"
  echo "consecutive_successes=$consecutive_successes"
  echo "alerting=$alerting"
  echo "Evaluation: action=$action (failures=$consecutive_failures/$FAIL_THRESHOLD successes=$consecutive_successes/$RECOVER_THRESHOLD alerting=$alerting)"
}

# ---------------------------------------------------------------------------
# dispatch
# ---------------------------------------------------------------------------

case "${1:-}" in
  init)
    cmd_init
    ;;
  update)
    cmd_update "${2:-run-result.json}"
    ;;
  resolve)
    cmd_resolve
    ;;
  evaluate)
    cmd_evaluate
    ;;
  *)
    echo "Usage: $0 {init|update <run-result.json>|resolve|evaluate}" >&2
    exit 1
    ;;
esac
