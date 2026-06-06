/**
 * File Operations Example
 *
 * This example demonstrates various file upload and download operations
 * including different data types, content types, and file handling patterns.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { blob } from "@frontal-labs/blob";

// Use the default blob singleton

// Upload different types of data
async function uploadDifferentDataTypes() {
	const bucketName = "file-operations-bucket";

	console.log("📁 Upload Different Data Types Example\n");

	// 1. Upload string content
	console.log("📝 Uploading string content...");
	const stringResult = await blob.upload(
		bucketName,
		"text-files/sample.txt",
		"Hello, World! This is a text file.",
		"text/plain",
	);

	if (stringResult.error) {
		console.error("❌ String upload failed:", stringResult.error.message);
	} else {
		console.log("✅ String content uploaded");
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

	const jsonResult = await blob.upload(
		bucketName,
		"data/users.json",
		JSON.stringify(jsonData, null, 2),
		"application/json",
	);

	if (jsonResult.error) {
		console.error("❌ JSON upload failed:", jsonResult.error.message);
	} else {
		console.log("✅ JSON data uploaded");
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

	const binaryResult = await blob.upload(
		bucketName,
		"images/tiny.png",
		imageHeader,
		"image/png",
	);

	if (binaryResult.error) {
		console.error("❌ Binary upload failed:", binaryResult.error.message);
	} else {
		console.log("✅ Binary data uploaded");
	}

	// 4. Upload CSV data
	console.log("\n📊 Uploading CSV data...");
	const csvData = `name,email,age
John Doe,john@example.com,30
Jane Smith,jane@example.com,25
Bob Johnson,bob@example.com,35`;

	const csvResult = await blob.upload(
		bucketName,
		"data/users.csv",
		csvData,
		"text/csv",
	);

	if (csvResult.error) {
		console.error("❌ CSV upload failed:", csvResult.error.message);
	} else {
		console.log("✅ CSV data uploaded");
	}

	return bucketName;
}

// Download and handle different file types
async function downloadAndProcessFiles(bucketName: string) {
	console.log("\n📥 Download and Process Files Example\n");

	// Download text file
	console.log("📝 Downloading text file...");
	const textResult = await blob.download(
		bucketName,
		"text-files/sample.txt",
	);

	if (!textResult.error) {
		const textContent = await textResult.data?.text();
		console.log("✅ Text file downloaded");
		console.log("Content:", textContent);
		console.log("Size:", textResult.data?.size, "bytes");
	} else {
		console.error("❌ Text download failed:", textResult.error.message);
	}

	// Download JSON file
	console.log("\n📋 Downloading JSON file...");
	const jsonResult = await blob.download(bucketName, "data/users.json");

	if (!jsonResult.error) {
		const jsonContent = await jsonResult.data?.text();
		const parsedData = JSON.parse(jsonContent);
		console.log("✅ JSON file downloaded");
		console.log("Parsed data:", parsedData);
	} else {
		console.error("❌ JSON download failed:", jsonResult.error.message);
	}

	// Download binary file
	console.log("\n🖼️ Downloading binary file...");
	const binaryResult = await blob.download(bucketName, "images/tiny.png");

	if (!binaryResult.error) {
		const arrayBuffer = await binaryResult.data?.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);
		console.log("✅ Binary file downloaded");
		console.log("Size:", uint8Array.length, "bytes");
		console.log(
			"First 8 bytes (PNG signature):",
			Array.from(uint8Array.slice(0, 8))
				.map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`)
				.join(" "),
		);
	} else {
		console.error("❌ Binary download failed:", binaryResult.error.message);
	}

	// Download CSV file
	console.log("\n📊 Downloading CSV file...");
	const csvResult = await blob.download(bucketName, "data/users.csv");

	if (!csvResult.error) {
		const csvContent = await csvResult.data?.text();
		const lines = csvContent.split("\n");
		const headers = lines[0].split(",");
		console.log("✅ CSV file downloaded");
		console.log("Headers:", headers);
		console.log(
			"Data rows:",
			lines.slice(1).filter((line) => line.trim()),
		);
	} else {
		console.error("❌ CSV download failed:", csvResult.error.message);
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
	try {
		const fileBuffer = readFileSync(filePath);
		const bucketName = "file-operations-bucket";

		const uploadResult = await blob.upload(
			bucketName,
			`uploads/${fileName}`,
			fileBuffer,
			"text/plain",
		);

		if (uploadResult.error) {
			console.error("❌ Local file upload failed:", uploadResult.error.message);
		} else {
			console.log("✅ Local file uploaded successfully");

			// Verify by downloading
			const downloadResult = await blob.download(
				bucketName,
				`uploads/${fileName}`,
			);
			if (!downloadResult.error) {
				const downloadedContent = await downloadResult.data?.text();
				console.log(
					"✅ Upload verified - content matches:",
					downloadedContent === fileContent,
				);
			}
		}
	} catch (error) {
		console.error("❌ File system error:", error);
	}
}

// Download and save to local filesystem
async function downloadToLocalFile() {
	console.log("\n💾 Download to Local Filesystem Example\n");

	const bucketName = "file-operations-bucket";
	const sourceKey = "text-files/sample.txt";
	const localPath = "/tmp/downloaded-file.txt";

	const downloadResult = await blob.download(bucketName, sourceKey);

	if (downloadResult.error) {
		console.error("❌ Download failed:", downloadResult.error.message);
		return;
	}

	try {
		const arrayBuffer = await downloadResult.data?.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		writeFileSync(localPath, buffer);

		console.log(`✅ File downloaded and saved to: ${localPath}`);

		// Verify by reading back
		const savedContent = readFileSync(localPath, "utf8");
		console.log(
			"Saved content preview:",
			`${savedContent.substring(0, 50)}...`,
		);
	} catch (error) {
		console.error("❌ Local save error:", error);
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

	// Batch upload
	console.log("📤 Batch uploading files...");
	const uploadPromises = files.map((file) =>
		blob.upload(bucketName, file.key, file.content, file.type),
	);

	const uploadResults = await Promise.all(uploadPromises);
	const successfulUploads = uploadResults.filter(
		(result) => !result.error,
	).length;
	console.log(
		`✅ ${successfulUploads}/${files.length} files uploaded successfully`,
	);

	// List uploaded files
	console.log("\n📋 Listing batch files...");
	const listResult = await blob.list(bucketName, "batch/");

	if (!listResult.error) {
		console.log(
			`Found ${listResult.data?.objects.length} files in batch/ directory:`,
		);
		listResult.data?.objects.forEach((obj: any) => {
			console.log(`  - ${obj.key} (${obj.size} bytes)`);
		});
	}

	// Batch download
	console.log("\n📥 Batch downloading files...");
	const downloadPromises = files.map((file) =>
		blob.download(bucketName, file.key),
	);

	const downloadResults = await Promise.all(downloadPromises);
	const successfulDownloads = downloadResults.filter(
		(result) => !result.error,
	).length;
	console.log(
		`✅ ${successfulDownloads}/${files.length} files downloaded successfully`,
	);

	// Batch cleanup
	console.log("\n🗑️ Batch cleaning up files...");
	const deletePromises = files.map((file) =>
		blob.delete(bucketName, file.key),
	);

	const deleteResults = await Promise.all(deletePromises);
	const successfulDeletes = deleteResults.filter(
		(result) => !result.error,
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

	const deletePromises = filesToDelete.map((file) =>
		blob.delete(bucketName, file),
	);

	await Promise.all(deletePromises);
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
