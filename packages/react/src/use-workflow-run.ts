import type { SdkError } from "@frontal-labs/core";
import type { Approval, WorkflowsSdk } from "@frontal-labs/workflows";
import { useCallback, useEffect, useState } from "react";

/** Options for {@link useWorkflowApprovals}. */
export interface UseWorkflowApprovalsOptions {
  /** Filter by status (default `"pending"`). */
  status?: string;
  /** Poll interval in ms; `0` (default) disables polling. */
  pollIntervalMs?: number;
  /** Fetch on mount (default true). */
  enabled?: boolean;
}

/** Return value of {@link useWorkflowApprovals}. */
export interface UseWorkflowApprovalsResult {
  approvals: Approval[];
  loading: boolean;
  error: SdkError | undefined;
  refresh: () => Promise<void>;
  approve: (id: string, comment?: string) => Promise<Approval | undefined>;
  reject: (id: string, comment?: string) => Promise<Approval | undefined>;
}

/**
 * List and act on workflow approvals — the human side of an agent's
 * `approveWhen` contract.
 *
 * @example
 * ```tsx
 * const { approvals, approve, reject } = useWorkflowApprovals(f.workflows);
 * ```
 */
export function useWorkflowApprovals(
  workflows: WorkflowsSdk,
  options: UseWorkflowApprovalsOptions = {}
): UseWorkflowApprovalsResult {
  const { status = "pending", pollIntervalMs = 0, enabled = true } = options;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SdkError | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await workflows.approvals.list({ status });
      setApprovals(page.data);
      setError(undefined);
    } catch (err) {
      setError(err as SdkError);
    } finally {
      setLoading(false);
    }
  }, [status, workflows]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    if (!pollIntervalMs) return;
    const timer = setInterval(() => void refresh(), pollIntervalMs);
    return () => clearInterval(timer);
  }, [enabled, pollIntervalMs, refresh]);

  const act = useCallback(
    async (fn: () => Promise<Approval>, id: string) => {
      try {
        const updated = await fn();
        setApprovals((prev) =>
          prev
            .map((a) => (a.id === id ? updated : a))
            .filter((a) => a.status === status)
        );
        return updated;
      } catch (err) {
        setError(err as SdkError);
        return undefined;
      }
    },
    [status]
  );

  const approve = useCallback(
    (id: string, comment?: string) =>
      act(() => workflows.approvals.approve(id, comment), id),
    [act, workflows]
  );
  const reject = useCallback(
    (id: string, comment?: string) =>
      act(() => workflows.approvals.reject(id, comment), id),
    [act, workflows]
  );

  return { approvals, loading, error, refresh, approve, reject };
}
