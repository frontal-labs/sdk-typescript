import { type ZodType, z } from "zod";
import { declaredResponse } from "./boundary";
import { invalidRequestError } from "./errors";
import type { PaginationMeta } from "./schemas";
import { responseMetaSchema } from "./schemas";
import type { PageResult } from "./types";

/**
 * Safe type assertion for paginated API response payloads.
 * Casts raw unknown response to the paginated shape expected by createPageResult.
 */
export function asPagePayload<T>(raw: unknown): {
  data: T[];
  pagination: PaginationMeta;
  meta?: unknown;
} {
  // The envelope itself is checked by the caller's pagination parse; `T` is the
  // caller's element type.
  return declaredResponse<{
    data: T[];
    pagination: PaginationMeta;
    meta?: unknown;
  }>(raw);
}

const paginationSchema = z
  .object({
    cursor: z.string().min(1),
    hasMore: z.boolean(),
    total: z.number().int().min(0).optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();

/**
 * Creates a Zod schema for paginated API responses.
 */
export function pageResultSchema<T extends ZodType>(itemSchema: T) {
  const effectiveItemSchema =
    itemSchema instanceof z.ZodObject ? itemSchema.loose() : itemSchema;

  return z
    .object({
      data: z.array(effectiveItemSchema),
      meta: responseMetaSchema.optional(),
      pagination: paginationSchema,
    })
    .strict();
}

type PaginationInfo = z.infer<typeof paginationSchema>;

/**
 * A caller's page fetcher. Offset-based fetchers take no arguments and are
 * assignable here; cursor-based fetchers receive the current cursor.
 */
type FetchNextPage<T> = (cursor: string) => Promise<PageResult<T> | null>;
type FetchNext<T> = () => Promise<PageResult<T> | null>;
type MutablePageResult<T> = PageResult<T> & {
  _fetchNextPage: FetchNext<T>;
  _fallbackFetchNextPage?: FetchNext<T>;
};

/**
 * Pagination info is an object. Offset-only responses have no cursor, so only
 * the shape of the object is checked, as before.
 */
function isPaginationInfo(value: unknown): value is PaginationInfo {
  return typeof value === "object" && value !== null;
}

function isFetchNextPage<T>(value: unknown): value is FetchNextPage<T> {
  return typeof value === "function";
}

/** True for pages built by this module, which carry the fallback fetcher. */
function isMutablePage<T>(page: PageResult<T>): page is MutablePageResult<T> {
  return "_fetchNextPage" in page;
}

function bindFetchNext<T>(
  fetchNextPage: FetchNextPage<T> | undefined,
  pagination: PaginationInfo
): FetchNext<T> {
  return async () => {
    if (!fetchNextPage) return null;
    return fetchNextPage(pagination.cursor);
  };
}

/** Response metadata, or `undefined` when it is absent or malformed. */
function parseResponseMeta(
  value: unknown
): z.infer<typeof responseMetaSchema> | undefined {
  const parsed = responseMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function buildPageResult<T>(
  data: T[],
  pagination: z.infer<typeof paginationSchema>,
  fetchNext: FetchNext<T>,
  meta?: unknown
): PageResult<T> {
  let nextPagePromise: Promise<PageResult<T> | null> | null = null;

  const page: MutablePageResult<T> = {
    data,
    meta: parseResponseMeta(meta),
    pagination,
    _fetchNextPage: fetchNext,
    async nextPage() {
      if (!this.pagination.hasMore) return null;
      if (!nextPagePromise) {
        nextPagePromise = (async () => {
          let result = await this._fetchNextPage();
          if (!result && this._fallbackFetchNextPage) {
            result = await this._fallbackFetchNextPage();
          }

          if (result && isMutablePage(result)) {
            result._fallbackFetchNextPage =
              this._fallbackFetchNextPage ?? this._fetchNextPage;
          }

          return result;
        })().finally(() => {
          nextPagePromise = null;
        });
      }
      return nextPagePromise;
    },
    async all() {
      const items: T[] = [...this.data];
      let current: PageResult<T> | null = this;

      while (current) {
        if (!current.pagination.hasMore) break;
        current = await current.nextPage();
        if (!current) break;
        items.push(...current.data);
      }

      return items;
    },
    [Symbol.asyncIterator]() {
      let current: PageResult<T> | null = this;
      let items: Iterator<T, undefined> | undefined;

      return {
        async next(): Promise<IteratorResult<T, undefined>> {
          while (current) {
            items ??= current.data[Symbol.iterator]();
            const step = items.next();
            if (!step.done) {
              return { done: false, value: step.value };
            }

            if (!current.pagination.hasMore) {
              current = null;
              break;
            }

            current = await current.nextPage();
            items = undefined;
          }

          return { done: true, value: undefined };
        },
      };
    },
  };

  return page;
}

/** The raw envelope form of `createPageResult`. */
interface RawPage<T> {
  data: T[];
  meta?: unknown;
  pagination: PaginationInfo;
}

/**
 * Creates a PageResult with lazy page fetching and async iteration support.
 *
 * Accepts two call signatures:
 * 1. `createPageResult(data[], pagination, fetchNext?, meta?)` — array-based.
 * 2. `createPageResult(raw, fetchNext?)` — raw payload with embedded pagination.
 *
 * The `fetchNext` callback can take a cursor string (for cursor-based APIs)
 * or no arguments (for offset-based APIs).
 *
 * @typeParam T - The item type of the page.
 * @returns A PageResult with `nextPage()`, `all()`, and `Symbol.asyncIterator`.
 */
export function createPageResult<T>(
  data: T[],
  pagination: PaginationInfo,
  fetchNext?: FetchNextPage<T>,
  meta?: unknown
): PageResult<T>;
export function createPageResult<T>(
  raw: RawPage<T>,
  fetchNext?: FetchNextPage<T>
): PageResult<T>;
export function createPageResult<T>(
  dataOrRaw: T[] | RawPage<T>,
  paginationOrFetchNext?: PaginationInfo | FetchNextPage<T>,
  fetchNextOrMeta?: unknown,
  meta?: unknown
): PageResult<T> {
  if (Array.isArray(dataOrRaw)) {
    if (!isPaginationInfo(paginationOrFetchNext)) {
      throw invalidRequestError(
        "createPageResult: an item array needs pagination info as its second argument"
      );
    }
    const fetchNext = bindFetchNext(
      isFetchNextPage<T>(fetchNextOrMeta) ? fetchNextOrMeta : undefined,
      paginationOrFetchNext
    );
    return buildPageResult(dataOrRaw, paginationOrFetchNext, fetchNext, meta);
  }

  const fetchNext = bindFetchNext(
    isFetchNextPage<T>(paginationOrFetchNext)
      ? paginationOrFetchNext
      : undefined,
    dataOrRaw.pagination
  );
  return buildPageResult(
    Array.isArray(dataOrRaw.data) ? dataOrRaw.data : [],
    dataOrRaw.pagination,
    fetchNext,
    dataOrRaw.meta
  );
}
