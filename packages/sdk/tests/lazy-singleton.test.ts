import { describe, expect, it } from "vitest";
import { lazySingleton } from "../src/lazy-singleton";

interface Counter {
  readonly label: string;
  count(): number;
}

describe("lazySingleton", () => {
  it("creates the instance on first access, and only once", () => {
    let created = 0;
    const facade = lazySingleton<Counter>(() => {
      created += 1;
      return { label: "c", count: () => created };
    });
    expect(created).toBe(0);
    expect(facade.label).toBe("c");
    expect(facade.count()).toBe(1);
    expect(created).toBe(1);
  });

  it("returns undefined for names the instance does not have", () => {
    const facade = lazySingleton<Counter>(() => ({
      label: "c",
      count: () => 0,
    }));
    const missing: unknown = Reflect.get(facade, "missing");
    expect(missing).toBeUndefined();
  });

  it("binds methods so they keep this when called through the facade", () => {
    class Box {
      private value = 7;
      read(): number {
        return this.value;
      }
    }
    const facade = lazySingleton(() => new Box());
    const read = facade.read;
    expect(read()).toBe(7);
  });
});
