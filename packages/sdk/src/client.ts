import { type FrontalClient, getDefaultClient } from "@frontal-labs/core";
import type {
  OntologyDefinition,
  OntologyRuntimeArgs,
} from "@frontal-labs/ontology";
import type { SdkConfig } from "./config";
import type { FrontalOntologyRegistry } from "./index";
import { Frontal } from "./sdk";

/**
 * Creates a unified {@link Frontal} SDK client from a {@link FrontalClient}
 * instance or an {@link SdkConfig} configuration object.
 *
 * Equivalent to `new Frontal(config)`.
 *
 * Pass the generated `Ontology` type as `TOntology` to get typed entity
 * handles on `ontology`. `runtime` is the metadata literal emitted by the
 * Frontal CLI into `.frontal/client.ts`.
 *
 * @param config - An existing `FrontalClient` or a config object with `apiKey`.
 * @param runtime - Ontology runtime metadata emitted by the Frontal CLI. Required
 *   when `TOntology` has entities.
 * @returns A configured `Frontal` client with access to all service namespaces.
 */
export function createFrontalClient<
  TOntology extends OntologyDefinition<TOntology> = FrontalOntologyRegistry,
>(
  config: SdkConfig | FrontalClient,
  ...runtime: OntologyRuntimeArgs<TOntology>
): Frontal<TOntology> {
  return new Frontal<TOntology>(config, ...runtime);
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
