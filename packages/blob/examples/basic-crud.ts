/**
 * Basic CRUD Operations Example
 *
 * This example demonstrates the fundamental create, read, update, and delete
 * operations using the Frontal Blob SDK. Methods return their results directly
 * and throw a FrontalError on failure.
 */

import { blob } from "@frontal-labs/blob";

// Use the default blob singleton

async function basicCrudExample() {
	const bucketName = "my-app-bucket";
	const objectKey = "documents/report.txt";

	console.log("🚀 Starting Basic CRUD Operations Example\n");

	// CREATE: Upload a new object
	console.log("📝 Creating object...");
	await blob.upload({
		bucket: bucketName,
		key: objectKey,
		data: new TextEncoder().encode("This is a sample document content."),
		contentType: "text/plain",
	});
	console.log("✅ Object uploaded successfully");

	// READ: Download the object
	console.log("\n📖 Reading object...");
	const downloaded = await blob.download({ bucket: bucketName, key: objectKey });
	console.log("✅ Object downloaded successfully");
	console.log("Content:", await downloaded.text());

	// UPDATE: Upload new content to the same key (overwrites the object)
	console.log("\n✏️ Updating object...");
	await blob.upload({
		bucket: bucketName,
		key: objectKey,
		data: new TextEncoder().encode("This is the updated document content."),
		contentType: "text/plain",
	});
	console.log("✅ Object updated successfully");

	// Verify the update
	const verified = await blob.download({ bucket: bucketName, key: objectKey });
	console.log("Updated content:", await verified.text());

	// DELETE: Remove the object
	console.log("\n🗑️ Deleting object...");
	await blob.delete({ bucket: bucketName, key: objectKey });
	console.log("✅ Object deleted successfully");

	// Verify deletion: a download of a missing object throws a FrontalError
	try {
		await blob.download({ bucket: bucketName, key: objectKey });
		console.log("⚠️ Warning: Object still exists after deletion");
	} catch {
		console.log("✅ Deletion verified - object no longer exists");
	}
}

// List objects in a bucket
async function listObjectsExample() {
	const bucketName = "my-app-bucket";

	console.log("\n📋 Listing Objects Example");

	// Upload some test objects first
	await blob.upload({
		bucket: bucketName,
		key: "docs/README.md",
		data: new TextEncoder().encode("# README"),
		contentType: "text/markdown",
	});
	await blob.upload({
		bucket: bucketName,
		key: "docs/config.json",
		data: new TextEncoder().encode('{"version": "1.0"}'),
		contentType: "application/json",
	});
	await blob.upload({
		bucket: bucketName,
		key: "images/logo.png",
		data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
		contentType: "image/png",
	});

	// List all objects
	console.log("\n📁 All objects in bucket:");
	const all = await blob.list({ bucket: bucketName });
	all.objects.forEach((obj, index) => {
		console.log(
			`${index + 1}. ${obj.key} (${obj.size} bytes, ${obj.contentType})`,
		);
	});

	// List objects with prefix
	console.log("\n📁 Objects with 'docs/' prefix:");
	const docs = await blob.list({ bucket: bucketName, prefix: "docs/" });
	docs.objects.forEach((obj, index) => {
		console.log(
			`${index + 1}. ${obj.key} (${obj.size} bytes, ${obj.contentType})`,
		);
	});

	// Clean up
	await blob.delete({ bucket: bucketName, key: "docs/README.md" });
	await blob.delete({ bucket: bucketName, key: "docs/config.json" });
	await blob.delete({ bucket: bucketName, key: "images/logo.png" });
}

// Copy and move operations
async function copyMoveExample() {
	const bucketName = "my-app-bucket";
	const sourceKey = "source/original.txt";
	const destKey = "destination/copied.txt";
	const movedKey = "destination/moved.txt";

	console.log("\n🔄 Copy and Move Operations Example");

	// Upload source file
	await blob.upload({
		bucket: bucketName,
		key: sourceKey,
		data: new TextEncoder().encode("Original content"),
		contentType: "text/plain",
	});

	// Copy operation
	console.log("📋 Copying object...");
	await blob.copyObject({
		sourceBucket: bucketName,
		sourceKey,
		destBucket: bucketName,
		destKey,
	});
	console.log("✅ Object copied successfully");

	// Move operation
	console.log("➡️ Moving object...");
	await blob.moveObject({
		sourceBucket: bucketName,
		sourceKey: destKey,
		destBucket: bucketName,
		destKey: movedKey,
	});
	console.log("✅ Object moved successfully");

	// Verify operations with getMetadata, which throws when the object is missing
	const exists = async (key: string) => {
		try {
			await blob.getMetadata({ bucket: bucketName, key });
			return true;
		} catch {
			return false;
		}
	};

	console.log(`Original "${sourceKey}" exists: ${await exists(sourceKey)}`);
	console.log(`Copied "${destKey}" exists: ${await exists(destKey)}`);
	console.log(`Moved "${movedKey}" exists: ${await exists(movedKey)}`);

	// Clean up
	await blob.delete({ bucket: bucketName, key: sourceKey });
	await blob.delete({ bucket: bucketName, key: movedKey });
}

// Run all examples
async function runExamples() {
	try {
		await basicCrudExample();
		await listObjectsExample();
		await copyMoveExample();
		console.log("\n🎉 All CRUD examples completed successfully!");
	} catch (error) {
		console.error("❌ Example failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runExamples();
}

export { basicCrudExample, listObjectsExample, copyMoveExample, runExamples };
