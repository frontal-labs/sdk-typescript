/**
 * File Operations Example
 *
 * This example demonstrates various file upload and download operations
 * including different data types, content types, and file handling patterns.
 *
 * Blob methods return their results directly and throw a FrontalError on
 * failure, so each call is wrapped in try/catch where a failure should be
 * reported instead of crashing the example.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blob } from "@frontal-labs/blob";

// Use the default blob singleton

const encoder = new TextEncoder();

// Upload different types of data
async function uploadDifferentDataTypes() {
	const bucketName = "file-operations-bucket";

	console.log("📁 Upload Different Data Types Example\n");

	// 1. Upload string content (encoded to bytes)
	console.log("📝 Uploading string content...");
	try {
		await blob.upload({
			bucket: bucketName,
			key: "text-files/sample.txt",
			data: encoder.encode("Hello, World! This is a text file."),
			contentType: "text/plain",
		});
		console.log("✅ String content uploaded");
	} catch (error) {
		console.error("❌ String upload failed:", error);
	}

	// 2. Upload JSON data
	console.log("\n📋 Uploading JSON data...");
	const jsonData = {
		name: "John Doe",
		email: "john@example.com",
		age: 30,
		preferences: {
			theme: "dark",
			notifications: true,
		},
	};

	try {
		await blob.upload({
			bucket: bucketName,
			key: "data/users.json",
			data: encoder.encode(JSON.stringify(jsonData, null, 2)),
			contentType: "application/json",
		});
		console.log("✅ JSON data uploaded");
	} catch (error) {
		console.error("❌ JSON upload failed:", error);
	}

	// 3. Upload binary data (simulated image)
	console.log("\n🖼️ Uploading binary data...");
	// Simulate a small PNG header
	const imageHeader = new Uint8Array([
		0x89,
		0x50,
		0x4e,
		0x47,
		0x0d,
		0x0a,
		0x1a,
		0x0a, // PNG signature
		0x00,
		0x00,
		0x00,
		0x0d, // IHDR chunk length
		0x49,
		0x48,
		0x44,
		0x52, // IHDR
		0x00,
		0x00,
		0x00,
		0x01, // Width: 1
		0x00,
		0x00,
		0x00,
		0x01, // Height: 1
		0x08,
		0x02,
		0x00,
		0x00,
		0x00, // Bit depth, color type, compression, filter, interlace
	]);

	try {
		await blob.upload({
			bucket: bucketName,
			key: "images/tiny.png",
			data: imageHeader,
			contentType: "image/png",
		});
		console.log("✅ Binary data uploaded");
	} catch (error) {
		console.error("❌ Binary upload failed:", error);
	}

	// 4. Upload CSV data
	console.log("\n📊 Uploading CSV data...");
	const csvData = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Johnson,bob@example.com,35`;

	try {
		await blob.upload({
			bucket: bucketName,
			key: "data/users.csv",
			data: encoder.encode(csvData),
			contentType: "text/csv",
		});
		console.log("✅ CSV data uploaded");
	} catch (error) {
		console.error("❌ CSV upload failed:", error);
	}

	return bucketName;
}

// Download and handle different file types
async function downloadAndProcessFiles(bucketName: string) {
	console.log("\n📥 Download and Process Files Example\n");

	// Download text file
	console.log("📝 Downloading text file...");
	try {
		const textFile = await blob.download({
			bucket: bucketName,
			key: "text-files/sample.txt",
		});
		console.log("✅ Text file downloaded");
		console.log("Content:", await textFile.text());
		console.log("Size:", textFile.size, "bytes");
	} catch (error) {
		console.error("❌ Text download failed:", error);
	}

	// Download JSON file
	console.log("\n📋 Downloading JSON file...");
	try {
		const jsonFile = await blob.download({
			bucket: bucketName,
			key: "data/users.json",
		});
		const parsedData = JSON.parse(await jsonFile.text());
		console.log("✅ JSON file downloaded");
		console.log("Parsed data:", parsedData);
	} catch (error) {
		console.error("❌ JSON download failed:", error);
	}

	// Download binary file
	console.log("\n🖼️ Downloading binary file...");
	try {
		const binaryFile = await blob.download({
			bucket: bucketName,
			key: "images/tiny.png",
		});
		const uint8Array = new Uint8Array(await binaryFile.arrayBuffer());
		console.log("✅ Binary file downloaded");
		console.log("Size:", uint8Array.length, "bytes");
		console.log(
			"First 8 bytes (PNG signature):",
			Array.from(uint8Array.slice(0, 8))
				.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`)
				.join(" "),
		);
	} catch (error) {
		console.error("❌ Binary download failed:", error);
	}

	// Download CSV file
	console.log("\n📊 Downloading CSV file...");
	try {
		const csvFile = await blob.download({
			bucket: bucketName,
			key: "data/users.csv",
		});
		const lines = (await csvFile.text()).split("\n");
		const headers = lines[0].split(",");
		console.log("✅ CSV file downloaded");
		console.log("Headers:", headers);
		console.log(
			"Data rows:",
			lines.slice(1).filter((line) => line.trim()),
		);
	} catch (error) {
		console.error("❌ CSV download failed:", error);
	}
}

// File upload from local filesystem
async function uploadFromLocalFile() {
	console.log("\n💾 Upload from Local Filesystem Example\n");

	// Create a temporary local file for demonstration
	const tempDir = "/tmp";
	const fileName = "temp-upload.txt";
	const filePath = join(tempDir, fileName);
	const fileContent = "This file was created locally and uploaded to storage.";

	// Write to local file
	writeFileSync(filePath, fileContent);
	console.log(`📝 Created local file: ${filePath}`);

	// Read file and upload
	const bucketName = "file-operations-bucket";
	const objectKey = `uploads/${fileName}`;
	try {
		const fileBuffer = readFileSync(filePath);
		await blob.upload({
			bucket: bucketName,
			key: objectKey,
			data: fileBuffer,
			contentType: "text/plain",
		});
		console.log("✅ Local file uploaded successfully");

		// Verify by downloading
		const downloaded = await blob.download({
			bucket: bucketName,
			key: objectKey,
		});
		console.log(
			"✅ Upload verified - content matches:",
			(await downloaded.text()) === fileContent,
		);
	} catch (error) {
		console.error("❌ Local file upload or verification failed:", error);
	}
}

// Download and save to local filesystem
async function downloadToLocalFile() {
	console.log("\n💾 Download to Local Filesystem Example\n");

	const bucketName = "file-operations-bucket";
	const sourceKey = "text-files/sample.txt";
	const localPath = "/tmp/downloaded-file.txt";

	try {
		const downloaded = await blob.download({
			bucket: bucketName,
			key: sourceKey,
		});
		const buffer = Buffer.from(await downloaded.arrayBuffer());
		writeFileSync(localPath, buffer);

		console.log(`✅ File downloaded and saved to: ${localPath}`);

		// Verify by reading back
		const savedContent = readFileSync(localPath, "utf8");
		console.log(
			"Saved content preview:",
			`${savedContent.substring(0, 50)}...`,
		);
	} catch (error) {
		console.error("❌ Download or local save failed:", error);
	}
}

// Batch operations
async function batchOperations() {
	console.log("\n📦 Batch Operations Example\n");

	const bucketName = "file-operations-bucket";
	const files = [
		{
			key: "batch/file1.txt",
			content: "Content of file 1",
			type: "text/plain",
		},
		{
			key: "batch/file2.txt",
			content: "Content of file 2",
			type: "text/plain",
		},
		{
			key: "batch/file3.txt",
			content: "Content of file 3",
			type: "text/plain",
		},
	];

	// Batch upload. Promise.allSettled keeps going when one call throws.
	console.log("📤 Batch uploading files...");
	const uploadResults = await Promise.allSettled(
		files.map((file) =>
			blob.upload({
				bucket: bucketName,
				key: file.key,
				data: encoder.encode(file.content),
				contentType: file.type,
			}),
		),
	);
	const successfulUploads = uploadResults.filter(
		(result) => result.status === "fulfilled",
	).length;
	console.log(
		`✅ ${successfulUploads}/${files.length} files uploaded successfully`,
	);

	// List uploaded files
	console.log("\n📋 Listing batch files...");
	try {
		const listed = await blob.list({ bucket: bucketName, prefix: "batch/" });
		console.log(
			`Found ${listed.objects.length} files in batch/ directory:`,
		);
		listed.objects.forEach((obj) => {
			console.log(`  - ${obj.key} (${obj.size} bytes)`);
		});
	} catch (error) {
		console.error("❌ List failed:", error);
	}

	// Batch download
	console.log("\n📥 Batch downloading files...");
	const downloadResults = await Promise.allSettled(
		files.map((file) => blob.download({ bucket: bucketName, key: file.key })),
	);
	const successfulDownloads = downloadResults.filter(
		(result) => result.status === "fulfilled",
	).length;
	console.log(
		`✅ ${successfulDownloads}/${files.length} files downloaded successfully`,
	);

	// Batch cleanup
	console.log("\n🗑️ Batch cleaning up files...");
	const deleteResults = await Promise.allSettled(
		files.map((file) => blob.delete({ bucket: bucketName, key: file.key })),
	);
	const successfulDeletes = deleteResults.filter(
		(result) => result.status === "fulfilled",
	).length;
	console.log(
		`✅ ${successfulDeletes}/${files.length} files deleted successfully`,
	);
}

// Clean up all example files
async function cleanup(bucketName: string) {
	console.log("\n🧹 Cleaning up example files...");

	const filesToDelete = [
		"text-files/sample.txt",
		"data/users.json",
		"data/users.csv",
		"images/tiny.png",
		"uploads/temp-upload.txt",
	];

	await Promise.all(
		filesToDelete.map((key) => blob.delete({ bucket: bucketName, key })),
	);
	console.log("✅ Cleanup completed");
}

// Run all examples
async function runFileOperationsExamples() {
	try {
		const bucketName = await uploadDifferentDataTypes();
		await downloadAndProcessFiles(bucketName);
		await uploadFromLocalFile();
		await downloadToLocalFile();
		await batchOperations();
		await cleanup(bucketName);

		console.log("\n🎉 All file operations examples completed successfully!");
	} catch (error) {
		console.error("❌ File operations example failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runFileOperationsExamples();
}

export {
	uploadDifferentDataTypes,
	downloadAndProcessFiles,
	uploadFromLocalFile,
	downloadToLocalFile,
	batchOperations,
	runFileOperationsExamples,
};
