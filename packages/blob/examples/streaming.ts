/**
 * Streaming Operations Example
 *
 * This example demonstrates streaming operations for handling large files
 * and real-time data processing without loading entire files into memory.
 */

import { Storage } from "@frontal/blob";

const storage = new Storage();

// Basic stream download example
async function basicStreamDownload() {
	const bucketName = "streaming-bucket";
	const objectKey = "logs/application.log";

	console.log("🌊 Basic Stream Download Example\n");

	// Create and upload a large log file
	console.log("📤 Creating large log file...");
	const logLines = [];
	for (let i = 0; i < 1000; i++) {
		logLines.push(
			`2024-01-01 12:00:${i.toString().padStart(2, "0")} [INFO] Process ${i} completed successfully`,
		);
	}
	const logContent = logLines.join("\n");

	const uploadResult = await storage.upload(
		bucketName,
		objectKey,
		logContent,
		"text/plain",
	);
	if (uploadResult.error) {
		console.error("❌ Upload failed:", uploadResult.error.message);
		return;
	}
	console.log("✅ Large log file uploaded");

	// Download as stream
	console.log("\n📥 Downloading as stream...");
	const streamResult = await storage.downloadStream(bucketName, objectKey);

	if (streamResult.error) {
		console.error("❌ Stream download failed:", streamResult.error.message);
		return;
	}

	const stream = streamResult.data!;
	console.log("✅ Stream obtained successfully");

	// Process stream in chunks
	console.log("\n🔄 Processing stream in chunks...");
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let processedLines = 0;
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			totalBytes += value.length;
			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split("\n");
			processedLines += lines.length - 1; // Last line might be incomplete

			// Process every 100 lines
			if (processedLines % 100 === 0) {
				console.log(
					`📊 Processed ${processedLines} lines, ${totalBytes} bytes`,
				);
			}
		}

		console.log(`✅ Stream processing completed`);
		console.log(`📈 Total lines processed: ${processedLines}`);
		console.log(`📈 Total bytes processed: ${totalBytes}`);
	} finally {
		reader.releaseLock();
	}

	// Clean up
	await storage.delete(bucketName, objectKey);
}

// Stream processing with backpressure handling
async function streamWithBackpressure() {
	const bucketName = "streaming-bucket";
	const objectKey = "data/large-dataset.json";

	console.log("\n⚖️ Stream with Backpressure Handling\n");

	// Create a large JSON dataset
	console.log("📤 Creating large JSON dataset...");
	const records = [];
	for (let i = 0; i < 5000; i++) {
		records.push({
			id: i,
			name: `Record ${i}`,
			description: `This is a detailed description for record number ${i}`,
			timestamp: new Date(Date.now() - i * 1000).toISOString(),
			metadata: {
				category: `category-${i % 10}`,
				priority: i % 3,
				tags: [`tag-${i % 5}`, `tag-${(i + 1) % 5}`],
			},
		});
	}

	const jsonContent = JSON.stringify(records, null, 2);
	const uploadResult = await storage.upload(
		bucketName,
		objectKey,
		jsonContent,
		"application/json",
	);

	if (uploadResult.error) {
		console.error("❌ Upload failed:", uploadResult.error.message);
		return;
	}
	console.log("✅ Large JSON dataset uploaded");

	// Stream with controlled processing
	console.log("\n🔄 Streaming with controlled processing...");
	const streamResult = await storage.downloadStream(bucketName, objectKey);

	if (streamResult.error) {
		console.error("❌ Stream download failed:", streamResult.error.message);
		return;
	}

	const stream = streamResult.data!;
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	let buffer = "";
	let processedRecords = 0;
	const maxRecordsPerBatch = 50;

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Process complete JSON objects
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // Keep incomplete line

			for (const line of lines) {
				if (line.trim()) {
					try {
						const record = JSON.parse(line);
						processedRecords++;

						// Simulate processing time
						if (processedRecords % maxRecordsPerBatch === 0) {
							console.log(`📊 Processed ${processedRecords} records...`);
							// Simulate some processing delay
							await new Promise((resolve) => setTimeout(resolve, 10));
						}
					} catch (e) {
						// Skip malformed JSON lines
					}
				}
			}
		}

		// Process remaining buffer
		if (buffer.trim()) {
			try {
				JSON.parse(buffer);
				processedRecords++;
			} catch (e) {
				// Skip malformed JSON
			}
		}

		console.log(`✅ Stream processing completed`);
		console.log(`📈 Total records processed: ${processedRecords}`);
	} finally {
		reader.releaseLock();
	}

	// Clean up
	await storage.delete(bucketName, objectKey);
}

// Real-time log streaming example
async function realTimeLogStreaming() {
	const bucketName = "streaming-bucket";
	const logKey = "logs/realtime.log";

	console.log("\n⏰ Real-time Log Streaming Example\n");

	// Simulate real-time log generation
	console.log("📝 Simulating real-time log generation...");
	const logEntries = [];
	const baseTime = Date.now();

	for (let i = 0; i < 100; i++) {
		const timestamp = new Date(baseTime + i * 1000).toISOString();
		const level = ["INFO", "WARN", "ERROR", "DEBUG"][i % 4];
		const message = `Log entry ${i}: ${level} message`;
		logEntries.push(`${timestamp} [${level}] ${message}`);
	}

	const logContent = logEntries.join("\n");
	await storage.upload(bucketName, logKey, logContent, "text/plain");
	console.log("✅ Log file created");

	// Stream and filter logs in real-time
	console.log("\n🔍 Streaming and filtering logs (ERROR level only)...");
	const streamResult = await storage.downloadStream(bucketName, logKey);

	if (streamResult.error) {
		console.error("❌ Stream download failed:", streamResult.error.message);
		return;
	}

	const stream = streamResult.data!;
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	let errorCount = 0;
	let totalEntries = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.trim()) {
					totalEntries++;

					// Filter for ERROR level logs
					if (line.includes("[ERROR]")) {
						errorCount++;
						console.log(`🚨 ${line}`);

						// Simulate real-time alert processing
						if (errorCount % 5 === 0) {
							console.log(`📧 Alert: ${errorCount} errors detected so far`);
						}
					}
				}
			}
		}

		console.log(`\n✅ Log streaming completed`);
		console.log(`📊 Total log entries: ${totalEntries}`);
		console.log(`🚨 Error entries found: ${errorCount}`);
	} finally {
		reader.releaseLock();
	}

	// Clean up
	await storage.delete(bucketName, logKey);
}

// Stream to file transformation
async function streamTransformation() {
	const bucketName = "streaming-bucket";
	const sourceKey = "data/source.csv";
	const targetKey = "data/transformed.json";

	console.log("\n🔄 Stream Transformation Example\n");

	// Create CSV source data
	console.log("📤 Creating CSV source data...");
	const csvData = [
		"id,name,email,age",
		"1,John Doe,john@example.com,30",
		"2,Jane Smith,jane@example.com,25",
		"3,Bob Johnson,bob@example.com,35",
		"4,Alice Brown,alice@example.com,28",
		"5,Charlie Wilson,charlie@example.com,32",
	].join("\n");

	await storage.upload(bucketName, sourceKey, csvData, "text/csv");
	console.log("✅ CSV source data uploaded");

	// Stream CSV and transform to JSON
	console.log("\n🔄 Streaming CSV and transforming to JSON...");
	const streamResult = await storage.downloadStream(bucketName, sourceKey);

	if (streamResult.error) {
		console.error("❌ Stream download failed:", streamResult.error.message);
		return;
	}

	const stream = streamResult.data!;
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	let buffer = "";
	const headers: string[] = [];
	const records: any[] = [];

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || ""; // Keep incomplete line

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;

				const values = line.split(",");

				if (headers.length === 0) {
					// First line contains headers
					headers.push(...values);
				} else {
					// Data lines
					const record: any = {};
					headers.forEach((header, index) => {
						record[header] = values[index] || "";
					});
					records.push(record);
				}
			}
		}

		// Process remaining buffer
		if (buffer.trim()) {
			const values = buffer.split(",");
			if (headers.length > 0) {
				const record: any = {};
				headers.forEach((header, index) => {
					record[header] = values[index] || "";
				});
				records.push(record);
			}
		}

		console.log(`✅ CSV transformation completed`);
		console.log(`📊 Records transformed: ${records.length}`);

		// Upload transformed JSON
		const jsonData = JSON.stringify(records, null, 2);
		const uploadResult = await storage.upload(
			bucketName,
			targetKey,
			jsonData,
			"application/json",
		);

		if (uploadResult.error) {
			console.error(
				"❌ Transformed data upload failed:",
				uploadResult.error.message,
			);
		} else {
			console.log("✅ Transformed JSON data uploaded");

			// Verify transformation
			const verifyResult = await storage.download(bucketName, targetKey);
			if (!verifyResult.error) {
				const verifyContent = await verifyResult.data!.text();
				const verifyData = JSON.parse(verifyContent);
				console.log(`✅ Transformation verified: ${verifyData.length} records`);
			}
		}
	} finally {
		reader.releaseLock();
	}

	// Clean up
	await storage.delete(bucketName, sourceKey);
	await storage.delete(bucketName, targetKey);
}

// Stream performance monitoring
async function streamPerformanceMonitoring() {
	const bucketName = "streaming-bucket";
	const objectKey = "performance/large-file.bin";

	console.log("\n📊 Stream Performance Monitoring\n");

	// Create a large binary file
	console.log("📤 Creating large binary file...");
	const chunkSize = 1024 * 1024; // 1MB chunks
	const totalChunks = 10; // 10MB total
	const chunks = [];

	for (let i = 0; i < totalChunks; i++) {
		const chunk = new Uint8Array(chunkSize);
		// Fill with pattern
		for (let j = 0; j < chunkSize; j++) {
			chunk[j] = i % 256;
		}
		chunks.push(chunk);
	}

	const largeFile = new Uint8Array(chunkSize * totalChunks);
	for (let i = 0; i < chunks.length; i++) {
		largeFile.set(chunks[i], i * chunkSize);
	}

	await storage.upload(
		bucketName,
		objectKey,
		largeFile,
		"application/octet-stream",
	);
	console.log("✅ Large binary file uploaded");

	// Stream with performance monitoring
	console.log("\n📊 Streaming with performance monitoring...");
	const startTime = Date.now();
	const streamResult = await storage.downloadStream(bucketName, objectKey);

	if (streamResult.error) {
		console.error("❌ Stream download failed:", streamResult.error.message);
		return;
	}

	const stream = streamResult.data!;
	const reader = stream.getReader();

	let totalBytesRead = 0;
	let chunkCount = 0;
	const performanceMetrics = {
		chunkSizes: [] as number[],
		processingTimes: [] as number[],
	};

	try {
		while (true) {
			const chunkStartTime = Date.now();
			const { done, value } = await reader.read();

			if (done) break;

			const chunkEndTime = Date.now();
			const processingTime = chunkEndTime - chunkStartTime;

			totalBytesRead += value.length;
			chunkCount++;

			performanceMetrics.chunkSizes.push(value.length);
			performanceMetrics.processingTimes.push(processingTime);

			// Report progress every 2MB
			if (totalBytesRead % (2 * 1024 * 1024) === 0) {
				const elapsed = Date.now() - startTime;
				const speed = totalBytesRead / (1024 * 1024) / (elapsed / 1000); // MB/s
				console.log(
					`📊 Progress: ${totalBytesRead / (1024 * 1024)}MB, Speed: ${speed.toFixed(2)}MB/s`,
				);
			}
		}

		const totalTime = Date.now() - startTime;
		const avgChunkSize =
			performanceMetrics.chunkSizes.reduce((a, b) => a + b, 0) /
			performanceMetrics.chunkSizes.length;
		const avgProcessingTime =
			performanceMetrics.processingTimes.reduce((a, b) => a + b, 0) /
			performanceMetrics.processingTimes.length;
		const overallSpeed = totalBytesRead / (1024 * 1024) / (totalTime / 1000);

		console.log(`\n✅ Performance monitoring completed`);
		console.log(
			`📊 Total bytes read: ${(totalBytesRead / (1024 * 1024)).toFixed(2)}MB`,
		);
		console.log(`📊 Total chunks: ${chunkCount}`);
		console.log(`📊 Average chunk size: ${(avgChunkSize / 1024).toFixed(2)}KB`);
		console.log(
			`📊 Average processing time: ${avgProcessingTime.toFixed(2)}ms`,
		);
		console.log(`📊 Overall speed: ${overallSpeed.toFixed(2)}MB/s`);
		console.log(`⏱️ Total time: ${totalTime}ms`);
	} finally {
		reader.releaseLock();
	}

	// Clean up
	await storage.delete(bucketName, objectKey);
}

// Run all streaming examples
async function runStreamingExamples() {
	try {
		await basicStreamDownload();
		await streamWithBackpressure();
		await realTimeLogStreaming();
		await streamTransformation();
		await streamPerformanceMonitoring();

		console.log("\n🎉 All streaming examples completed successfully!");
	} catch (error) {
		console.error("❌ Streaming examples failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runStreamingExamples();
}

export {
	basicStreamDownload,
	streamWithBackpressure,
	realTimeLogStreaming,
	streamTransformation,
	streamPerformanceMonitoring,
	runStreamingExamples,
};
