/**
 * Metadata Operations Example
 *
 * This example demonstrates how to work with object metadata, including
 * retrieving, analyzing, and utilizing storage object metadata.
 */

import { blob } from "@frontal-labs/blob";

// Use the default blob singleton

// Basic metadata retrieval
async function basicMetadataRetrieval() {
	const bucketName = "metadata-bucket";
	const objectKey = "documents/report.pdf";

	console.log("📋 Basic Metadata Retrieval Example\n");

	// Upload a file with specific content
	console.log("📤 Uploading test file...");
	const content = "This is a sample PDF content for metadata testing.";
	const uploadResult = await blob.upload(
		bucketName,
		objectKey,
		content,
		"application/pdf",
	);

	if (uploadResult.error) {
		console.error("❌ Upload failed:", uploadResult.error.message);
		return;
	}
	console.log("✅ File uploaded successfully");

	// Retrieve metadata
	console.log("\n📊 Retrieving object metadata...");
	const metadataResult = await blob.getMetadata(bucketName, objectKey);

	if (metadataResult.error) {
		console.error(
			"❌ Metadata retrieval failed:",
			metadataResult.error.message,
		);
		return;
	}

	const metadata = metadataResult.data!;
	console.log("✅ Metadata retrieved successfully");

	// Display metadata information
	console.log("\n📋 Object Metadata:");
	console.log(`Key: ${metadata.key}`);
	console.log(`Size: ${metadata.size} bytes`);
	console.log(`Content-Type: ${metadata.contentType}`);
	console.log(`Last Modified: ${metadata.lastModified}`);
	console.log(`ETag: ${metadata.etag}`);

	if (metadata.metadata) {
		console.log("Custom Metadata:");
		Object.entries(metadata.metadata).forEach(([key, value]) => {
			console.log(`  ${key}: ${value}`);
		});
	} else {
		console.log("No custom metadata found");
	}

	// Clean up
	await blob.delete(bucketName, objectKey);
}

// Metadata analysis and comparison
async function metadataAnalysis() {
	const bucketName = "metadata-bucket";
	const files = [
		{ key: "texts/small.txt", content: "Small content", type: "text/plain" },
		{
			key: "texts/medium.txt",
			content:
				"This is medium content that is longer than small content but still reasonable.",
			type: "text/plain",
		},
		{
			key: "texts/large.txt",
			content:
				"This is large content that is significantly longer than both small and medium content combined. It contains multiple sentences and provides substantial text for analysis purposes.",
			type: "text/plain",
		},
		{
			key: "data/config.json",
			content: '{"env": "production", "debug": false}',
			type: "application/json",
		},
		{
			key: "data/image.png",
			content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
			type: "image/png",
		},
	];

	console.log("\n📊 Metadata Analysis Example\n");

	// Upload all test files
	console.log("📤 Uploading test files...");
	for (const file of files) {
		await blob.upload(bucketName, file.key, file.content, file.type);
	}
	console.log(`✅ ${files.length} files uploaded`);

	// Retrieve metadata for all files
	console.log("\n📊 Retrieving metadata for analysis...");
	const metadataList = [];

	for (const file of files) {
		const result = await blob.getMetadata(bucketName, file.key);
		if (!result.error) {
			metadataList.push(result.data!);
		}
	}

	console.log(`✅ Retrieved metadata for ${metadataList.length} files`);

	// Analyze metadata
	console.log("\n📈 Metadata Analysis Results:");

	// Size analysis
	const sizes = metadataList.map((m) => m.size);
	const totalSize = sizes.reduce((a, b) => a + b, 0);
	const avgSize = totalSize / sizes.length;
	const maxSize = Math.max(...sizes);
	const minSize = Math.min(...sizes);

	console.log(`📊 Size Analysis:`);
	console.log(`  Total size: ${totalSize} bytes`);
	console.log(`  Average size: ${avgSize.toFixed(2)} bytes`);
	console.log(`  Largest file: ${maxSize} bytes`);
	console.log(`  Smallest file: ${minSize} bytes`);

	// Content type analysis
	const contentTypeCounts: Record<string, number> = {};
	metadataList.forEach((m) => {
		contentTypeCounts[m.contentType] =
			(contentTypeCounts[m.contentType] || 0) + 1;
	});

	console.log(`\n📋 Content Type Distribution:`);
	Object.entries(contentTypeCounts).forEach(([type, count]) => {
		console.log(`  ${type}: ${count} file(s)`);
	});

	// Time analysis
	const timestamps = metadataList.map((m) =>
		new Date(m.lastModified).getTime(),
	);
	const oldestTime = Math.min(...timestamps);
	const newestTime = Math.max(...timestamps);
	const timeSpan = newestTime - oldestTime;

	console.log(`\n⏰ Time Analysis:`);
	console.log(`  Oldest: ${new Date(oldestTime).toISOString()}`);
	console.log(`  Newest: ${new Date(newestTime).toISOString()}`);
	console.log(`  Time span: ${timeSpan}ms`);

	// Find largest and smallest files
	const largestFile = metadataList.find((m) => m.size === maxSize);
	const smallestFile = metadataList.find((m) => m.size === minSize);

	console.log(`\n📂 File Details:`);
	console.log(`  Largest: ${largestFile?.key} (${largestFile?.size} bytes)`);
	console.log(`  Smallest: ${smallestFile?.key} (${smallestFile?.size} bytes)`);

	// Clean up
	for (const file of files) {
		await blob.delete(bucketName, file.key);
	}
}

// Metadata-based file management
async function metadataBasedManagement() {
	const bucketName = "metadata-bucket";
	const currentDate = new Date().toISOString().split("T")[0];

	console.log("\n🗂️ Metadata-based File Management Example\n");

	// Create files with different characteristics
	const managedFiles = [
		{
			key: `logs/${currentDate}-app.log`,
			content: "Application log content",
			type: "text/plain",
		},
		{
			key: `logs/${currentDate}-error.log`,
			content: "Error log content",
			type: "text/plain",
		},
		{
			key: `backups/${currentDate}-backup.zip`,
			content: new Uint8Array([0x50, 0x4b]),
			type: "application/zip",
		},
		{
			key: `documents/${currentDate}-report.pdf`,
			content: "PDF report content",
			type: "application/pdf",
		},
		{
			key: `images/${currentDate}-screenshot.png`,
			content: new Uint8Array([0x89, 0x50]),
			type: "image/png",
		},
	];

	// Upload files
	console.log("📤 Uploading managed files...");
	for (const file of managedFiles) {
		await blob.upload(bucketName, file.key, file.content, file.type);
	}
	console.log(`✅ ${managedFiles.length} files uploaded`);

	// Get all metadata
	console.log("\n📊 Retrieving metadata for management...");
	const allMetadata = [];

	for (const file of managedFiles) {
		const result = await blob.getMetadata(bucketName, file.key);
		if (!result.error) {
			allMetadata.push(result.data!);
		}
	}

	// Categorize files by type
	console.log("\n📂 File Categorization:");
	const categorizedFiles: Record<string, typeof allMetadata> = {};

	allMetadata.forEach((metadata) => {
		const category = metadata.key.split("/")[0]; // Get first folder as category
		if (!categorizedFiles[category]) {
			categorizedFiles[category] = [];
		}
		categorizedFiles[category].push(metadata);
	});

	Object.entries(categorizedFiles).forEach(([category, files]) => {
		console.log(`\n📁 ${category.toUpperCase()}:`);
		files.forEach((file) => {
			const fileName = file.key.split("/").pop();
			console.log(`  📄 ${fileName} (${file.size} bytes, ${file.contentType})`);
		});
	});

	// Find files by size criteria
	console.log("\n📊 Size-based Management:");
	const largeFiles = allMetadata.filter((m) => m.size > 20);
	const smallFiles = allMetadata.filter((m) => m.size <= 20);

	console.log(`📄 Large files (>20 bytes): ${largeFiles.length}`);
	largeFiles.forEach((file) => {
		console.log(`  - ${file.key}: ${file.size} bytes`);
	});

	console.log(`📄 Small files (≤20 bytes): ${smallFiles.length}`);
	smallFiles.forEach((file) => {
		console.log(`  - ${file.key}: ${file.size} bytes`);
	});

	// Find files by content type
	console.log("\n📋 Content Type Management:");
	const textFiles = allMetadata.filter((m) =>
		m.contentType.startsWith("text/"),
	);
	const binaryFiles = allMetadata.filter(
		(m) => !m.contentType.startsWith("text/"),
	);

	console.log(`📝 Text files: ${textFiles.length}`);
	console.log(`🔢 Binary files: ${binaryFiles.length}`);

	// Clean up
	for (const file of managedFiles) {
		await blob.delete(bucketName, file.key);
	}
}

// Metadata validation and verification
async function metadataValidation() {
	const bucketName = "metadata-bucket";
	const objectKey = "validation/test-file.txt";

	console.log("\n✅ Metadata Validation Example\n");

	// Upload a test file
	const content = "This is test content for validation.";
	await blob.upload(bucketName, objectKey, content, "text/plain");
	console.log("✅ Test file uploaded");

	// Retrieve metadata
	const metadataResult = await blob.getMetadata(bucketName, objectKey);

	if (metadataResult.error) {
		console.error(
			"❌ Metadata retrieval failed:",
			metadataResult.error.message,
		);
		return;
	}

	const metadata = metadataResult.data!;
	console.log("✅ Metadata retrieved for validation");

	// Validate metadata structure
	console.log("\n🔍 Validating metadata structure...");
	const validations = [
		{
			name: "Key exists",
			test: () => metadata.key && typeof metadata.key === "string",
		},
		{
			name: "Size is positive number",
			test: () => typeof metadata.size === "number" && metadata.size >= 0,
		},
		{
			name: "Content-Type exists",
			test: () =>
				metadata.contentType && typeof metadata.contentType === "string",
		},
		{
			name: "Last Modified is valid date",
			test: () => {
				const date = new Date(metadata.lastModified);
				return !Number.isNaN(date.getTime());
			},
		},
		{
			name: "ETag exists",
			test: () => metadata.etag && typeof metadata.etag === "string",
		},
	];

	let passedValidations = 0;
	validations.forEach((validation) => {
		const passed = validation.test();
		console.log(
			`${passed ? "✅" : "❌"} ${validation.name}: ${passed ? "PASS" : "FAIL"}`,
		);
		if (passed) passedValidations++;
	});

	console.log(
		`\n📊 Validation Summary: ${passedValidations}/${validations.length} checks passed`,
	);

	// Cross-validate with actual content
	console.log("\n🔄 Cross-validating with actual content...");
	const downloadResult = await blob.download(bucketName, objectKey);

	if (!downloadResult.error) {
		const actualSize = downloadResult.data?.size;
		const actualContentType = downloadResult.data?.type;

		const sizeMatch = metadata.size === actualSize;
		const contentTypeMatch = metadata.contentType === actualContentType;

		console.log(
			`${sizeMatch ? "✅" : "❌"} Size match: ${metadata.size} vs ${actualSize}`,
		);
		console.log(
			`${contentTypeMatch ? "✅" : "❌"} Content-Type match: ${metadata.contentType} vs ${actualContentType}`,
		);

		const crossValidationPassed = sizeMatch && contentTypeMatch;
		console.log(
			`\n📊 Cross-validation: ${crossValidationPassed ? "PASSED" : "FAILED"}`,
		);
	}

	// Clean up
	await blob.delete(bucketName, objectKey);
}

// Metadata caching strategy
async function metadataCaching() {
	const bucketName = "metadata-bucket";
	const cache = new Map<string, any>();
	const cacheExpiry = new Map<string, number>();
	const cacheTimeout = 30000; // 30 seconds

	console.log("\n💾 Metadata Caching Strategy Example\n");

	// Create test files
	const testFiles = [
		{ key: "cache/file1.txt", content: "Content 1", type: "text/plain" },
		{ key: "cache/file2.txt", content: "Content 2", type: "text/plain" },
		{ key: "cache/file3.txt", content: "Content 3", type: "text/plain" },
	];

	for (const file of testFiles) {
		await blob.upload(bucketName, file.key, file.content, file.type);
	}
	console.log("✅ Test files uploaded");

	// Function to get metadata with caching
	async function getCachedMetadata(bucket: string, key: string) {
		const cacheKey = `${bucket}:${key}`;
		const now = Date.now();

		// Check cache
		if (cache.has(cacheKey) && cacheExpiry.get(cacheKey)! > now) {
			console.log(`📋 Cache HIT for ${key}`);
			return cache.get(cacheKey);
		}

		// Fetch from storage
		console.log(`🌐 Cache MISS for ${key} - fetching from storage`);
		const result = await blob.getMetadata(bucket, key);

		if (!result.error) {
			// Store in cache
			cache.set(cacheKey, result.data);
			cacheExpiry.set(cacheKey, now + cacheTimeout);
		}

		return result.data;
	}

	// Test caching behavior
	console.log("\n🧪 Testing caching behavior...");

	// First access (cache miss)
	console.log("\n📥 First access (should be cache miss):");
	await getCachedMetadata(bucketName, "cache/file1.txt");

	// Second access (cache hit)
	console.log("\n📥 Second access (should be cache hit):");
	await getCachedMetadata(bucketName, "cache/file1.txt");

	// Access different files
	console.log("\n📥 Accessing different files:");
	for (const file of testFiles) {
		await getCachedMetadata(bucketName, file.key);
	}

	// Access again (all should be cache hits)
	console.log("\n📥 Accessing again (all should be cache hits):");
	for (const file of testFiles) {
		await getCachedMetadata(bucketName, file.key);
	}

	// Display cache statistics
	console.log(`\n📊 Cache Statistics:`);
	console.log(`Cached entries: ${cache.size}`);
	console.log(`Cache keys: ${Array.from(cache.keys()).join(", ")}`);

	// Clean up
	for (const file of testFiles) {
		await blob.delete(bucketName, file.key);
	}
}

// Run all metadata examples
async function runMetadataExamples() {
	try {
		await basicMetadataRetrieval();
		await metadataAnalysis();
		await metadataBasedManagement();
		await metadataValidation();
		await metadataCaching();

		console.log("\n🎉 All metadata examples completed successfully!");
	} catch (error) {
		console.error("❌ Metadata examples failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runMetadataExamples();
}

export {
	basicMetadataRetrieval,
	metadataAnalysis,
	metadataBasedManagement,
	metadataValidation,
	metadataCaching,
	runMetadataExamples,
};
