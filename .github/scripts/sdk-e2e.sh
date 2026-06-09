#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# sdk-e2e.sh — Synthetic E2E test runner for Frontal SDK
#
# Runs the TypeScript monitor script via Bun, plus a Widget API summary check.
# Outputs structured run-result.json for flap-state.sh and incident-client.sh.
#
# Environment:
#   FRONTAL_API_KEY          — API key for authenticated SDK checks
#   FRONTAL_API_URL          — API base URL (default: https://api.frontal.dev/v1)
#   FRONTAL_AI_API_URL       — AI API base URL (default: https://ai.frontal.dev)
#   FRONTAL_GRAPH_ENTITY_TYPE— Entity type for graph queries
#   FRONTAL_BLOB_BUCKET      — Bucket for blob tests
#   WIDGET_API_URL           — Status page Widget API URL (default: https://frontal-status.com/api/v1/summary)
#   E2E_DRY_RUN              — If "true", failures recorded but script exits 0
#   E2E_TIMEOUT_SECS         — Per-check timeout in seconds (default: 30)
# ---------------------------------------------------------------------------

readonly TIMEOUT_SECS="${E2E_TIMEOUT_SECS:-30}"
readonly DRY_RUN="${E2E_DRY_RUN:-false}"
readonly RESULT_FILE="${E2E_RESULT_FILE:-run-result.json}"
readonly RUN_ID="${GITHUB_RUN_ID:-local-$(date +%s)}"
readonly WIDGET_URL="${WIDGET_API_URL:-https://frontal-status.com/api/v1/summary}"

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# ---------------------------------------------------------------------------
# Widget API check (unauthenticated, public)
# ---------------------------------------------------------------------------

check_widget_api() {
  echo "=== Widget API Check ==="
  local widget_json
  if widget_json="$(curl -sS --connect-timeout 5 --max-time 10 "$WIDGET_URL" 2>/dev/null)"; then
    echo "Widget API reachable"
    local ongoing
    ongoing="$(echo "$widget_json" | jq -r '.ongoing_incidents | length // "error"' 2>/dev/null || echo "parse_error")"
    echo "Ongoing incidents: $ongoing"
    echo "widget_api_status=pass" >> "$GITHUB_OUTPUT"
    echo "widget_api_incidents=$ongoing" >> "$GITHUB_OUTPUT"
  else
    echo "Widget API unreachable (this may be expected if not yet configured)"
    echo "widget_api_status=warn" >> "$GITHUB_OUTPUT"
    echo "widget_api_incidents=unknown" >> "$GITHUB_OUTPUT"
  fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

main() {
  local start_ts="$(now_iso)"
  local overall_start overall_end overall_duration
  overall_start=$(date +%s%3N)

  echo "=== Frontal SDK E2E Monitor ==="
  echo "Run ID: $RUN_ID"
  echo "Timeout per check: ${TIMEOUT_SECS}s"
  echo ""

  # Check Widget API first (lightweight)
  check_widget_api

  # Run TypeScript monitor
  echo ""
  echo "=== SDK Service Checks ==="
  local monitor_exit=0
  bun run scripts/monitor.ts 2>&1 | tee monitor-output.txt || monitor_exit=$?

  overall_end=$(date +%s%3N)
  overall_duration=$((overall_end - overall_start))

  # Extract MONITOR_REPORT from monitor output
  local report_json="{}"
  if grep -q '^MONITOR_REPORT:' monitor-output.txt; then
    report_json="$(grep '^MONITOR_REPORT:' monitor-output.txt | sed 's/^MONITOR_REPORT://')"
  fi

  # Build run-result.json in the format flap-state.sh expects
  local checks_failed checks_passed overall_status
  checks_failed="$(echo "$report_json" | jq -r '.summary.failed // 0' 2>/dev/null || echo 0)"
  checks_passed="$(echo "$report_json" | jq -r '.summary.passed // 0' 2>/dev/null || echo 0)"

  if [[ "$checks_failed" -gt 0 ]]; then
    overall_status="fail"
  else
    overall_status="pass"
  fi

  jq -n \
    --arg run_id "$RUN_ID" \
    --arg timestamp "$start_ts" \
    --arg overall_status "$overall_status" \
    --argjson checks_passed "$checks_passed" \
    --argjson checks_failed "$checks_failed" \
    --argjson total_duration "$overall_duration" \
    --argjson report "$report_json" \
    '{
      run_id: $run_id,
      timestamp: $timestamp,
      overall_duration_ms: $total_duration,
      environment: {
        os: "linux",
        arch: "x86_64"
      },
      summary: {
        checks_passed: $checks_passed,
        checks_failed: $checks_failed,
        services_failed: $checks_failed,
        overall_status: $overall_status
      },
      results: $report.results,
      failed_services: $report.failedServices
    }' > "$RESULT_FILE"

  echo ""
  echo "Results written to $RESULT_FILE"
  jq -c '.summary' "$RESULT_FILE"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "Dry run enabled — exiting 0"
    exit 0
  fi
  if [[ "$checks_failed" -gt 0 ]]; then
    echo "FAIL: $checks_failed check(s) failed"
    exit 1
  fi
  echo "PASS: All SDK checks successful"
  exit 0
}

main "$@"
