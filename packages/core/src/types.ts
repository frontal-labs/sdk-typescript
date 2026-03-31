import type { FilterConditions, PaginationMeta, ResponseMeta } from "./schemas";

/**
 * Standard error response structure.
 */
export interface ErrorResponse {
	message: string;
	statusCode: number;
	name: string;
}

/**
 * Standard API response structure.
 */
export interface APIResponse<T> {
	data: T | null;
	error: ErrorResponse | null;
	headers: Record<string, string> | null;
}

/**
 * Page result interface for paginated responses.
 */
export interface PageResult<T> {
	/**
	 * Array of items in the current page
	 * @example [ { id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' } ]
	 */
	data: T[];
	/**
	 * Optional metadata about the response
	 * @example { requestId: '123', timestamp: '2023-01-01T00:00:00Z' }
	 */
	meta?: ResponseMeta;
	/**
	 * Pagination metadata
	 * @example { cursor: '123', hasMore: true, total: 100 }
	 */
	pagination: PaginationMeta;
	/**
	 * Fetch the next page
	 * @returns Promise<PageResult<T> | null>
	 */
	nextPage(): Promise<PageResult<T> | null>;
	/**
	 * Get all items by fetching all pages
	 * @returns Promise<T[]>
	 */
	all(): Promise<T[]>;
	/**
	 * Async iterator to iterate over all items
	 * @returns AsyncIterator<T>
	 */
	[Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * Query builder interface for paginated queries
 */
export interface QueryBuilder<T> {
	where(conditions: FilterConditions): this;
	include(...relations: string[]): this;
	orderBy(field: string, direction?: "asc" | "desc"): this;
	limit(n: number): this;
	fields(...fields: string[]): this;
	at(timestamp: Date | string): this;
	execute(): Promise<PageResult<T>>;
	first(): Promise<T | null>;
	count(): Promise<number>;
	exists(): Promise<boolean>;
	all(): Promise<T[]>;
	[Symbol.asyncIterator](): AsyncIterator<T>;
}
