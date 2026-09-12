import { type FrontalClient, getDefaultClient } from "@frontal-labs/core";
import type { SdkConfig } from "./config";
import { Frontal } from "./sdk";

/**
 * Creates a unified {@link Frontal} SDK client from a {@link FrontalClient}
 * instance or an {@link SdkConfig} configuration object.
 *
 * Equivalent to `new Frontal(config)`.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @returns A configured `Frontal` client with access to all service namespaces.
 */
export function createFrontalClient(
  config: SdkConfig | FrontalClient
): Frontal {
  return new Frontal(config);
}

/**
 * Convenience singleton proxy for the unified Frontal SDK.
 * Lazily initialises from environment variables on first property access.
 *
 * @deprecated Prefer `new Frontal({ apiKey })` so configuration is explicit
 * and testable. This export stays for back-compat and will not be removed
 * without a major version bump.
 */
let _frontalCache: Frontal | undefined;

export const frontal = new Proxy<Frontal>({} as Frontal, {
  get(_t, prop) {
    if (!_frontalCache) {
      _frontalCache = createFrontalClient(getDefaultClient());
    }
    const inst = _frontalCache;
    const val = (inst as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(inst)
      : val;
  },
});
