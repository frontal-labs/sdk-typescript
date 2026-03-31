/**
 * Error Handling Example
 *
 * This example demonstrates comprehensive error handling strategies for
 * storage operations, including retry logic, error classification, and
 * graceful degradation.
 */

import { Storage } from "@frontal/blob";

const storage = new Storage();

// Error classification and handling
async function errorClassificationExample() {
	const bucketName = "error-handling-bucket";
	const objectKey = "non-existent-file.txt";

	console.log("🚨 Error Classification Example\n");

	// Attempt to download non-existent file
	console.log("📥 Attempting to download non-existent file...");
	const downloadResult = await storage.download(bucketName, objectKey);

	if (downloadResult.error) {
		console.log("❌ Error occurred:");
		console.log(`  Message: ${downloadResult.error.message}`);
		console.log(`  Status Code: ${downloadResult.error.statusCode}`);
		console.log(`  Error Name: ${downloadResult.error.name}`);

		// Classify error type
		if (downloadResult.error.statusCode === 404) {
			console.log("🔍 Classification: Not Found Error");
			console.log(
				"💡 Suggested action: Check if the object key is correct or create the object first",
			);
		} else if (downloadResult.error.statusCode >= 500) {
			console.log("🔍 Classification: Server Error");
			console.log(
				"💡 Suggested action: Retry the operation or contact support",
			);
		} else if (downloadResult.error.statusCode >= 400) {
			console.log("🔍 Classification: Client Error");
			console.log(
				"💡 Suggested action: Check request parameters and permissions",
			);
		}
	} else {
		console.log("✅ Unexpected success - file should not exist");
	}

	// Attempt to access non-existent bucket
	console.log("\n📥 Attempting to access non-existent bucket...");
	const listResult = await storage.list("non-existent-bucket");

	if (listResult.error) {
		console.log("❌ Error occurred:");
		console.log(`  Message: ${listResult.error.message}`);
		console.log(`  Status Code: ${listResult.error.statusCode}`);
		console.log(`  Error Name: ${listResult.error.name}`);

		// Handle bucket-specific errors
		if (listResult.error.statusCode === 404) {
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
	const content = "This content should eventually be uploaded.";

	console.log("\n🔄 Retry Logic with Exponential Backoff\n");

	// Function to perform operation with retry
	async function uploadWithRetry(
		operation: () => Promise<any>,
		maxRetries: number = 3,
		baseDelay: number = 1000,
	): Promise<{ success: boolean; attempts: number; error?: any }> {
		let lastError: any;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`📤 Attempt ${attempt}/${maxRetries}...`);
				const result = await operation();

				if (!result.error) {
					console.log(`✅ Success on attempt ${attempt}`);
					return { success: true, attempts: attempt };
				}

				lastError = result.error;

				// Don't retry on client errors (4xx)
				if (result.error.statusCode >= 400 && result.error.statusCode < 500) {
					console.log(
						`❌ Client error (${result.error.statusCode}), not retrying`,
					);
					return { success: false, attempts: attempt, error: lastError };
				}

				// Retry on server errors (5xx) or network issues
				if (attempt < maxRetries) {
					const delay = baseDelay * 2 ** (attempt - 1); // Exponential backoff
					console.log(`⏳ Waiting ${delay}ms before retry...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			} catch (error) {
				lastError = error;
				console.log(`❌ Exception on attempt ${attempt}:`, error);

				if (attempt < maxRetries) {
					const delay = baseDelay * 2 ** (attempt - 1);
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
	const uploadOperation = () =>
		storage.upload(bucketName, objectKey, content, "text/plain");
	const uploadResult = await uploadWithRetry(uploadOperation);

	if (uploadResult.success) {
		console.log(`✅ Upload succeeded after ${uploadResult.attempts} attempts`);
	} else {
		console.log(
			`❌ Upload failed after ${uploadResult.attempts} attempts:`,
			uploadResult.error?.message,
		);
	}

	// Clean up if successful
	if (uploadResult.success) {
		await storage.delete(bucketName, objectKey);
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
		private storage: Storage,
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
	const circuitBreaker = new CircuitBreaker(3, 5000, storage); // 3 failures, 5 second timeout

	console.log("\n🔌 Circuit Breaker Pattern Example\n");

	// Simulate operations that might fail
	const failingOperation = async () => {
		// Simulate 70% failure rate
		if (Math.random() < 0.7) {
			const error = new Error("Simulated operation failure");
			(error as any).statusCode = 500;
			throw error;
		}

		return { data: "Operation successful", error: null };
	};

	// Test circuit breaker with multiple operations
	console.log("🧪 Testing circuit breaker with multiple operations...");

	for (let i = 0; i < 10; i++) {
		try {
			console.log(`\n📤 Operation ${i + 1}:`);
			console.log(
				`   Circuit state: ${circuitBreaker.getState().state}, Failures: ${circuitBreaker.getState().failures}`,
			);

			const result = await circuitBreaker.execute(failingOperation);
			console.log(`   ✅ Success: ${result.data}`);
		} catch (error) {
			console.log(`   ❌ Failed: ${(error as Error).message}`);
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
		const result = await circuitBreaker.execute(failingOperation);
		console.log(`✅ Success: ${result.data}`);
	} catch (error) {
		console.log(`❌ Failed: ${(error as Error).message}`);
	}
}

// Graceful degradation
async function gracefulDegradation() {
	const bucketName = "error-handling-bucket";
	const primaryObjectKey = "primary-data.txt";
	const fallbackObjectKey = "fallback-data.txt";

	console.log("\n🛡️ Graceful Degradation Example\n");

	// Upload fallback data first
	const fallbackContent =
		"This is fallback content when primary is unavailable.";
	await storage.upload(
		bucketName,
		fallbackObjectKey,
		fallbackContent,
		"text/plain",
	);
	console.log("✅ Fallback data uploaded");

	// Function to get data with graceful degradation
	async function getDataWithFallback(): Promise<{
		content: string;
		source: string;
	}> {
		// Try primary source first
		console.log("📥 Attempting to fetch primary data...");
		const primaryResult = await storage.download(bucketName, primaryObjectKey);

		if (!primaryResult.error) {
			const content = await primaryResult.data!.text();
			console.log("✅ Primary data retrieved successfully");
			return { content, source: "primary" };
		}

		console.log(`❌ Primary data unavailable: ${primaryResult.error.message}`);
		console.log("📥 Falling back to secondary data...");

		// Try fallback source
		const fallbackResult = await storage.download(
			bucketName,
			fallbackObjectKey,
		);

		if (!fallbackResult.error) {
			const content = await fallbackResult.data!.text();
			console.log("✅ Fallback data retrieved successfully");
			return { content, source: "fallback" };
		}

		console.log(
			`❌ Fallback data also unavailable: ${fallbackResult.error.message}`,
		);

		// Last resort - return default content
		const defaultContent = "Default content when all sources are unavailable.";
		console.log("📥 Using default content as last resort");
		return { content: defaultContent, source: "default" };
	}

	// Test graceful degradation
	console.log("\n🧪 Testing graceful degradation...");
	const result = await getDataWithFallback();

	console.log(`\n📊 Result:`);
	console.log(`  Source: ${result.source}`);
	console.log(`  Content: ${result.content}`);

	// Clean up
	await storage.delete(bucketName, fallbackObjectKey);
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
		recoverable: boolean;
	}> = [];

	// Function to log errors
	function logError(operation: string, error: any) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			operation,
			error: error.message || String(error),
			statusCode: error.statusCode || 0,
			recoverable: !error.statusCode || error.statusCode >= 500, // Server errors are recoverable
		};

		errorLog.push(logEntry);
		console.log("📝 Error logged:", logEntry);
	}

	// Function to execute operation with error logging
	async function executeWithErrorLogging<T>(
		operation: string,
		fn: () => Promise<T>,
	): Promise<{ success: boolean; result?: T; error?: any }> {
		try {
			const result = await fn();

			if (result && typeof result === "object" && "error" in result) {
				if (result.error) {
					logError(operation, result.error);
					return { success: false, error: result.error };
				}
			}

			return { success: true, result };
		} catch (error) {
			logError(operation, error);
			return { success: false, error };
		}
	}

	// Test various operations
	console.log("🧪 Testing various operations with error logging...");

	// Test successful operation
	const successResult = await executeWithErrorLogging("upload-success", () =>
		storage.upload(bucketName, "test.txt", "test content", "text/plain"),
	);
	console.log(
		`Upload operation: ${successResult.success ? "SUCCESS" : "FAILED"}`,
	);

	// Test failed operations
	const failResult1 = await executeWithErrorLogging(
		"download-nonexistent",
		() => storage.download(bucketName, "nonexistent.txt"),
	);
	console.log(
		`Download nonexistent: ${failResult1.success ? "SUCCESS" : "FAILED"}`,
	);

	const failResult2 = await executeWithErrorLogging("list-invalid-bucket", () =>
		storage.list(""),
	);
	console.log(
		`List invalid bucket: ${failResult2.success ? "SUCCESS" : "FAILED"}`,
	);

	// Generate error report
	console.log("\n📊 Error Report:");
	console.log(`Total errors logged: ${errorLog.length}`);

	if (errorLog.length > 0) {
		const recoverableErrors = errorLog.filter((log) => log.recoverable).length;
		const nonRecoverableErrors = errorLog.length - recoverableErrors;

		console.log(`Recoverable errors: ${recoverableErrors}`);
		console.log(`Non-recoverable errors: ${nonRecoverableErrors}`);

		console.log("\n📋 Error Details:");
		errorLog.forEach((log, index) => {
			console.log(
				`${index + 1}. ${log.operation}: ${log.error} (${log.statusCode}) - ${log.recoverable ? "Recoverable" : "Non-recoverable"}`,
			);
		});
	}

	// Clean up if successful upload
	if (successResult.success) {
		await storage.delete(bucketName, "test.txt");
	}
}

// Comprehensive error handling wrapper
class SafeStorageOperations {
	constructor(private storage: Storage) {}

	async safeUpload(
		bucket: string,
		key: string,
		data: BodyInit,
		contentType?: string,
		options: {
			maxRetries?: number;
			fallbackKey?: string;
			timeout?: number;
		} = {},
	): Promise<{ success: boolean; key?: string; error?: string }> {
		const { maxRetries = 3, fallbackKey, timeout = 30000 } = options;

		try {
			// Add timeout
			const uploadPromise = this.storage.upload(bucket, key, data, contentType);
			const timeoutPromise = new Promise((_, reject) =>
				setTimeout(() => reject(new Error("Operation timeout")), timeout),
			);

			const result = await Promise.race([uploadPromise, timeoutPromise]);

			if (!result.error) {
				return { success: true, key };
			}

			// Try fallback if specified
			if (fallbackKey) {
				console.log("📥 Trying fallback key...");
				const fallbackResult = await this.storage.upload(
					bucket,
					fallbackKey,
					data,
					contentType,
				);
				if (!fallbackResult.error) {
					return { success: true, key: fallbackKey };
				}
			}

			return { success: false, error: result.error.message };
		} catch (error) {
			return { success: false, error: (error as Error).message };
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

		// Try primary key
		const result = await this.storage.download(bucket, key);
		if (!result.error) {
			const content = await result.data!.text();
			return { success: true, content, source: key };
		}

		// Try fallback keys
		for (const fallbackKey of fallbackKeys) {
			const fallbackResult = await this.storage.download(bucket, fallbackKey);
			if (!fallbackResult.error) {
				const content = await fallbackResult.data!.text();
				return { success: true, content, source: fallbackKey };
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
	const safeStorage = new SafeStorageOperations(storage);

	console.log("\n🛡️ Comprehensive Error Handling Example\n");

	// Test safe upload with fallback
	console.log("🧪 Testing safe upload with fallback...");
	const uploadResult = await safeStorage.safeUpload(
		bucketName,
		"primary-file.txt",
		"Primary content",
		"text/plain",
		{
			fallbackKey: "fallback-file.txt",
		},
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
		await storage.delete(bucketName, uploadResult.key);
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
