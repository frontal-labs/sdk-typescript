# API Reference

## Storage

The main client class for interacting with Frontal Storage services.

### Constructor

```typescript
new Storage(config?: StorageConfig)
```

Creates a new Storage client instance.

**Parameters:**
- `config` (optional): Configuration options for the client

**Example:**
```typescript
import { Storage } from "@frontal/blob";

// Use default configuration (environment variables)
const storage = new Storage();

// Use custom configuration
const customStorage = new Storage({
  apiKey: "your-api-key",
  baseUrl: "https://custom-api.example.com"
});
```

### Methods

#### upload

```typescript
upload(bucket: string, key: string, data: BodyInit, contentType?: string): Promise<APIResponse<void>>
```

Uploads data to a bucket.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key (path)
- `data`: The data to upload (File, Blob, Buffer, or ReadableStream)
- `contentType` (optional): The content type of the data

**Returns:** Promise resolving to API response

**Example:**
```typescript
const file = new File(["Hello, World!"], "greeting.txt", { 
  type: "text/plain" 
});

const result = await storage.upload("my-bucket", "greetings/hello.txt", file);
if (result.error) {
  console.error("Upload failed:", result.error);
} else {
  console.log("Upload successful");
}
```

#### download

```typescript
download(bucket: string, key: string): Promise<APIResponse<Blob>>
```

Downloads data from a bucket as a Blob.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key

**Returns:** Promise resolving to API response with Blob data

**Example:**
```typescript
const result = await storage.download("my-bucket", "documents/report.pdf");
if (result.data) {
  const blob = result.data;
  const url = URL.createObjectURL(blob);
  
  // Download in browser
  const a = document.createElement('a');
  a.href = url;
  a.download = 'report.pdf';
  a.click();
}
```

#### downloadStream

```typescript
downloadStream(bucket: string, key: string): Promise<APIResponse<ReadableStream<Uint8Array>>>
```

Downloads data from a bucket as a stream.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key

**Returns:** Promise resolving to API response with readable stream

**Example:**
```typescript
const result = await storage.downloadStream("my-bucket", "large-dataset.csv");
if (result.data) {
  const stream = result.data;
  const reader = stream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Process chunk
    processChunk(value);
  }
}
```

#### delete

```typescript
delete(bucket: string, key: string): Promise<APIResponse<void>>
```

Deletes an object from a bucket.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key

**Returns:** Promise resolving to API response

**Example:**
```typescript
const result = await storage.delete("my-bucket", "temp/old-file.txt");
if (result.error) {
  console.error("Delete failed:", result.error);
} else {
  console.log("Delete successful");
}
```

#### list

```typescript
list(bucket: string, prefix?: string): Promise<APIResponse<ListObjectsResult>>
```

Lists objects in a bucket with optional prefix filtering.

**Parameters:**
- `bucket`: The bucket name
- `prefix` (optional): Prefix to filter objects

**Returns:** Promise resolving to API response with object list

**Example:**
```typescript
const result = await storage.list("my-bucket", "uploads/");
if (result.data) {
  console.log("Objects:", result.data.objects);
  console.log("Prefix:", result.data.prefix);
  console.log("Continuation token:", result.data.continuationToken);
}
```

#### getSignedUrl

```typescript
getSignedUrl(bucket: string, options: SignedUrlOptions): Promise<APIResponse<string>>
```

Generates a signed URL for temporary access to objects.

**Parameters:**
- `bucket`: The bucket name
- `options`: Signed URL options

**Returns:** Promise resolving to API response with signed URL

**Example:**
```typescript
const result = await storage.getSignedUrl("private-bucket", {
  key: "sensitive-document.pdf",
  expiresIn: 3600, // 1 hour
  operation: "read"
});

if (result.data) {
  console.log("Signed URL:", result.data);
  // URL expires in 1 hour
}
```

#### copyObject

```typescript
copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<APIResponse<void>>
```

Copies an object within or across buckets.

**Parameters:**
- `sourceBucket`: Source bucket name
- `sourceKey`: Source object key
- `destBucket`: Destination bucket name
- `destKey`: Destination object key

**Returns:** Promise resolving to API response

**Example:**
```typescript
const result = await storage.copyObject(
  "source-bucket", 
  "documents/report.pdf",
  "archive-bucket", 
  "reports/2024/report.pdf"
);
```

#### moveObject

```typescript
moveObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<APIResponse<void>>
```

Moves (renames) an object.

**Parameters:**
- `sourceBucket`: Source bucket name
- `sourceKey`: Source object key
- `destBucket`: Destination bucket name
- `destKey`: Destination object key

**Returns:** Promise resolving to API response

**Example:**
```typescript
const result = await storage.moveObject(
  "temp-bucket",
  "processing/data.json",
  "final-bucket",
  "processed/data.json"
);
```

#### getMetadata

```typescript
getMetadata(bucket: string, key: string): Promise<APIResponse<StorageObject>>
```

Retrieves metadata for a specific object.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key

**Returns:** Promise resolving to API response with object metadata

**Example:**
```typescript
const result = await storage.getMetadata("my-bucket", "documents/report.pdf");
if (result.data) {
  console.log("File size:", result.data.size);
  console.log("Content type:", result.data.contentType);
  console.log("Last modified:", result.data.lastModified);
  console.log("ETag:", result.data.etag);
  console.log("Metadata:", result.data.metadata);
}
```

## Functional API

The package also provides functional API that uses a global client instance.

### configure

```typescript
configure(config: StorageConfig): void
```

Configures the global Storage client instance.

**Parameters:**
- `config`: Configuration options

**Example:**
```typescript
import { configure } from "@frontal/blob";

configure({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});
```

### upload

```typescript
upload(bucket: string, key: string, data: BodyInit, contentType?: string): Promise<APIResponse<void>>
```

Uploads data using the global client instance.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key
- `data`: The data to upload
- `contentType` (optional): The content type

**Example:**
```typescript
import { upload } from "@frontal/blob";

await upload("my-bucket", "data.json", JSON.stringify(data), {
  contentType: "application/json"
});
```

### download

```typescript
download(bucket: string, key: string): Promise<APIResponse<Blob>>
```

Downloads data using the global client instance.

**Parameters:**
- `bucket`: The bucket name
- `key`: The object key

**Example:**
```typescript
import { download } from "@frontal/blob";

const result = await download("my-bucket", "image.jpg");
if (result.data) {
  const imageUrl = URL.createObjectURL(result.data);
  // Use imageUrl
}
```

### list

```typescript
list(bucket: string, prefix?: string): Promise<APIResponse<ListObjectsResult>>
```

Lists objects using the global client instance.

**Parameters:**
- `bucket`: The bucket name
- `prefix` (optional): Prefix to filter objects

**Example:**
```typescript
import { list } from "@frontal/blob";

const result = await list("my-bucket", "images/");
if (result.data) {
  result.data.objects.forEach(obj => {
    console.log(`${obj.key} (${obj.size} bytes)`);
  });
}
```

### getSignedUrl

```typescript
getSignedUrl(bucket: string, options: SignedUrlOptions): Promise<APIResponse<string>>
```

Generates signed URL using the global client instance.

**Parameters:**
- `bucket`: The bucket name
- `options`: Signed URL options

**Example:**
```typescript
import { getSignedUrl } from "@frontal/blob";

const result = await getSignedUrl("private-bucket", {
  key: "document.pdf",
  expiresIn: 1800, // 30 minutes
  operation: "read"
});
```

## Types

### StorageConfig

Configuration options for the Storage client.

```typescript
interface StorageConfig {
  apiKey?: string;    // API key for authentication
  baseUrl?: string;    // Custom base URL
}
```

### SignedUrlOptions

Options for generating signed URLs.

```typescript
interface SignedUrlOptions {
  key: string;                    // Object key
  expiresIn?: number;              // Expiration time in seconds (default: 3600)
  operation?: "read" | "write" | "delete"; // URL operation (default: "read")
}
```

### StorageObject

Represents a storage object with metadata.

```typescript
interface StorageObject {
  key: string;                    // Unique object identifier
  size: number;                    // Size in bytes
  contentType: string;               // MIME content type
  lastModified: string;              // ISO 8601 timestamp
  etag: string;                    // Entity tag for versioning
  metadata?: Record<string, string>;   // Custom metadata key-value pairs
}
```

### ListObjectsResult

Result of listing objects in a bucket.

```typescript
interface ListObjectsResult {
  objects: StorageObject[];           // Array of storage objects
  prefix?: string;                   // Common prefix of objects
  continuationToken?: string;         // Token for pagination
}
```

### APIResponse

Standard response structure for all API operations.

```typescript
interface APIResponse<T> {
  data: T | null;                   // Success response data
  error: {                         // Error information
    message: string;                 // Error message
    statusCode: number;               // HTTP status code
    name: string;                    // Error name/identifier
  } | null;
  headers?: Record<string, string>;     // Response headers
}
```

### ErrorResponse

Error information structure.

```typescript
interface ErrorResponse {
  message: string;     // Human-readable error message
  statusCode: number;  // HTTP status code
  name: string;        // Error identifier
}
```

### BucketConfig

Bucket configuration options.

```typescript
interface BucketConfig {
  name: string;        // Bucket name
  public?: boolean;    // Whether bucket is public (default: false)
}
```

## Constants

### DEFAULT_STORAGE_BASE_URL

Default base URL for Frontal Storage API.

```typescript
const DEFAULT_STORAGE_BASE_URL = "https://api.frontal.dev/v1";
```

### VERSION

Package version.

```typescript
const VERSION = "0.0.1";
```

## Error Handling

All operations return an `APIResponse<T>` with consistent error handling:

```typescript
// Example error handling
const result = await storage.upload("my-bucket", "file.txt", data);

if (result.error) {
  switch (result.error.name) {
    case "upload_error":
      console.error("Upload operation failed:", result.error.message);
      break;
    case "validation_error":
      console.error("Invalid parameters:", result.error.message);
      break;
    case "download_error":
      console.error("Download operation failed:", result.error.message);
      break;
    case "stream_error":
      console.error("Stream operation failed:", result.error.message);
      break;
    default:
      console.error("Unknown error:", result.error);
  }
  
  // Handle based on status code
  if (result.error.statusCode === 401) {
    // Handle authentication error
  } else if (result.error.statusCode === 403) {
    // Handle authorization error
  } else if (result.error.statusCode === 404) {
    // Handle not found error
  } else if (result.error.statusCode >= 500) {
    // Handle server error
  }
} else {
  // Success case
  console.log("Operation completed successfully");
}
```

## Utility Functions

### Default Export

The package exports a default storage instance:

```typescript
import { storage } from "@frontal/blob";

// Uses configuration from environment variables
const result = await storage.upload("my-bucket", "file.txt", data);
```

### createStorageClient

Factory function for creating custom client instances:

```typescript
import { createStorageClient } from "@frontal/blob";
import { FrontalClient } from "@frontal/core";

const client = new FrontalClient({
  apiKey: "your-api-key",
  baseUrl: "https://custom-api.example.com"
});

const storage = createStorageClient(client);
```

## Streaming Examples

### Upload Streaming Data

```typescript
// Upload from a readable stream
const response = await fetch("https://api.example.com/large-file");
const readableStream = response.body!;

const uploadResult = await storage.upload("my-bucket", "streaming-data.json", readableStream, {
  contentType: "application/json"
});
```

### Download Streaming Data

```typescript
// Download as readable stream
const downloadResult = await storage.downloadStream("my-bucket", "large-file.json");

if (downloadResult.data) {
  const stream = downloadResult.data;
  const writer = new WritableStream();
  
  // Pipe to file or process
  stream.pipeTo(writer);
}
```

## Metadata Operations

### Upload with Metadata

```typescript
const uploadResult = await storage.upload("my-bucket", "documents/report.pdf", fileData, {
  contentType: "application/pdf",
  metadata: {
    department: "finance",
    reportType: "quarterly",
    generatedBy: "automated-system",
    version: "1.0",
    classification: "internal"
  }
});
```

### Retrieve Metadata

```typescript
const metadataResult = await storage.getMetadata("my-bucket", "documents/report.pdf");

if (metadataResult.data) {
  console.log("Object metadata:", metadataResult.data.metadata);
  console.log("File size:", metadataResult.data.size, "bytes");
  console.log("Content type:", metadataResult.data.contentType);
  console.log("Last modified:", metadataResult.data.lastModified);
}
```

## Signed URL Operations

### Read Access URL

```typescript
const readUrlResult = await storage.getSignedUrl("private-bucket", {
  key: "private/document.pdf",
  expiresIn: 3600, // 1 hour
  operation: "read"
});

if (readUrlResult.data) {
  // URL can be used to download the file
  console.log("Download URL:", readUrlResult.data);
}
```

### Write Access URL

```typescript
const writeUrlResult = await storage.getSignedUrl("private-bucket", {
  key: "uploads/new-file.txt",
  expiresIn: 900, // 15 minutes
  operation: "write"
});

if (writeUrlResult.data) {
  // URL can be used to upload directly to storage
  console.log("Upload URL:", writeUrlResult.data);
}
```

### Delete Access URL

```typescript
const deleteUrlResult = await storage.getSignedUrl("private-bucket", {
  key: "temp/file-to-delete.txt",
  expiresIn: 300, // 5 minutes
  operation: "delete"
});

if (deleteUrlResult.data) {
  // URL can be used to delete the file
  console.log("Delete URL:", deleteUrlResult.data);
}
```

## Best Practices

### Error Handling

Always check for errors in API responses:

```typescript
const result = await storage.upload("my-bucket", "file.txt", data);

if (result.error) {
  // Log error details
  console.error("Operation failed:", {
    name: result.error.name,
    message: result.error.message,
    statusCode: result.error.statusCode
  });
  
  // Implement retry logic for transient errors
  if (result.error.statusCode >= 500) {
    // Retry with exponential backoff
    await retryOperation();
  }
} else {
  // Success case
  console.log("Operation completed successfully");
}
```

### Large File Handling

Use streaming for files larger than 100MB:

```typescript
// For uploads
const largeFileStream = createReadStream("large-file.zip");
await storage.upload("my-bucket", "archives/large-file.zip", largeFileStream);

// For downloads
const downloadStream = await storage.downloadStream("my-bucket", "archives/large-file.zip");
const writeStream = createWriteStream("downloaded-file.zip");
downloadStream.data.pipeTo(writeStream);
```

### Signed URL Security

Use appropriate expiration times and secure operations:

```typescript
// Short expiration for sensitive operations
const sensitiveUrl = await storage.getSignedUrl("private-bucket", {
  key: "sensitive-data.json",
  expiresIn: 300, // 5 minutes
  operation: "read"
});

// Longer expiration for public content
const publicUrl = await storage.getSignedUrl("public-bucket", {
  key: "public/document.pdf",
  expiresIn: 86400, // 24 hours
  operation: "read"
});
```
