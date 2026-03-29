# @frontal/blob

The **Frontal Storage SDK** provides a simple, scalable, and fully compatible object storage solution for Frontal. It implements standard Blob and S3-compatible patterns, making it easy to migrate existing applications and integrate with popular tools.

## Key Features

- **S3-Compatible API**: Drop-in replacement for existing S3 integrations
- **Multiple Upload Methods**: Support for files, streams, and raw data
- **Flexible Download Options**: Download as Blob, stream, or get signed URLs
- **Bucket Management**: Create, configure, and manage storage buckets
- **Metadata Support**: Store and retrieve object metadata
- **Signed URLs**: Generate temporary access URLs for private objects
- **Streaming Support**: Efficient handling of large files with streaming
- **Type Safety**: Full TypeScript support with Zod validation
- **Error Handling**: Comprehensive error responses with detailed information

## Installation

```bash
bun add @frontal/blob
```

## Quick Start

### Basic Upload and Download

```typescript
import { storage, upload, download } from "@frontal/blob";

// Upload a file
const file = new File(["Hello, World!"], "greeting.txt", { 
  type: "text/plain" 
});

const uploadResult = await storage.upload("my-bucket", "greetings/hello.txt", file);
if (uploadResult.error) {
  console.error("Upload failed:", uploadResult.error);
} else {
  console.log("File uploaded successfully");
}

// Download the file
const downloadResult = await storage.download("my-bucket", "greetings/hello.txt");
if (downloadResult.error) {
  console.error("Download failed:", downloadResult.error);
} else {
  const text = await downloadResult.data.text();
  console.log("File content:", text);
}
```

### Using Functional API

```typescript
import { upload, download, list, getSignedUrl } from "@frontal/blob";

// Upload with functional API
await upload("my-bucket", "data/file.json", JSON.stringify({ message: "Hello" }), {
  contentType: "application/json"
});

// List files in a bucket
const listResult = await list("my-bucket", { prefix: "data/" });
if (listResult.data) {
  console.log("Files:", listResult.data.objects);
}

// Generate signed URL for private access
const urlResult = await getSignedUrl("my-bucket", {
  key: "private/document.pdf",
  expiresIn: 3600, // 1 hour
  operation: "read"
});

if (urlResult.data) {
  console.log("Signed URL:", urlResult.data);
}
```

### Advanced Usage with Custom Configuration

```typescript
import { Storage } from "@frontal/blob";

// Create storage client with custom configuration
const storage = new Storage({
  apiKey: "your-api-key",
  baseUrl: "https://custom-api.example.com"
});

// Upload with metadata
const uploadResult = await storage.upload("my-bucket", "documents/report.pdf", fileData, {
  contentType: "application/pdf",
  metadata: {
    department: "finance",
    reportType: "quarterly",
    generatedBy: "automated-system"
  }
});

// Get object metadata
const metadataResult = await storage.getMetadata("my-bucket", "documents/report.pdf");
if (metadataResult.data) {
  console.log("Object metadata:", metadataResult.data.metadata);
  console.log("File size:", metadataResult.data.size);
  console.log("Last modified:", metadataResult.data.lastModified);
}

// Copy and move objects
await storage.copyObject("source-bucket", "source/file.txt", "dest-bucket", "dest/file.txt");
await storage.moveObject("temp-bucket", "processing/data.json", "final-bucket", "archive/data.json");
```

## Core Concepts

### Buckets

Buckets are containers for your storage objects:

```typescript
// Create a bucket (if supported by your plan)
const bucketConfig = {
  name: "my-app-storage",
  public: false // Private bucket
};

// Upload to specific bucket
await storage.upload("my-app-storage", "user-uploads/image.jpg", imageData);
```

### Objects

Objects are the files stored in your buckets:

```typescript
interface StorageObject {
  key: string;           // Unique identifier
  size: number;          // Size in bytes
  contentType: string;    // MIME type
  lastModified: string;   // ISO timestamp
  etag: string;          // Entity tag
  metadata?: Record<string, string>; // Custom metadata
}
```

### Signed URLs

Generate temporary URLs for secure access:

```typescript
// Read access (default)
const readUrl = await storage.getSignedUrl("private-bucket", {
  key: "sensitive-data.json",
  expiresIn: 1800, // 30 minutes
  operation: "read"
});

// Write access
const writeUrl = await storage.getSignedUrl("private-bucket", {
  key: "uploads/new-file.txt",
  expiresIn: 900, // 15 minutes
  operation: "write"
});

// Delete access
const deleteUrl = await storage.getSignedUrl("private-bucket", {
  key: "temp/file-to-delete.txt",
  expiresIn: 300, // 5 minutes
  operation: "delete"
});
```

### Streaming Operations

Handle large files efficiently:

```typescript
// Upload streaming data
const streamResponse = await fetch("https://api.example.com/large-file");
const readableStream = streamResponse.body!;

await storage.upload("my-bucket", "large-datasets/data.csv", readableStream, {
  contentType: "text/csv"
});

// Download as stream
const downloadStream = await storage.downloadStream("my-bucket", "large-datasets/data.csv");

// Process stream in chunks
const reader = downloadStream.data.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process chunk
  processChunk(value);
}
```

## Configuration

The Storage SDK automatically reads configuration from environment variables:

```bash
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

Or configure programmatically:

```typescript
import { Storage, configure } from "@frontal/blob";

// Configure global instance
configure({
  apiKey: "your-api-key",
  baseUrl: "https://api.frontal.dev"
});

// Create custom instance
const customStorage = new Storage({
  apiKey: "your-api-key",
  baseUrl: "https://custom-api.example.com"
});
```

## Error Handling

All operations return a standardized response:

```typescript
interface APIResponse<T> {
  data: T | null;           // Success data
  error: {                 // Error information
    message: string;
    statusCode: number;
    name: string;
  } | null;
  headers: Record<string, string> | null; // Response headers
}
```

Example error handling:

```typescript
const result = await storage.upload("my-bucket", "file.txt", data);

if (result.error) {
  switch (result.error.name) {
    case "upload_error":
      console.error("Upload failed:", result.error.message);
      break;
    case "validation_error":
      console.error("Invalid parameters:", result.error.message);
      break;
    default:
      console.error("Unknown error:", result.error);
  }
} else {
  console.log("Upload successful");
}
```

## Use Cases

### File Upload Service

Build a robust file upload service:

```typescript
class FileUploadService {
  async uploadUserFile(userId: string, file: File): Promise<string> {
    const key = `users/${userId}/uploads/${Date.now()}-${file.name}`;
    
    const result = await storage.upload("user-files", key, file, {
      contentType: file.type,
      metadata: {
        originalName: file.name,
        uploadedBy: userId,
        uploadTime: new Date().toISOString()
      }
    });
    
    if (result.error) {
      throw new Error(`Upload failed: ${result.error.message}`);
    }
    
    // Generate signed URL for immediate access
    const urlResult = await storage.getSignedUrl("user-files", {
      key,
      expiresIn: 3600,
      operation: "read"
    });
    
    return urlResult.data || "";
  }
}
```

### Document Management System

Create a document management system:

```typescript
class DocumentManager {
  async uploadDocument(
    document: File,
    category: string,
    isPublic: boolean
  ): Promise<{ url: string; metadata: any }> {
    const key = `documents/${category}/${Date.now()}-${document.name}`;
    
    // Upload document
    await storage.upload("company-docs", key, document, {
      contentType: document.type,
      metadata: {
        category,
        isPublic: isPublic.toString(),
        uploadedAt: new Date().toISOString(),
        version: "1.0"
      }
    });
    
    // Get metadata
    const metadataResult = await storage.getMetadata("company-docs", key);
    
    // Generate appropriate URL
    let url: string;
    if (isPublic) {
      url = `https://cdn.frontal.dev/company-docs/${key}`;
    } else {
      const urlResult = await storage.getSignedUrl("company-docs", {
        key,
        expiresIn: 86400, // 24 hours
        operation: "read"
      });
      url = urlResult.data || "";
    }
    
    return { url, metadata: metadataResult.data };
  }
  
  async listDocuments(category?: string): Promise<StorageObject[]> {
    const prefix = category ? `documents/${category}/` : "documents/";
    const result = await storage.list("company-docs", { prefix });
    
    return result.data?.objects || [];
  }
}
```

### Backup and Archive Service

Implement automated backup solutions:

```typescript
class BackupService {
  async createBackup(
    dataSource: string,
    backupName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `backups/${dataSource}/${backupName}/${timestamp}/backup.json`;
    
    // Generate backup data
    const backupData = await this.generateBackupData(dataSource);
    
    // Upload backup
    const result = await storage.upload("backups", key, JSON.stringify(backupData), {
      contentType: "application/json",
      metadata: {
        source: dataSource,
        backupName,
        timestamp,
        size: JSON.stringify(backupData).length.toString()
      }
    });
    
    if (result.error) {
      throw new Error(`Backup failed: ${result.error.message}`);
    }
    
    return key;
  }
  
  async restoreBackup(backupKey: string): Promise<any> {
    const result = await storage.download("backups", backupKey);
    
    if (result.error) {
      throw new Error(`Restore failed: ${result.error.message}`);
    }
    
    const backupText = await result.data.text();
    return JSON.parse(backupText);
  }
  
  async listBackups(dataSource?: string): Promise<StorageObject[]> {
    const prefix = dataSource ? `backups/${dataSource}/` : "backups/";
    const result = await storage.list("backups", { prefix });
    
    return result.data?.objects || [];
  }
}
```

## Performance Considerations

- **Use Streaming**: For files larger than 100MB, use streaming uploads/downloads
- **Batch Operations**: Group multiple small operations when possible
- **Metadata Limits**: Keep metadata under 2KB per object
- **Signed URL Expiration**: Use appropriate expiration times (15 min to 7 days)
- **Error Retries**: Implement exponential backoff for failed operations

## Next Steps

- Read the [Architecture Guide](./ARCHITECTURE.md) to understand system design
- Check the [API Reference](./API-REFERENCE.md) for detailed method documentation
- Follow the [Developer Guide](./GUIDE.md) for advanced usage patterns and best practices
