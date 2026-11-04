/**
 * Behaviour of the runtime checks that replaced type assertions: error fields
 * are filtered per entry, and page construction validates its arguments.
 */

import { describe, expect, it } from "vitest";
import { parseFrontalError } from "../src/errors";
import { createPageResult } from "../src/pagination";

const VALID_FIELD = { field: "email", code: "invalid", message: "bad" };

describe("error fields", () => {
  it("keeps valid entries and drops malformed ones individually", () => {
    const error = parseFrontalError(
      {
        code: "VALIDATION",
        message: "invalid input",
        fields: [VALID_FIELD, { field: 3 }, VALID_FIELD],
      },
      400
    );
    expect(error).toMatchObject({ fields: [VALID_FIELD, VALID_FIELD] });
  });

  it("defaults to an empty field list when the body has none", () => {
    const error = parseFrontalError(
      { code: "VALIDATION", message: "invalid input" },
      400
    );
    expect(error).toMatchObject({ fields: [] });
  });
});

describe("createPageResult", () => {
  const pagination = { cursor: "c1", hasMore: true };

  it("passes the cursor to a cursor-based fetcher", async () => {
    const seen: string[] = [];
    const page = createPageResult([1], pagination, async (cursor: string) => {
      seen.push(cursor);
      return createPageResult([2], { cursor: "c2", hasMore: false });
    });
    const next = await page.nextPage();
    expect(seen).toEqual(["c1"]);
    expect(next?.data).toEqual([2]);
  });

  it("accepts an offset-based fetcher that takes no arguments", async () => {
    const page = createPageResult([1], pagination, async () =>
      createPageResult([3], { cursor: "c3", hasMore: false })
    );
    expect((await page.nextPage())?.data).toEqual([3]);
  });

  it("rejects an item array without pagination info", () => {
    expect(() =>
      createPageResult(
        [1],
        undefined as unknown as { cursor: string; hasMore: boolean }
      )
    ).toThrow(TypeError);
  });

  it("builds from a raw envelope", () => {
    const page = createPageResult({
      data: [4],
      pagination: { cursor: "c4", hasMore: false },
    });
    expect(page.data).toEqual([4]);
  });
});
