/**
 * Basic CRUD Operations Example
 *
 * This example demonstrates the fundamental create, read, update, and delete
 * operations using the Frontal Storage SDK.
 */

import { Storage } from "@frontal/blob";

// Initialize the storage client
const storage = new Storage();

async function basicCrudExample() {
	const bucketName = "my-app-bucket";
	const objectKey = "documents/report.txt";
	const content = "This is a sample document content.";

	console.log("🚀 Starting Basic CRUD Operations Example\n");

	// CREATE: Upload a new object
	console.log("📝 Creating object...");
	const uploadResult = await storage.upload(
		bucketName,
		objectKey,
		content,
		"text/plain",
	);

	if (uploadResult.error) {
		console.error("❌ Upload failed:", uploadResult.error.message);
		return;
	}
	console.log("✅ Object uploaded successfully");

	// READ: Download the object
	console.log("\n📖 Reading object...");
	const downloadResult = await storage.download(bucketName, objectKey);

	if (downloadResult.error) {
		console.error("❌ Download failed:", downloadResult.error.message);
		return;
	}

	const downloadedContent = await downloadResult.data!.text();
	console.log("✅ Object downloaded successfully");
	console.log("Content:", downloadedContent);

	// UPDATE: Upload new content to the same key
	console.log("\n✏️ Updating object...");
	const updatedContent = "This is the updated document content.";
	const updateResult = await storage.upload(
		bucketName,
		objectKey,
		updatedContent,
		"text/plain",
	);

	if (updateResult.error) {
		console.error("❌ Update failed:", updateResult.error.message);
		return;
	}
	console.log("✅ Object updated successfully");

	// Verify the update
	const verifyResult = await storage.download(bucketName, objectKey);
	if (!verifyResult.error) {
		const verifyContent = await verifyResult.data!.text();
		console.log("Updated content:", verifyContent);
	}

	// DELETE: Remove the object
	console.log("\n🗑️ Deleting object...");
	const deleteResult = await storage.delete(bucketName, objectKey);

	if (deleteResult.error) {
		console.error("❌ Delete failed:", deleteResult.error.message);
		return;
	}
	console.log("✅ Object deleted successfully");

	// Verify deletion
	const verifyDeletion = await storage.download(bucketName, objectKey);
	if (verifyDeletion.error) {
		console.log("✅ Deletion verified - object no longer exists");
	} else {
		console.log("⚠️ Warning: Object still exists after deletion");
	}
}

// List objects in a bucket
async function listObjectsExample() {
	const bucketName = "my-app-bucket";

	console.log("\n📋 Listing Objects Example");

	// Upload some test objects first
	await storage.upload(
		bucketName,
		"docs/README.md",
		"# README",
		"text/markdown",
	);
	await storage.upload(
		bucketName,
		"docs/config.json",
		'{"version": "1.0"}',
		"application/json",
	);
	await storage.upload(
		bucketName,
		"images/logo.png",
		new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
		"image/png",
	);

	// List all objects
	console.log("\n📁 All objects in bucket:");
	const listResult = await storage.list(bucketName);

	if (listResult.error) {
		console.error("❌ List failed:", listResult.error.message);
		return;
	}

	listResult.data!.objects.forEach((obj, index) => {
		console.log(
			`${index + 1}. ${obj.key} (${obj.size} bytes, ${obj.contentType})`,
		);
	});

	// List objects with prefix
	console.log("\n📁 Objects with 'docs/' prefix:");
	const docsResult = await storage.list(bucketName, "docs/");

	if (!docsResult.error) {
		docsResult.data!.objects.forEach((obj, index) => {
			console.log(
				`${index + 1}. ${obj.key} (${obj.size} bytes, ${obj.contentType})`,
			);
		});
	}

	// Clean up
	await storage.delete(bucketName, "docs/README.md");
	await storage.delete(bucketName, "docs/config.json");
	await storage.delete(bucketName, "images/logo.png");
}

// Copy and move operations
async function copyMoveExample() {
	const bucketName = "my-app-bucket";
	const sourceKey = "source/original.txt";
	const destKey = "destination/copied.txt";
	const movedKey = "destination/moved.txt";

	console.log("\n🔄 Copy and Move Operations Example");

	// Upload source file
	await storage.upload(bucketName, sourceKey, "Original content", "text/plain");

	// Copy operation
	console.log("📋 Copying object...");
	const copyResult = await storage.copyObject(
		bucketName,
		sourceKey,
		bucketName,
		destKey,
	);

	if (copyResult.error) {
		console.error("❌ Copy failed:", copyResult.error.message);
		return;
	}
	console.log("✅ Object copied successfully");

	// Move operation
	console.log("➡️ Moving object...");
	const moveResult = await storage.moveObject(
		bucketName,
		destKey,
		bucketName,
		movedKey,
	);

	if (moveResult.error) {
		console.error("❌ Move failed:", moveResult.error.message);
		return;
	}
	console.log("✅ Object moved successfully");

	// Verify operations
	const originalExists = !(await storage
		.download(bucketName, sourceKey)
		.then((r) => r.error));
	const copiedExists = !(await storage
		.download(bucketName, destKey)
		.then((r) => r.error));
	const movedExists = !(await storage
		.download(bucketName, movedKey)
		.then((r) => r.error));

	console.log(`Original "${sourceKey}" exists: ${originalExists}`);
	console.log(`Copied "${destKey}" exists: ${copiedExists}`);
	console.log(`Moved "${movedKey}" exists: ${movedExists}`);

	// Clean up
	await storage.delete(bucketName, sourceKey);
	await storage.delete(bucketName, movedKey);
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
