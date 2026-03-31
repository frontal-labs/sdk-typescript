import { type ZodType, z } from "zod";
import { paginationMetaSchema, responseMetaSchema } from "./schemas";
import type { PageResult } from "./types";

/**
 * Creates a Zod schema for paginated API responses
 * @param itemSchema - Zod schema for individual items
 * @returns Zod schema for paginated response
 */
export function pageResultSchema<T extends ZodType>(itemSchema: T) {
	return z.object({
		data: z.array(itemSchema),
		meta: responseMetaSchema.optional(),
		pagination: paginationMetaSchema,
	});
}

export function createPageResult<T>(
	dataOrRaw:
		| T[]
		| {
				data: T[];
				meta?: unknown;
				pagination: { cursor: string | null; hasMore: boolean; total?: number };
		  },
	paginationOrFetchNext?:
		| { cursor: string | null; hasMore: boolean; total?: number }
		| ((cursor: string) => Promise<PageResult<T>>),
	fetchNextOrMeta?: ((cursor: string) => Promise<PageResult<T>>) | unknown,
	meta?: unknown,
): PageResult<T> {
	// Handle old signature: createPageResult(data, pagination, fetchNext, meta?)
	if (Array.isArray(dataOrRaw)) {
		const data = dataOrRaw;
		const pagination = paginationOrFetchNext as {
			cursor: string | null;
			hasMore: boolean;
			total?: number;
		};
		const fetchNext = fetchNextOrMeta as (
			cursor: string,
		) => Promise<PageResult<T>>;
		const pageMeta = meta as z.infer<typeof responseMetaSchema> | undefined;

		const page: PageResult<T> = {
			data,
			meta: pageMeta,
			pagination,
			async nextPage() {
				if (!pagination.hasMore || !pagination.cursor) return null;
				return fetchNext(pagination.cursor);
			},
			async all() {
				const items: T[] = [...data];
				let cur: PageResult<T> | null = page;
				while (cur?.pagination.hasMore) {
					cur = await cur.nextPage();
					if (cur) items.push(...cur.data);
				}
				return items;
			},
			[Symbol.asyncIterator]() {
				let cur: PageResult<T> | null = page;
				let i = 0;
				return {
					async next() {
						if (!cur) return { done: true as const, value: undefined };
						if (i < cur.data.length)
							return { done: false, value: cur.data[i++] };
						cur = await cur.nextPage();
						i = 0;
						if (!cur || cur.data.length === 0)
							return { done: true, value: undefined };
						return { done: false, value: cur.data[i++] };
					},
				};
			},
		};
		return page;
	}

	// Handle new signature: createPageResult(raw, fetchNext)
	const raw = dataOrRaw as {
		data: T[];
		meta?: unknown;
		pagination: { cursor: string | null; hasMore: boolean; total?: number };
	};
	const fetchNext = paginationOrFetchNext as (
		cursor: string,
	) => Promise<PageResult<T>>;

	// Ensure data is always an array
	const data = Array.isArray(raw.data) ? raw.data : [];

	const page: PageResult<T> = {
		data,
		meta: raw.meta as z.infer<typeof responseMetaSchema> | undefined,
		pagination: raw.pagination,
		async nextPage() {
			if (!raw.pagination.hasMore || !raw.pagination.cursor) return null;
			return fetchNext(raw.pagination.cursor);
		},
		async all() {
			const items: T[] = [...data];
			let cur: PageResult<T> | null = page;
			while (cur?.pagination.hasMore) {
				cur = await cur.nextPage();
				if (cur) items.push(...cur.data);
			}
			return items;
		},
		[Symbol.asyncIterator]() {
			let cur: PageResult<T> | null = page;
			let i = 0;
			return {
				async next() {
					if (!cur) return { done: true as const, value: undefined };
					if (i < cur.data.length) return { done: false, value: cur.data[i++] };
					cur = await cur.nextPage();
					i = 0;
					if (!cur || cur.data.length === 0)
						return { done: true, value: undefined };
					return { done: false, value: cur.data[i++] };
				},
			};
		},
	};
	return page;
}
