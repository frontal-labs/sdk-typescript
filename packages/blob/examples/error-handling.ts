/**
 * Error Handling Example
 *
 * This example demonstrates error handling strategies for blob operations,
 * including error classification, retry logic, and graceful degradation.
 *
 * Blob methods return their results directly and throw on failure. Failures
 * are thrown as `FrontalError`, which carries `code`, `statusCode`,
 * `requestId`, `retryable`, and an optional `fix` hint.
 */

import { blob } from "@frontal-labs/blob";
import { FrontalError } from "@frontal-labs/core";

// Use the default blob singleton

// Error classification and handling
async function errorClassificationExample() {
	const bucketName = "error-handling-bucket";
	const objectKey = "non-existent-file.txt";

	console.log("🚨 Error Classification Example\n");

	// Attempt to download a non-existent file
	console.log("📥 Attempting to download non-existent file...");
	try {
		await blob.download({ bucket: bucketName, key: objectKey });
		console.log("✅ Unexpected success - file should not exist");
	} catch (error) {
		if (!FrontalError.isInstance(error)) {
			throw error;
		}
		console.log("❌ Error occurred:");
		console.log(`  Message: ${error.message}`);
		console.log(`  Status Code: ${error.statusCode}`);
		console.log(`  Code: ${error.code}`);
		console.log(`  Request ID: ${error.requestId}`);

		// Classify error type
		if (error.statusCode === 404) {
			console.log("🔍 Classification: Not Found Error");
			console.log(
				"💡 Suggested action: Check if the object key is correct or create the object first",
			);
		} else if (error.statusCode >= 500) {
			console.log("🔍 Classification: Server Error");
			console.log(
				"💡 Suggested action: Retry the operation or contact support",
			);
		} else if (error.statusCode >= 400) {
			console.log("🔍 Classification: Client Error");
			console.log(
				"💡 Suggested action: Check request parameters and permissions",
			);
		}
	}

	// Attempt to list a non-existent bucket
	console.log("\n📥 Attempting to access non-existent bucket...");
	try {
		await blob.list({ bucket: "non-existent-bucket" });
	} catch (error) {
		if (!FrontalError.isInstance(error)) {
			throw error;
		}
		console.log("❌ Error occurred:");
		console.log(`  Message: ${error.message}`);
		console.log(`  Status Code: ${error.statusCode}`);

		// Handle bucket-specific errors
		if (error.statusCode === 404) {
			console.log("🔍 Classification: Bucket Not Found");
			console.log(
				"💡 Suggested action: Create the bucket or check bucket name spelling",
			);
		}
	}
}

// Retry logic with exponential backoff
async function retryWithBackoff() {
	const bucketName = "error-handling-bucket";
	const objectKey = "retry-test.txt";
	const content = new TextEncoder().encode(
		"This content should eventually be uploaded.",
	);

	console.log("\n🔄 Retry Logic with Exponential Backoff\n");

	// Function to perform an operation with retry
	async function withRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		baseDelay: number = 1000,
	): Promise<{ success: boolean; attempts: number; error?: unknown }> {
		let lastError: unknown;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`📤 Attempt ${attempt}/${maxRetries}...`);
				await operation();
				console.log(`✅ Success on attempt ${attempt}`);
				return { success: true, attempts: attempt };
			} catch (error) {
				lastError = error;

				// Don't retry errors the SDK marks as non-retryable (e.g. 4xx)
				if (FrontalError.isInstance(error) && !error.retryable) {
					console.log(
						`❌ Non-retryable error (${error.statusCode}), not retrying`,
					);
					return { success: false, attempts: attempt, error };
				}

				console.log(`❌ Attempt ${attempt} failed:`, error);

				// Retry on server errors (5xx) or network issues
				if (attempt < maxRetries) {
					const delay = baseDelay * 2 ** (attempt - 1); // Exponential backoff
					console.log(`⏳ Waiting ${delay}ms before retry...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		console.log(`❌ All ${maxRetries} attempts failed`);
		return { success: false, attempts: maxRetries, error: lastError };
	}

	// Test successful upload with retry logic
	console.log("🧪 Testing successful operation...");
	const uploadResult = await withRetry(() =>
		blob.upload({
			bucket: bucketName,
			key: objectKey,
			data: content,
			contentType: "text/plain",
		}),
	);

	if (uploadResult.success) {
		console.log(`✅ Upload succeeded after ${uploadResult.attempts} attempts`);
		await blob.delete({ bucket: bucketName, key: objectKey });
	} else {
		console.log(
			`❌ Upload failed after ${uploadResult.attempts} attempts:`,
			uploadResult.error instanceof Error
				? uploadResult.error.message
				: uploadResult.error,
		);
	}
}

// Circuit breaker pattern
class CircuitBreaker {
	private failures = 0;
	private lastFailureTime = 0;
	private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

	constructor(
		private threshold: number = 5,
		private timeout: number = 60000, // 1 minute
	) {}

	async execute<T>(operation: () => Promise<T>): Promise<T> {
		if (this.state === "OPEN") {
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = "HALF_OPEN";
				console.log("🔓 Circuit breaker moving to HALF_OPEN state");
			} else {
				throw new Error("Circuit breaker is OPEN - operation blocked");
			}
		}

		try {
			const result = await operation();

			if (this.state === "HALF_OPEN") {
				this.reset();
				console.log("✅ Circuit breaker reset to CLOSED state");
			}

			return result;
		} catch (error) {
			this.recordFailure();
			throw error;
		}
	}

	private recordFailure() {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.threshold) {
			this.state = "OPEN";
			console.log(`🚨 Circuit breaker OPENED after ${this.failures} failures`);
		}
	}

	private reset() {
		this.failures = 0;
		this.state = "CLOSED";
	}

	getState() {
		return { state: this.state, failures: this.failures };
	}
}

async function circuitBreakerExample() {
	const bucketName = "error-handling-bucket";
	const circuitBreaker = new CircuitBreaker(3, 5000); // 3 failures, 5 second timeout

	console.log("\n🔌 Circuit Breaker Pattern Example\n");

	// Wrap a real download so failures from the service trip the breaker
	const download = () =>
		circuitBreaker.execute(() =>
			blob.download({ bucket: bucketName, key: "circuit-test.txt" }),
		);

	console.log("🧪 Testing circuit breaker with multiple operations...");

	for (let i = 0; i < 10; i++) {
		try {
			console.log(`\n📤 Operation ${i + 1}:`);
			console.log(
				`   Circuit state: ${circuitBreaker.getState().state}, Failures: ${circuitBreaker.getState().failures}`,
			);

			const file = await download();
			console.log(`   ✅ Success: ${await file.text()}`);
		} catch (error) {
			console.log(
				`   ❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Small delay between operations
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	// Wait for circuit breaker to reset
	console.log("\n⏳ Waiting for circuit breaker to reset...");
	await new Promise((resolve) => setTimeout(resolve, 6000));

	// Try operation again
	try {
		console.log("📤 Operation after reset:");
		const file = await download();
		console.log(`✅ Success: ${await file.text()}`);
	} catch (error) {
		console.log(
			`❌ Failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

// Graceful degradation
async function gracefulDegradation() {
	const bucketName = "error-handling-bucket";
	const primaryObjectKey = "primary-data.txt";
	const fallbackObjectKey = "fallback-data.txt";

	console.log("\n🛡️ Graceful Degradation Example\n");

	// Upload fallback data first
	await blob.upload({
		bucket: bucketName,
		key: fallbackObjectKey,
		data: new TextEncoder().encode(
			"This is fallback content when primary is unavailable.",
		),
		contentType: "text/plain",
	});
	console.log("✅ Fallback data uploaded");

	// Function to get data with graceful degradation
	async function getDataWithFallback(): Promise<{
		content: string;
		source: string;
	}> {
		// Try primary source first
		console.log("📥 Attempting to fetch primary data...");
		try {
			const file = await blob.download({
				bucket: bucketName,
				key: primaryObjectKey,
			});
			console.log("✅ Primary data retrieved successfully");
			return { content: await file.text(), source: "primary" };
		} catch (error) {
			console.log(`❌ Primary data unavailable: ${String(error)}`);
		}

		console.log("📥 Falling back to secondary data...");

		// Try fallback source
		try {
			const file = await blob.download({
				bucket: bucketName,
				key: fallbackObjectKey,
			});
			console.log("✅ Fallback data retrieved successfully");
			return { content: await file.text(), source: "fallback" };
		} catch (error) {
			console.log(`❌ Fallback data also unavailable: ${String(error)}`);
		}

		// Last resort - return default content
		console.log("📥 Using default content as last resort");
		return {
			content: "Default content when all sources are unavailable.",
			source: "default",
		};
	}

	// Test graceful degradation
	console.log("\n🧪 Testing graceful degradation...");
	const result = await getDataWithFallback();

	console.log("\n📊 Result:");
	console.log(`  Source: ${result.source}`);
	console.log(`  Content: ${result.content}`);

	// Clean up
	await blob.delete({ bucket: bucketName, key: fallbackObjectKey });
}

// Error logging and monitoring
async function errorLoggingAndMonitoring() {
	const bucketName = "error-handling-bucket";

	console.log("\n📊 Error Logging and Monitoring Example\n");

	// Error tracking
	const errorLog: Array<{
		timestamp: string;
		operation: string;
		error: string;
		statusCode: number;
		retryable: boolean;
	}> = [];

	// Function to log errors
	function logError(operation: string, error: unknown) {
		const frontalError = FrontalError.isInstance(error) ? error : undefined;
		const logEntry = {
			timestamp: new Date().toISOString(),
			operation,
			error: error instanceof Error ? error.message : String(error),
			statusCode: frontalError?.statusCode ?? 0,
			retryable: frontalError?.retryable ?? true,
		};

		errorLog.push(logEntry);
		console.log("📝 Error logged:", logEntry);
	}

	// Function to run an operation and log any thrown error
	async function executeWithErrorLogging<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<{ success: boolean; result?: T }> {
		try {
			const result = await fn();
			return { success: true, result };
		} catch (error) {
			logError(operation, error);
			return { success: false };
		}
	}

	console.log("🧪 Testing various operations with error logging...");

	// Test successful operation
	const successResult = await executeWithErrorLogging("upload-success", () =>
		blob.upload({
			bucket: bucketName,
			key: "test.txt",
			data: new TextEncoder().encode("test content"),
			contentType: "text/plain",
		}),
	);
	console.log(
		`Upload operation: ${successResult.success ? "SUCCESS" : "FAILED"}`,
	);

	// Test failed operations
	const failResult1 = await executeWithErrorLogging(
		"download-nonexistent",
		() => blob.download({ bucket: bucketName, key: "nonexistent.txt" }),
	);
	console.log(
		`Download nonexistent: ${failResult1.success ? "SUCCESS" : "FAILED"}`,
	);

	const failResult2 = await executeWithErrorLogging("list-invalid-bucket", () =>
		blob.list({ bucket: "" }),
	);
	console.log(
		`List invalid bucket: ${failResult2.success ? "SUCCESS" : "FAILED"}`,
	);

	// Generate error report
	console.log("\n📊 Error Report:");
	console.log(`Total errors logged: ${errorLog.length}`);

	if (errorLog.length > 0) {
		const retryableErrors = errorLog.filter((log) => log.retryable).length;
		const nonRetryableErrors = errorLog.length - retryableErrors;

		console.log(`Retryable errors: ${retryableErrors}`);
		console.log(`Non-retryable errors: ${nonRetryableErrors}`);

		console.log("\n📋 Error Details:");
		errorLog.forEach((log, index) => {
			console.log(
				`${index + 1}. ${log.operation}: ${log.error} (${log.statusCode}) - ${log.retryable ? "Retryable" : "Non-retryable"}`,
			);
		});
	}

	// Clean up if the upload succeeded
	if (successResult.success) {
		await blob.delete({ bucket: bucketName, key: "test.txt" });
	}
}

// Comprehensive error handling wrapper
class SafeBlobOperations {
	async safeUpload(
		bucket: string,
		key: string,
		data: Uint8Array,
		contentType: string,
		options: {
			fallbackKey?: string;
			timeout?: number;
		} = {},
	): Promise<{ success: boolean; key?: string; error?: string }> {
		const { fallbackKey, timeout = 30000 } = options;

		const attempt = (objectKey: string) =>
			Promise.race([
				blob.upload({ bucket, key: objectKey, data, contentType }),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error("Operation timeout")), timeout),
				),
			]);

		try {
			await attempt(key);
			return { success: true, key };
		} catch (error) {
			// Try fallback if specified
			if (fallbackKey) {
				console.log("📥 Trying fallback key...");
				try {
					await attempt(fallbackKey);
					return { success: true, key: fallbackKey };
				} catch {
					// fall through to the failure result below
				}
			}
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async safeDownload(
		bucket: string,
		key: string,
		options: {
			fallbackKeys?: string[];
			defaultContent?: string;
		} = {},
	): Promise<{
		success: boolean;
		content?: string;
		source?: string;
		error?: string;
	}> {
		const { fallbackKeys = [], defaultContent } = options;

		// Try primary key, then each fallback key in order
		for (const candidate of [key, ...fallbackKeys]) {
			try {
				const file = await blob.download({ bucket, key: candidate });
				return { success: true, content: await file.text(), source: candidate };
			} catch {
				// try the next candidate
			}
		}

		// Return default content if provided
		if (defaultContent) {
			return { success: true, content: defaultContent, source: "default" };
		}

		return {
			success: false,
			error: `Unable to download ${key} or any fallbacks`,
		};
	}
}

async function comprehensiveErrorHandling() {
	const bucketName = "error-handling-bucket";
	const safeStorage = new SafeBlobOperations();

	console.log("\n🛡️ Comprehensive Error Handling Example\n");

	// Test safe upload with fallback
	console.log("🧪 Testing safe upload with fallback...");
	const uploadResult = await safeStorage.safeUpload(
		bucketName,
		"primary-file.txt",
		new TextEncoder().encode("Primary content"),
		"text/plain",
		{ fallbackKey: "fallback-file.txt" },
	);

	console.log(`Upload result: ${uploadResult.success ? "SUCCESS" : "FAILED"}`);
	if (uploadResult.success) {
		console.log(`File stored as: ${uploadResult.key}`);
	}

	// Test safe download with fallbacks
	console.log("\n🧪 Testing safe download with fallbacks...");
	const downloadResult = await safeStorage.safeDownload(
		bucketName,
		"nonexistent-file.txt",
		{
			fallbackKeys: ["primary-file.txt", "fallback-file.txt"],
			defaultContent: "Default content when all else fails",
		},
	);

	console.log(
		`Download result: ${downloadResult.success ? "SUCCESS" : "FAILED"}`,
	);
	if (downloadResult.success) {
		console.log(`Content source: ${downloadResult.source}`);
		console.log(`Content: ${downloadResult.content}`);
	}

	// Clean up
	if (uploadResult.key) {
		await blob.delete({ bucket: bucketName, key: uploadResult.key });
	}
}

// Run all error handling examples
async function runErrorHandlingExamples() {
	try {
		await errorClassificationExample();
		await retryWithBackoff();
		await circuitBreakerExample();
		await gracefulDegradation();
		await errorLoggingAndMonitoring();
		await comprehensiveErrorHandling();

		console.log("\n🎉 All error handling examples completed successfully!");
	} catch (error) {
		console.error("❌ Error handling examples failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runErrorHandlingExamples();
}

export {
	errorClassificationExample,
	retryWithBackoff,
	circuitBreakerExample,
	gracefulDegradation,
	errorLoggingAndMonitoring,
	comprehensiveErrorHandling,
	runErrorHandlingExamples,
};
