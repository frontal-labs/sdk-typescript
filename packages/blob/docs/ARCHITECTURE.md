# Architecture

## System Overview

The Frontal Storage SDK is designed as a comprehensive object storage solution that provides S3-compatible functionality with enhanced features for modern applications. It offers both class-based and functional APIs, supporting various data types and operations while maintaining type safety and error handling consistency.

## Architecture Layers

### 1. Client Layer

The client layer provides the main interface for storage operations:

- **Storage Class**: Primary client for storage operations
- **Functional API**: Global client instance for convenience
- **Configuration Management**: Environment-based and programmatic configuration
- **Authentication**: Secure API key authentication

### 2. HTTP Layer

The HTTP layer handles all communication with the storage service:

- **Request Routing**: Direct API endpoint communication
- **Authentication Headers**: Automatic token injection
- **Error Handling**: Comprehensive error capture and formatting
- **Response Processing**: Standardized response structure

### 3. Data Layer

The data layer manages different data types and formats:

- **BodyInit Support**: Files, Blobs, Buffers, Streams
- **Content Type Handling**: Automatic and manual content type management
- **Metadata Management**: Custom metadata storage and retrieval
- **Streaming Support**: Large file handling with streams

### 4. Utility Layer

The utility layer provides helper functions and validation:

- **Schema Validation**: Zod-based type validation
- **Error Formatting**: Consistent error response structure
- **URL Generation**: Signed URL creation and management
- **Configuration Constants**: Default values and version management

## Core Components

### Storage Class

The main client class implementing the IStorageClient interface:

```typescript
class Storage implements IStorageClient {
  private readonly client: FrontalClient;
  
  constructor(config?: StorageConfig)
  
  // Core operations
  upload(bucket: string, key: string, data: BodyInit, contentType?: string): Promise<APIResponse<void>>
  download(bucket: string, key: string): Promise<APIResponse<Blob>>
  downloadStream(bucket: string, key: string): Promise<APIResponse<ReadableStream<Uint8Array>>>
  delete(bucket: string, key: string): Promise<APIResponse<void>>
  list(bucket: string, prefix?: string): Promise<APIResponse<ListObjectsResult>>
  
  // Advanced operations
  getSignedUrl(bucket: string, options: SignedUrlOptions): Promise<APIResponse<string>>
  copyObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<APIResponse<void>>
  moveObject(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<APIResponse<void>>
  getMetadata(bucket: string, key: string): Promise<APIResponse<StorageObject>>
}
```

### Functional API

Global functions using a shared client instance:

```typescript
// Configuration
function configure(config: StorageConfig): void

// Core operations
function upload(bucket: string, key: string, data: BodyInit, contentType?: string): Promise<APIResponse<void>>
function download(bucket: string, key: string): Promise<APIResponse<Blob>>
function list(bucket: string, prefix?: string): Promise<APIResponse<ListObjectsResult>>
function getSignedUrl(bucket: string, options: SignedUrlOptions): Promise<APIResponse<string>>
```

### Type System

Comprehensive TypeScript interfaces with Zod validation:

```typescript
// Core types
interface StorageConfig {
  apiKey?: string;
  baseUrl?: string;
}

interface APIResponse<T> {
  data: T | null;
  error: ErrorResponse | null;
  headers: Record<string, string> | null;
}

interface ErrorResponse {
  message: string;
  statusCode: number;
  name: string;
}

// Storage-specific types
interface StorageObject {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
  metadata?: Record<string, string>;
}

interface ListObjectsResult {
  objects: StorageObject[];
  prefix?: string;
  continuationToken?: string;
}

interface SignedUrlOptions {
  key: string;
  expiresIn?: number;
  operation?: "read" | "write" | "delete";
}
```

## Data Flow Architecture

### Upload Flow

```
Client Request
    ↓
Data Validation
    ↓
Content Type Detection
    ↓
HTTP Request (PUT)
    ↓
Server Processing
    ↓
Response Handling
    ↓
API Response Formatting
```

### Download Flow

```
Client Request
    ↓
Authentication Check
    ↓
HTTP Request (GET)
    ↓
Server Response
    ↓
Data Processing
    ↓
Blob/Stream Creation
    ↓
API Response Formatting
```

### List Flow

```
Client Request
    ↓
Prefix Validation
    ↓
HTTP Request (GET with query)
    ↓
Server Processing
    ↓
Object Enumeration
    ↓
Response Formatting
    ↓
API Response with Results
```

### Signed URL Flow

```
Client Request
    ↓
Options Validation
    ↓
URL Generation Request
    ↓
Server URL Creation
    ↓
Digital Signature
    ↓
Signed URL Response
    ↓
API Response with URL
```

## Operation Architecture

### Upload Operations

Upload operations support multiple data types and streaming:

```typescript
// File Upload
await storage.upload("bucket", "path/file.txt", file, "text/plain");

// Stream Upload
await storage.upload("bucket", "path/large-file.zip", readableStream, "application/zip");

// Buffer Upload
await storage.upload("bucket", "path/data.json", buffer, "application/json");
```

**Upload Processing:**

1. **Data Type Detection**: Automatic detection of File, Blob, Buffer, or Stream
2. **Content Type Handling**: Automatic detection or manual specification
3. **Metadata Processing**: Custom metadata attachment and validation
4. **Streaming Support**: Efficient handling of large data streams
5. **Error Handling**: Comprehensive error capture and formatting

### Download Operations

Download operations provide both Blob and streaming options:

```typescript
// Blob Download
const result = await storage.download("bucket", "path/file.txt");
const blob = result.data;

// Stream Download
const streamResult = await storage.downloadStream("bucket", "path/large-file.zip");
const stream = streamResult.data;
```

**Download Processing:**

1. **Request Validation**: Bucket and key validation
2. **Authentication**: Automatic token injection
3. **Data Retrieval**: Efficient data fetching from storage
4. **Format Conversion**: Conversion to appropriate data type
5. **Response Formatting**: Standardized API response structure

### List Operations

List operations support pagination and filtering:

```typescript
// Basic List
const result = await storage.list("bucket");

// Prefix Filtered List
const filteredResult = await storage.list("bucket", "uploads/");
```

**List Processing:**

1. **Prefix Validation**: Safe prefix handling and encoding
2. **Query Construction**: Proper URL query parameter building
3. **Pagination Support**: Continuation token handling
4. **Result Formatting**: Consistent object structure
5. **Metadata Inclusion**: Complete object metadata retrieval

### Signed URL Operations

Signed URLs provide secure temporary access:

```typescript
// Read Access
const readUrl = await storage.getSignedUrl("bucket", {
  key: "private/document.pdf",
  expiresIn: 3600,
  operation: "read"
});

// Write Access
const writeUrl = await storage.getSignedUrl("bucket", {
  key: "uploads/new-file.txt",
  expiresIn: 900,
  operation: "write"
});
```

**Signed URL Processing:**

1. **Options Validation**: Comprehensive parameter validation
2. **Security Checks**: Permission and access validation
3. **URL Generation**: Secure URL creation with digital signature
4. **Expiration Handling**: Time-based access control
5. **Operation Support**: Read, write, and delete operations

## Error Handling Architecture

### Error Types

The SDK provides comprehensive error handling with specific error types:

```typescript
interface ErrorResponse {
  message: string;     // Human-readable error message
  statusCode: number;  // HTTP status code
  name: string;        // Error identifier
}

// Common error names
- "upload_error": Upload operation failures
- "download_error": Download operation failures
- "validation_error": Input validation failures
- "stream_error": Streaming operation failures
- "application_error": General application errors
```

### Error Handling Flow

```
Operation Execution
    ↓
Error Detection
    ↓
Error Classification
    ↓
Error Formatting
    ↓
API Response Creation
    ↓
Client Response
```

### Error Recovery

Built-in error recovery strategies:

1. **Validation Errors**: Immediate return with detailed validation messages
2. **Network Errors**: Automatic retry with exponential backoff
3. **Authentication Errors**: Clear authentication requirement messages
4. **Permission Errors**: Detailed permission requirement information
5. **Server Errors**: Graceful degradation with retry suggestions

## Performance Architecture

### Streaming Support

Efficient handling of large files through streaming:

```typescript
// Upload streaming
const readableStream = createReadStream("large-file.zip");
await storage.upload("bucket", "archives/large-file.zip", readableStream);

// Download streaming
const downloadStream = await storage.downloadStream("bucket", "archives/large-file.zip");
const writableStream = createWriteStream("downloaded-file.zip");
downloadStream.data.pipeTo(writableStream);
```

**Streaming Benefits:**

1. **Memory Efficiency**: Minimal memory usage for large files
2. **Progress Tracking**: Real-time upload/download progress
3. **Cancellation Support**: Ability to cancel long operations
4. **Bandwidth Optimization**: Efficient network utilization
5. **Error Recovery**: Partial operation recovery

### Caching Strategy

Intelligent caching for improved performance:

```typescript
// Response caching for metadata
const metadataCache = new Map<string, StorageObject>();

// Signed URL caching with expiration
const urlCache = new Map<string, { url: string; expires: number }>();
```

**Caching Layers:**

1. **Metadata Cache**: Object metadata caching with TTL
2. **URL Cache**: Signed URL caching with expiration tracking
3. **Configuration Cache**: Client configuration caching
4. **Error Cache**: Error pattern recognition and caching

## Security Architecture

### Authentication

Secure authentication mechanisms:

```typescript
interface StorageConfig {
  apiKey?: string;    // API key for authentication
  baseUrl?: string;    // Custom base URL
}

// Environment variable support
FRONTAL_API_KEY=your_api_key
FRONTAL_BASE_URL=https://api.frontal.dev
```

**Authentication Features:**

1. **API Key Authentication**: Secure token-based authentication
2. **Environment Variables**: Secure configuration from environment
3. **Custom Endpoints**: Support for private deployments
4. **Token Management**: Automatic token refresh and management

### Signed URL Security

Security features for signed URLs:

```typescript
interface SignedUrlOptions {
  key: string;                    // Object key
  expiresIn?: number;              // Expiration time in seconds
  operation?: "read" | "write" | "delete"; // Operation type
}
```

**Security Measures:**

1. **Digital Signatures**: Cryptographic URL signing
2. **Time-Based Expiration**: Automatic URL expiration
3. **Operation-Specific Access**: Granular permission control
4. **Key Validation**: Secure key validation and encoding
5. **Access Logging**: Complete access audit trail

## Extensibility Architecture

### Plugin System

Modular architecture for extending functionality:

```typescript
interface StoragePlugin {
  name: string;
  version: string;
  hooks: {
    beforeUpload?: (data: UploadData) => Promise<UploadData>;
    afterUpload?: (result: APIResponse<void>) => Promise<void>;
    beforeDownload?: (key: string) => Promise<string>;
    afterDownload?: (data: Blob) => Promise<Blob>;
  };
}
```

### Custom Data Types

Support for custom data types and processors:

```typescript
interface DataProcessor {
  name: string;
  supportedTypes: string[];
  process: (data: BodyInit) => Promise<ProcessedData>;
  validate: (data: BodyInit) => boolean;
}
```

### Middleware Support

Request/response middleware for custom processing:

```typescript
interface StorageMiddleware {
  name: string;
  beforeRequest?: (request: Request) => Promise<Request>;
  afterResponse?: (response: Response) => Promise<Response>;
  onError?: (error: Error) => Promise<ErrorResponse>;
}
```

## Testing Architecture

### Unit Testing

Comprehensive unit testing framework:

```typescript
interface StorageTestSuite {
  uploadTests: UploadTestCase[];
  downloadTests: DownloadTestCase[];
  listTests: ListTestCase[];
  signedUrlTests: SignedUrlTestCase[];
}

interface UploadTestCase {
  name: string;
  data: BodyInit;
  expectedSuccess: boolean;
  expectedError?: string;
}
```

### Integration Testing

End-to-end integration testing:

```typescript
interface IntegrationTest {
  name: string;
  scenario: TestScenario;
  setup: () => Promise<void>;
  execute: () => Promise<TestResult>;
  cleanup: () => Promise<void>;
}
```

### Mock Testing

Mock server for testing:

```typescript
class MockStorageServer {
  private buckets: Map<string, Map<string, StorageObject>>;
  
  upload(bucket: string, key: string, data: BodyInit): Promise<MockResponse>;
  download(bucket: string, key: string): Promise<MockResponse>;
  list(bucket: string, prefix?: string): Promise<MockResponse>;
}
```

## Configuration Architecture

### Environment Configuration

Environment-based configuration system:

```typescript
// Default configuration from environment
const defaultConfig = {
  apiKey: process.env.FRONTAL_API_KEY,
  baseUrl: process.env.FRONTAL_BASE_URL || DEFAULT_STORAGE_BASE_URL
};
```

### Runtime Configuration

Dynamic configuration updates:

```typescript
class Storage {
  private config: StorageConfig;
  
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.updateClient();
  }
}
```

### Validation Configuration

Schema-based configuration validation:

```typescript
const storageConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional()
});

// Automatic validation
const validatedConfig = storageConfigSchema.parse(config);
```

This architecture ensures the Storage SDK is robust, secure, performant, and extensible while providing a clean, intuitive API for developers.
