import { FrontalClient, getDefaultClient } from "@frontal/core";
import { BlobService } from "./client";
import { DEFAULT_BLOB_BASE_URL } from "./constants";
import type {
	APIResponse,
	BlobObject,
	ListObjectsResult,
	SignedUrlOptions,
	StorageConfig,
} from "./types";

function toErrorResponse(
	error: unknown,
	defaultName: string,
): APIResponse<never>["error"] {
	if (error instanceof Error) {
		const errorWithStatus = error as Error & { statusCode?: number };
		const statusCode =
			typeof errorWithStatus.statusCode === "number"
				? errorWithStatus.statusCode
				: 0;
		return {
			message: error.message,
			statusCode,
			name: defaultName,
		};
	}
	return {
		message: "Unknown error",
		statusCode: 0,
		name: defaultName,
	};
}

/**
 * @deprecated Use `BlobService` with `createBlobClient()` instead.
 * This class wraps BlobService to provide backward-compatible
 * APIResponse<T> return types.
 */
export class Storage {
	private readonly service: BlobService;

	constructor(config: StorageConfig = {}) {
		let client: FrontalClient;
		if (config.apiKey || config.baseUrl) {
			client = new FrontalClient({
				apiKey: config.apiKey || "",
				baseUrl: config.baseUrl || DEFAULT_BLOB_BASE_URL,
			});
		} else {
			client = getDefaultClient();
		}
		this.service = new BlobService(client._http);
	}

	async upload(
		bucket: string,
		key: string,
		data: Buffer | ReadableStream,
		contentType?: string,
	): Promise<APIResponse<void>> {
		try {
			await this.service.upload(bucket, key, data, contentType);
			return { data: null, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "upload_error"),
				headers: null,
			};
		}
	}

	async download(bucket: string, key: string): Promise<APIResponse<Blob>> {
		try {
			const data = await this.service.download(bucket, key);
			return { data, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "download_error"),
				headers: null,
			};
		}
	}

	async downloadStream(
		bucket: string,
		key: string,
	): Promise<APIResponse<ReadableStream<Uint8Array>>> {
		try {
			const data = await this.service.downloadStream(bucket, key);
			return { data, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "stream_error"),
				headers: null,
			};
		}
	}

	async delete(bucket: string, key: string): Promise<void> {
		return this.service.delete(bucket, key);
	}

	async list(
		bucket: string,
		prefix?: string,
	): Promise<APIResponse<ListObjectsResult>> {
		try {
			const data = await this.service.list(bucket, prefix);
			return { data, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "list_error"),
				headers: null,
			};
		}
	}

	async getSignedUrl(
		bucket: string,
		options: SignedUrlOptions,
	): Promise<APIResponse<string>> {
		try {
			const data = await this.service.getSignedUrl(bucket, options);
			return { data, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "validation_error"),
				headers: null,
			};
		}
	}

	async copyObject(
		sourceBucket: string,
		sourceKey: string,
		destBucket: string,
		destKey: string,
	): Promise<APIResponse<void>> {
		try {
			await this.service.copyObject(
				sourceBucket,
				sourceKey,
				destBucket,
				destKey,
			);
			return { data: null, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "copy_error"),
				headers: null,
			};
		}
	}

	async moveObject(
		sourceBucket: string,
		sourceKey: string,
		destBucket: string,
		destKey: string,
	): Promise<APIResponse<void>> {
		try {
			await this.service.moveObject(
				sourceBucket,
				sourceKey,
				destBucket,
				destKey,
			);
			return { data: null, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "move_error"),
				headers: null,
			};
		}
	}

	async getMetadata(
		bucket: string,
		key: string,
	): Promise<APIResponse<BlobObject>> {
		try {
			const data = await this.service.getMetadata(bucket, key);
			return { data, error: null, headers: {} };
		} catch (error) {
			return {
				data: null,
				error: toErrorResponse(error, "metadata_error"),
				headers: null,
			};
		}
	}
}
