/**
 * Signed URLs Example
 *
 * This example demonstrates how to generate and use signed URLs for temporary
 * access to storage objects without requiring authentication for each request.
 *
 * `getSignedUrl` returns the URL string directly and throws a FrontalError on
 * failure.
 */

import { blob } from "@frontal-labs/blob";

// Use the default blob singleton

const encoder = new TextEncoder();

// Generate signed URLs for objects
async function generateSignedUrls() {
	const bucketName = "signed-url-bucket";
	const objectKey = "protected/document.pdf";

	console.log("🔑 Generate Signed URLs Example\n");

	// First, upload a test file
	console.log("📤 Uploading test file...");
	try {
		await blob.upload({
			bucket: bucketName,
			key: objectKey,
			data: encoder.encode("This is a protected document content."),
			contentType: "application/pdf",
		});
	} catch (error) {
		console.error("❌ Upload failed:", error);
		return;
	}
	console.log("✅ Test file uploaded");

	try {
		// Generate a signed URL (default 1 hour expiry)
		console.log("\n🔗 Generating signed URL...");
		const readUrl = await blob.getSignedUrl({
			bucket: bucketName,
			options: {
				key: objectKey,
			},
		});
		console.log("✅ Signed URL generated:");
		console.log(readUrl);
		console.log("Expires in: 1 hour (default)");

		// Generate a signed URL with a custom expiry
		console.log("\n🔗 Generating signed URL with a 5 minute expiry...");
		const writeUrl = await blob.getSignedUrl({
			bucket: bucketName,
			options: {
				key: "uploads/new-document.txt",
				expiresIn: 300, // 5 minutes
			},
		});
		console.log("✅ Second signed URL generated:");
		console.log(writeUrl);
		console.log("Expires in: 5 minutes");

		// Generate signed URL for deletion
		console.log("\n🔗 Generating signed URL for deletion (10 minutes)...");
		const deleteUrl = await blob.getSignedUrl({
			bucket: bucketName,
			options: {
				key: objectKey,
				expiresIn: 600, // 10 minutes
			},
		});
		console.log("✅ Delete URL generated:");
		console.log(deleteUrl);
		console.log("Expires in: 10 minutes");

		return { readUrl, writeUrl, deleteUrl, bucketName, objectKey };
	} catch (error) {
		console.error("❌ URL generation failed:", error);
		return;
	}
}

// Use signed URLs with fetch API
async function useSignedUrls(urls: {
	readUrl: string;
	writeUrl: string;
	deleteUrl: string;
	bucketName: string;
	objectKey: string;
}) {
	console.log("\n🌐 Using Signed URLs Example\n");

	// Use the signed URL
	console.log("📖 Using the signed URL...");
	try {
		const readResponse = await fetch(urls.readUrl);
		if (readResponse.ok) {
			const content = await readResponse.text();
			console.log("✅ Successfully read content via signed URL:");
			console.log(content);
		} else {
			console.error(
				"❌ Failed to read via signed URL:",
				readResponse.status,
				readResponse.statusText,
			);
		}
	} catch (error) {
		console.error("❌ Error reading via signed URL:", error);
	}

	// Use the second signed URL
	console.log("\n📝 Using the second signed URL...");
	try {
		const newContent = "This content was uploaded using a signed URL.";
		const writeResponse = await fetch(urls.writeUrl, {
			method: "PUT",
			body: newContent,
			headers: {
				"Content-Type": "text/plain",
			},
		});

		if (writeResponse.ok) {
			console.log("✅ Successfully uploaded content via signed URL");

			// Verify the upload
			try {
				const uploaded = await blob.download({
					bucket: urls.bucketName,
					key: "uploads/new-document.txt",
				});
				console.log(
					"✅ Upload verified:",
					(await uploaded.text()) === newContent,
				);
			} catch (error) {
				console.error("❌ Verification download failed:", error);
			}
		} else {
			console.error(
				"❌ Failed to upload via signed URL:",
				writeResponse.status,
				writeResponse.statusText,
			);
		}
	} catch (error) {
		console.error("❌ Error uploading via signed URL:", error);
	}

	// Use signed delete URL
	console.log("\n🗑️ Using signed delete URL...");
	try {
		const deleteResponse = await fetch(urls.deleteUrl, {
			method: "DELETE",
		});

		if (deleteResponse.ok) {
			console.log("✅ Successfully deleted object via signed URL");

			// Verify deletion: download throws once the object is gone
			try {
				await blob.download({
					bucket: urls.bucketName,
					key: urls.objectKey,
				});
				console.log("⚠️ Warning: Object still exists after signed deletion");
			} catch {
				console.log("✅ Deletion verified - object no longer exists");
			}
		} else {
			console.error(
				"❌ Failed to delete via signed URL:",
				deleteResponse.status,
				deleteResponse.statusText,
			);
		}
	} catch (error) {
		console.error("❌ Error deleting via signed URL:", error);
	}
}

// Generate signed URLs with different expiry times
async function signedUrlExpiryExamples() {
	const bucketName = "signed-url-bucket";
	const objectKey = "time-sensitive/data.json";

	console.log("\n⏰ Signed URL Expiry Examples\n");

	// Upload test data
	await blob.upload({
		bucket: bucketName,
		key: objectKey,
		data: encoder.encode('{"timestamp": "2024-01-01"}'),
		contentType: "application/json",
	});

	const expiryTimes = [
		{ seconds: 60, description: "1 minute" },
		{ seconds: 300, description: "5 minutes" },
		{ seconds: 3600, description: "1 hour" },
		{ seconds: 86400, description: "24 hours" },
	];

	for (const expiry of expiryTimes) {
		console.log(`🔗 Generating ${expiry.description} expiry URL...`);

		try {
			const url = await blob.getSignedUrl({
				bucket: bucketName,
				options: {
					key: objectKey,
					expiresIn: expiry.seconds,
				},
			});
			console.log(`✅ ${expiry.description} URL generated successfully`);
			console.log(`   URL: ${url.substring(0, 100)}...`);
		} catch (error) {
			console.error(`❌ Failed to generate ${expiry.description} URL:`, error);
		}
		console.log();
	}

	// Clean up
	await blob.delete({ bucket: bucketName, key: objectKey });
}

// Share files securely with signed URLs
async function secureFileSharing() {
	const bucketName = "signed-url-bucket";
	const sharedFiles = [
		{
			key: "shared/report.pdf",
			content: encoder.encode("Annual Report 2024"),
			type: "application/pdf",
		},
		{
			key: "shared/image.jpg",
			content: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
			type: "image/jpeg",
		},
		{
			key: "shared/data.csv",
			content: encoder.encode("Name,Age,City\nJohn,30,NYC\nJane,25,LA"),
			type: "text/csv",
		},
	];

	console.log("🔒 Secure File Sharing Example\n");

	// Upload shared files
	console.log("📤 Uploading files for sharing...");
	for (const file of sharedFiles) {
		await blob.upload({
			bucket: bucketName,
			key: file.key,
			data: file.content,
			contentType: file.type,
		});
	}
	console.log("✅ Files uploaded");

	// Generate sharing URLs with different access levels
	console.log("\n🔗 Generating sharing URLs...");

	const sharingUrls: Array<{
		file: string;
		url: string;
		expiresIn: string;
		access: string;
	}> = [];
	for (const file of sharedFiles) {
		try {
			// Read-only access for 1 hour
			const url = await blob.getSignedUrl({
				bucket: bucketName,
				options: {
					key: file.key,
					expiresIn: 3600,
				},
			});
			sharingUrls.push({
				file: file.key,
				url,
				expiresIn: "1 hour",
				access: "read-only",
			});
		} catch (error) {
			console.error(`❌ Could not sign ${file.key}:`, error);
		}
	}

	// Display sharing information
	console.log("\n📋 Sharing Links Generated:");
	sharingUrls.forEach((share, index) => {
		console.log(`${index + 1}. ${share.file}`);
		console.log(`   Access: ${share.access}`);
		console.log(`   Expires: ${share.expiresIn}`);
		console.log(`   URL: ${share.url.substring(0, 80)}...`);
		console.log();
	});

	// Simulate user accessing shared file
	if (sharingUrls.length > 0) {
		console.log("👤 Simulating user access to shared file...");
		const userAccess = await fetch(sharingUrls[0].url);

		if (userAccess.ok) {
			const contentType = userAccess.headers.get("content-type");
			console.log("✅ User successfully accessed shared file");
			console.log(`   Content-Type: ${contentType}`);
			console.log(`   Status: ${userAccess.status}`);
		} else {
			console.error("❌ User access failed:", userAccess.status);
		}
	}

	// Clean up
	console.log("\n🧹 Cleaning up shared files...");
	for (const file of sharedFiles) {
		await blob.delete({ bucket: bucketName, key: file.key });
	}
	console.log("✅ Cleanup completed");
}

// Browser-based upload example
async function browserUploadExample() {
	const bucketName = "signed-url-bucket";
	const uploadKey = "browser-uploads/user-avatar.jpg";

	console.log("🌐 Browser Upload Example\n");

	// Generate signed URL for browser upload
	console.log("🔗 Generating upload URL for browser...");
	let uploadUrl: string;
	try {
		uploadUrl = await blob.getSignedUrl({
			bucket: bucketName,
			options: {
				key: uploadKey,
				expiresIn: 900, // 15 minutes
			},
		});
	} catch (error) {
		console.error("❌ Failed to generate upload URL:", error);
		return;
	}
	console.log("✅ Upload URL generated for browser");
	console.log(`   URL: ${uploadUrl.substring(0, 80)}...`);

	// Simulate browser upload (in real scenario, this would be client-side JavaScript)
	console.log("\n📤 Simulating browser upload...");
	const simulatedFileContent = new Uint8Array([
		0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
	]); // JPEG header

	try {
		const browserUploadResponse = await fetch(uploadUrl, {
			method: "PUT",
			body: simulatedFileContent,
			headers: {
				"Content-Type": "image/jpeg",
			},
		});

		if (browserUploadResponse.ok) {
			console.log("✅ Browser upload successful");

			// Verify upload
			const uploaded = await blob.getMetadata({
				bucket: bucketName,
				key: uploadKey,
			});
			console.log("✅ Upload verified on server");
			console.log(`   File size: ${uploaded.size} bytes`);
		} else {
			console.error("❌ Browser upload failed:", browserUploadResponse.status);
		}
	} catch (error) {
		console.error("❌ Browser upload error:", error);
	}

	// Clean up
	await blob.delete({ bucket: bucketName, key: uploadKey });
}

// Run all signed URL examples
async function runSignedUrlExamples() {
	try {
		const urls = await generateSignedUrls();
		if (urls) {
			await useSignedUrls(urls);
		}

		await signedUrlExpiryExamples();
		await secureFileSharing();
		await browserUploadExample();

		console.log("\n🎉 All signed URL examples completed successfully!");
	} catch (error) {
		console.error("❌ Signed URL examples failed:", error);
	}
}

// Export for use as module or run directly
if (require.main === module) {
	runSignedUrlExamples();
}

export {
	generateSignedUrls,
	useSignedUrls,
	signedUrlExpiryExamples,
	secureFileSharing,
	browserUploadExample,
	runSignedUrlExamples,
};
