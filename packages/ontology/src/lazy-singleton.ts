/**
 * True when `key` names a member of `obj` (own or inherited). Narrows the key
 * so the lookup is checked by the compiler instead of cast to a record.
 */
function isOwnMember<T extends object>(
  obj: T,
  key: PropertyKey
): key is keyof T {
  return key in obj;
}

/**
 * True for a callable member. Narrowing to a concrete signature keeps
 * `bind` typed; `Function.prototype.bind` alone would return `any`.
 */
function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Returns a facade that creates its instance on first property access.
 *
 * Reads of names the instance does not have return `undefined`. Methods are
 * bound to the instance, so they keep `this` when called through the facade.
 */
export function lazySingleton<T extends object>(init: () => T): T {
  let instance: T | undefined;
  // The one cast in this module. A Proxy needs a target object before the
  // instance exists. Every trap forwards to the lazily created instance, so the
  // placeholder is never read.
  const placeholder = {} as T;
  return new Proxy<T>(placeholder, {
    get(_target, prop) {
      instance ??= init();
      if (!isOwnMember(instance, prop)) {
        return undefined;
      }
      const value: unknown = instance[prop];
      return isCallable(value) ? value.bind(instance) : value;
    },
  });
}
