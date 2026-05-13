import { type ZodType, z } from "zod";
import { responseMetaSchema } from "./schemas";
import type { PageResult } from "./types";

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
		itemSchema instanceof z.ZodObject ? itemSchema.passthrough() : itemSchema;

	return z
		.object({
			data: z.array(effectiveItemSchema),
			meta: responseMetaSchema.optional(),
			pagination: paginationSchema,
		})
		.strict();
}

type FetchNext<T> = () => Promise<PageResult<T> | null>;
type MutablePageResult<T> = PageResult<T> & {
	_fetchNextPage: FetchNext<T>;
	_fallbackFetchNextPage?: FetchNext<T>;
};

function buildPageResult<T>(
	data: T[],
	pagination: z.infer<typeof paginationSchema>,
	fetchNext: FetchNext<T>,
	meta?: unknown,
): PageResult<T> {
	let nextPagePromise: Promise<PageResult<T> | null> | null = null;

	const page: MutablePageResult<T> = {
		data,
		meta: meta as z.infer<typeof responseMetaSchema> | undefined,
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

					if (result) {
						const mutableResult = result as MutablePageResult<T>;
						mutableResult._fallbackFetchNextPage =
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
			let index = 0;

			return {
				async next(): Promise<IteratorResult<T>> {
					while (current) {
						if (index < current.data.length) {
							return { done: false, value: current.data[index++] };
						}

						if (!current.pagination.hasMore) {
							current = null;
							break;
						}

						current = await current.nextPage();
						index = 0;
					}

					return { done: true, value: undefined as never };
				},
			};
		},
	};

	return page;
}

export function createPageResult<T>(
	dataOrRaw:
		| T[]
		| {
				data: T[];
				meta?: unknown;
				pagination: z.infer<typeof paginationSchema>;
		  },
	paginationOrFetchNext?:
		| z.infer<typeof paginationSchema>
		| (() => Promise<PageResult<T> | null>)
		| ((cursor: string) => Promise<PageResult<T> | null>),
	fetchNextOrMeta?:
		| (() => Promise<PageResult<T> | null>)
		| ((cursor: string) => Promise<PageResult<T> | null>)
		| unknown,
	meta?: unknown,
): PageResult<T> {
	if (Array.isArray(dataOrRaw)) {
		const data = dataOrRaw;
		const pagination = paginationOrFetchNext as z.infer<
			typeof paginationSchema
		>;
		const fetchNextPage = fetchNextOrMeta as
			| (() => Promise<PageResult<T> | null>)
			| ((cursor: string) => Promise<PageResult<T> | null>)
			| undefined;

		const fetchNext: FetchNext<T> = async () => {
			if (!fetchNextPage) return null;
			return fetchNextPage.length > 0
				? (fetchNextPage as (cursor: string) => Promise<PageResult<T> | null>)(
						pagination.cursor,
					)
				: (fetchNextPage as () => Promise<PageResult<T> | null>)();
		};

		return buildPageResult(data, pagination, fetchNext, meta);
	}

	const raw = dataOrRaw;
	const fetchNextPage = paginationOrFetchNext as
		| (() => Promise<PageResult<T> | null>)
		| ((cursor: string) => Promise<PageResult<T> | null>)
		| undefined;

	const fetchNext: FetchNext<T> = async () => {
		if (!fetchNextPage) return null;
		return fetchNextPage.length > 0
			? (fetchNextPage as (cursor: string) => Promise<PageResult<T> | null>)(
					raw.pagination.cursor,
				)
			: (fetchNextPage as () => Promise<PageResult<T> | null>)();
	};

	return buildPageResult(
		Array.isArray(raw.data) ? raw.data : [],
		raw.pagination,
		fetchNext,
		raw.meta,
	);
}
