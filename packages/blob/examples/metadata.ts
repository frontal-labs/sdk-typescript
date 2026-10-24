/**
 * Metadata Operations Example
 *
 * This example demonstrates how to work with object metadata, including
 * retrieving, analyzing, and utilizing storage object metadata.
 *
 * `getMetadata` returns a `BlobObject` directly and throws a FrontalError
 * when the object cannot be read.
 */

import { type BlobObject, blob } from "@frontal-labs/blob";

// Use the default blob singleton

const encoder = new TextEncoder();

// Basic metadata retrieval
async function basicMetadataRetrieval() {
	const bucketName = "metadata-bucket";
	const objectKey = "documents/report.pdf";

	console.log("📋 Basic Metadata Retrieval Example\n");

	// Upload a file with specific content
	console.log("📤 Uploading test file...");
	const content = "This is a sample PDF content for metadata testing.";
	try {
		await blob.upload({
			bucket: bucketName,
			key: objectKey,
			data: encoder.encode(content),
			contentType: "application/pdf",
		});
	} catch (error) {
		console.error("❌ Upload failed:", error);
		return;
	}
	console.log("✅ File uploaded successfully");

	// Retrieve metadata
	console.log("\n📊 Retrieving object metadata...");
	let metadata: BlobObject;
	try {
		metadata = await blob.getMetadata({ bucket: bucketName, key: objectKey });
	} catch (error) {
		console.error("❌ Metadata retrieval failed:", error);
		return;
	}
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
	await blob.delete({ bucket: bucketName, key: objectKey });
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
		await blob.upload({
			bucket: bucketName,
			key: file.key,
			data: typeof file.content === "string"
				? encoder.encode(file.content)
				: file.content,
			contentType: file.type,
		});
	}
	console.log(`✅ ${files.length} files uploaded`);

	// Retrieve metadata for all files
	console.log("\n📊 Retrieving metadata for analysis...");
	const metadataList = [];

	for (const file of files) {
		try {
			metadataList.push(
				await blob.getMetadata({ bucket: bucketName, key: file.key }),
			);
		} catch (error) {
			console.error(`❌ Could not read metadata for ${file.key}:`, error);
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

	console.log("📊 Size Analysis:");
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

	console.log("\n📋 Content Type Distribution:");
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

	console.log("\n⏰ Time Analysis:");
	console.log(`  Oldest: ${new Date(oldestTime).toISOString()}`);
	console.log(`  Newest: ${new Date(newestTime).toISOString()}`);
	console.log(`  Time span: ${timeSpan}ms`);

	// Find largest and smallest files
	const largestFile = metadataList.find((m) => m.size === maxSize);
	const smallestFile = metadataList.find((m) => m.size === minSize);

	console.log("\n📂 File Details:");
	console.log(`  Largest: ${largestFile?.key} (${largestFile?.size} bytes)`);
	console.log(`  Smallest: ${smallestFile?.key} (${smallestFile?.size} bytes)`);

	// Clean up
	for (const file of files) {
		await blob.delete({ bucket: bucketName, key: file.key });
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
		await blob.upload({
			bucket: bucketName,
			key: file.key,
			data: typeof file.content === "string"
				? encoder.encode(file.content)
				: file.content,
			contentType: file.type,
		});
	}
	console.log(`✅ ${managedFiles.length} files uploaded`);

	// Get all metadata
	console.log("\n📊 Retrieving metadata for management...");
	const allMetadata = [];

	for (const file of managedFiles) {
		try {
			allMetadata.push(
				await blob.getMetadata({ bucket: bucketName, key: file.key }),
			);
		} catch (error) {
			console.error(`❌ Could not read metadata for ${file.key}:`, error);
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
		await blob.delete({ bucket: bucketName, key: file.key });
	}
}

// Metadata validation and verification
async function metadataValidation() {
	const bucketName = "metadata-bucket";
	const objectKey = "validation/test-file.txt";

	console.log("\n✅ Metadata Validation Example\n");

	// Upload a test file
	const content = "This is test content for validation.";
	await blob.upload({
		bucket: bucketName,
		key: objectKey,
		data: encoder.encode(content),
		contentType: "text/plain",
	});
	console.log("✅ Test file uploaded");

	// Retrieve metadata
	let metadata: BlobObject;
	try {
		metadata = await blob.getMetadata({ bucket: bucketName, key: objectKey });
	} catch (error) {
		console.error("❌ Metadata retrieval failed:", error);
		return;
	}
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
	try {
		const downloaded = await blob.download({
			bucket: bucketName,
			key: objectKey,
		});
		const actualSize = downloaded.size;
		const actualContentType = downloaded.type;

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
	} catch (error) {
		console.error("❌ Download for cross-validation failed:", error);
	}

	// Clean up
	await blob.delete({ bucket: bucketName, key: objectKey });
}

// Metadata caching strategy
async function metadataCaching() {
	const bucketName = "metadata-bucket";
	const cache = new Map<string, BlobObject>();
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
		await blob.upload({
			bucket: bucketName,
			key: file.key,
			data: encoder.encode(file.content),
			contentType: file.type,
		});
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

		// Fetch from storage (throws on failure, so nothing is cached)
		console.log(`🌐 Cache MISS for ${key} - fetching from storage`);
		const metadata = await blob.getMetadata({ bucket, key });

		cache.set(cacheKey, metadata);
		cacheExpiry.set(cacheKey, now + cacheTimeout);

		return metadata;
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
	console.log("\n📊 Cache Statistics:");
	console.log(`Cached entries: ${cache.size}`);
	console.log(`Cache keys: ${Array.from(cache.keys()).join(", ")}`);

	// Clean up
	for (const file of testFiles) {
		await blob.delete({ bucket: bucketName, key: file.key });
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
