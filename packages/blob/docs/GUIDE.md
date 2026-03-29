# Developer Guide

This guide covers advanced usage patterns, best practices, and common scenarios when working with Frontal Storage SDK.

## Table of Contents

- [Advanced Upload Patterns](#advanced-upload-patterns)
- [Streaming Operations](#streaming-operations)
- [Error Handling Strategies](#error-handling-strategies)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)
- [Signed URL Management](#signed-url-management)
- [Metadata Operations](#metadata-operations)
- [Batch Operations](#batch-operations)
- [Testing Storage Operations](#testing-storage-operations)
- [Common Use Cases](#common-use-cases)
- [Troubleshooting](#troubleshooting)

## Advanced Upload Patterns

### Multi-Part Upload

Handle large files with multi-part uploads for better reliability:

```typescript
class MultiPartUploader {
  async uploadLargeFile(
    bucket: string,
    key: string,
    file: File,
    partSize: number = 5 * 1024 * 1024 // 5MB parts
  ): Promise<void> {
    const totalParts = Math.ceil(file.size / partSize);
    const uploadId = await this.initiateMultiPartUpload(bucket, key);
    
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const part = file.slice(start, end);
      
      await this.uploadPart(uploadId, partNumber, part);
      
      // Progress tracking
      const progress = (partNumber / totalParts) * 100;
      console.log(`Upload progress: ${progress.toFixed(2)}%`);
    }
    
    await this.completeMultiPartUpload(uploadId);
  }
}
```

### Resumable Uploads

Implement resumable uploads for unreliable connections:

```typescript
class ResumableUploader {
  private uploadCache = new Map<string, UploadState>();
  
  async resumableUpload(
    bucket: string,
    key: string,
    data: BodyInit
  ): Promise<void> {
    const uploadId = this.generateUploadId(bucket, key);
    const existingState = this.uploadCache.get(uploadId);
    
    if (existingState && !existingState.completed) {
      // Resume existing upload
      return this.resumeUpload(uploadId, existingState);
    }
    
    // Start new upload
    return this.startNewUpload(uploadId, data);
  }
  
  private async resumeUpload(
    uploadId: string,
    state: UploadState
  ): Promise<void> {
    // Resume from last successful part
    const nextPartNumber = state.lastCompletedPart + 1;
    // ... resume logic
  }
}
```

### Conditional Uploads

Upload based on conditions and validations:

```typescript
class ConditionalUploader {
  async conditionalUpload(
    bucket: string,
    key: string,
    data: BodyInit,
    conditions: UploadConditions
  ): Promise<UploadResult> {
    // Check if object already exists
    const existingObject = await this.checkObjectExists(bucket, key);
    
    if (existingObject) {
      if (conditions.overwrite) {
        // Delete existing and upload new
        await this.storage.delete(bucket, key);
      } else if (conditions.skipIfExists) {
        return { skipped: true, reason: "Object already exists" };
      } else {
        throw new Error("Object already exists and overwrite is disabled");
      }
    }
    
    // Validate file size
    if (conditions.maxSize && data instanceof File) {
      if (data.size > conditions.maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${conditions.maxSize}`);
      }
    }
    
    // Validate content type
    if (conditions.allowedTypes && data instanceof File) {
      if (!conditions.allowedTypes.includes(data.type)) {
        throw new Error(`Content type ${data.type} is not allowed`);
      }
    }
    
    return this.performUpload(bucket, key, data);
  }
}

interface UploadConditions {
  overwrite?: boolean;
  skipIfExists?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}
```

## Streaming Operations

### Progressive Upload Streaming

Upload with progress tracking and backpressure handling:

```typescript
class ProgressiveUploader {
  async uploadWithProgress(
    bucket: string,
    key: string,
    stream: ReadableStream,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    const reader = stream.getReader();
    let uploadedBytes = 0;
    const totalBytes = await this.estimateStreamSize(stream);
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Upload chunk with backpressure handling
      await this.uploadChunk(bucket, key, value, uploadedBytes);
      uploadedBytes += value.length;
      
      // Report progress
      if (onProgress) {
        onProgress({
          uploadedBytes,
          totalBytes,
          percentage: (uploadedBytes / totalBytes) * 100,
          speed: this.calculateUploadSpeed(uploadedBytes, Date.now())
        });
      }
      
      // Handle backpressure
      if (this.shouldThrottle()) {
        await this.delay(100); // Throttle uploads
      }
    }
  }
}

interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
}
```

### Smart Download Streaming

Download with adaptive chunking and error recovery:

```typescript
class SmartDownloader {
  async downloadWithRetry(
    bucket: string,
    key: string,
    options: DownloadOptions = {}
  ): Promise<ReadableStream> {
    const maxRetries = options.maxRetries || 3;
    const chunkSize = options.chunkSize || 1024 * 1024; // 1MB chunks
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const stream = await this.downloadStream(bucket, key);
        return this.addErrorRecovery(stream, attempt);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.warn(`Download attempt ${attempt} failed, retrying...`, error);
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
    
    throw new Error("All download attempts failed");
  }
  
  private addErrorRecovery(
    stream: ReadableStream,
    attempt: number
  ): ReadableStream {
    const reader = stream.getReader();
    
    return new ReadableStream({
      start(controller) {
        const pump = async () => {
          try {
            const { done, value } = await reader.read();
            
            if (done) {
              controller.close();
              return;
            }
            
            controller.enqueue(value);
            
            // Continue pumping
            await pump();
          } catch (error) {
            console.error(`Stream error on attempt ${attempt}:`, error);
            controller.error(error);
          }
        };
        
        pump();
      }
    });
  }
}

interface DownloadOptions {
  maxRetries?: number;
  chunkSize?: number;
  timeout?: number;
}
```

## Error Handling Strategies

### Comprehensive Error Classification

Implement detailed error handling with recovery strategies:

```typescript
class StorageErrorHandler {
  async handleWithErrorRecovery<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const classifiedError = this.classifyError(error);
      
      switch (classifiedError.type) {
        case "NETWORK_ERROR":
          return this.handleNetworkError(operation, context, classifiedError);
          
        case "AUTHENTICATION_ERROR":
          return this.handleAuthError(operation, context, classifiedError);
          
        case "PERMISSION_ERROR":
          return this.handlePermissionError(operation, context, classifiedError);
          
        case "VALIDATION_ERROR":
          return this.handleValidationError(operation, context, classifiedError);
          
        case "STORAGE_ERROR":
          return this.handleStorageError(operation, context, classifiedError);
          
        default:
          throw new Error(`Unknown error in ${context}: ${error.message}`);
      }
    }
  }
  
  private classifyError(error: any): ClassifiedError {
    if (error.code === "ECONNRESET" || error.code === "ENOTFOUND") {
      return { type: "NETWORK_ERROR", retryable: true, error };
    }
    
    if (error.statusCode === 401) {
      return { type: "AUTHENTICATION_ERROR", retryable: false, error };
    }
    
    if (error.statusCode === 403) {
      return { type: "PERMISSION_ERROR", retryable: false, error };
    }
    
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return { type: "VALIDATION_ERROR", retryable: false, error };
    }
    
    return { type: "STORAGE_ERROR", retryable: true, error };
  }
  
  private async handleNetworkError<T>(
    operation: () => Promise<T>,
    context: string,
    error: ClassifiedError
  ): Promise<T> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (retryError) {
        if (attempt === maxRetries) {
          throw new Error(`Network operation failed in ${context} after ${maxRetries} attempts: ${retryError.message}`);
        }
        
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Network retry ${attempt}/${maxRetries} for ${context}, waiting ${delay}ms`);
        await this.delay(delay);
      }
    }
    
    throw new Error(`All network retries failed for ${context}`);
  }
}

interface ClassifiedError {
  type: string;
  retryable: boolean;
  error: any;
}
```

### Circuit Breaker Pattern

Implement circuit breaker for storage operations:

```typescript
class StorageCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Check circuit state
    if (this.isCircuitOpen(operationName)) {
      throw new Error(`Circuit breaker open for ${operationName}`);
    }
    
    try {
      const result = await operation();
      this.recordSuccess(operationName);
      return result;
    } catch (error) {
      this.recordFailure(operationName);
      throw error;
    }
  }
  
  private isCircuitOpen(operationName: string): boolean {
    const failures = this.failures.get(operationName) || 0;
    const lastFailure = this.lastFailureTime.get(operationName) || 0;
    
    if (failures >= this.threshold) {
      const timeSinceLastFailure = Date.now() - lastFailure;
      return timeSinceLastFailure < this.timeout;
    }
    
    return false;
  }
  
  private recordSuccess(operationName: string): void {
    this.failures.delete(operationName);
    this.lastFailureTime.delete(operationName);
  }
  
  private recordFailure(operationName: string): void {
    const current = this.failures.get(operationName) || 0;
    this.failures.set(operationName, current + 1);
    this.lastFailureTime.set(operationName, Date.now());
  }
}
```

## Performance Optimization

### Intelligent Caching

Implement multi-layer caching for optimal performance:

```typescript
class StorageCache {
  private metadataCache = new LRUCache<string, StorageObject>({
    max: 1000,
    ttl: 5 * 60 * 1000 // 5 minutes
  });
  
  private urlCache = new LRUCache<string, CachedUrl>({
    max: 500,
    ttl: 60 * 1000 // 1 minute
  });
  
  async getMetadata(
    storage: Storage,
    bucket: string,
    key: string
  ): Promise<StorageObject> {
    const cacheKey = `${bucket}:${key}`;
    
    // Check cache first
    const cached = this.metadataCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch from storage
    const result = await storage.getMetadata(bucket, key);
    if (result.error) {
      throw new Error(`Failed to get metadata: ${result.error.message}`);
    }
    
    // Cache the result
    this.metadataCache.set(cacheKey, result.data);
    return result.data;
  }
  
  async getSignedUrl(
    storage: Storage,
    bucket: string,
    options: SignedUrlOptions,
    minCacheTime: number = 30000 // 30 seconds minimum
  ): Promise<string> {
    const cacheKey = `${bucket}:${options.key}:${options.operation}:${options.expiresIn}`;
    
    // Check cache with sufficient remaining time
    const cached = this.urlCache.get(cacheKey);
    if (cached && cached.expiresAt - Date.now() > minCacheTime) {
      return cached.url;
    }
    
    // Generate new URL
    const result = await storage.getSignedUrl(bucket, options);
    if (result.error) {
      throw new Error(`Failed to generate signed URL: ${result.error.message}`);
    }
    
    // Cache with expiration
    this.urlCache.set(cacheKey, {
      url: result.data,
      expiresAt: Date.now() + (options.expiresIn * 1000)
    });
    
    return result.data;
  }
}

interface CachedUrl {
  url: string;
  expiresAt: number;
}
```

### Batch Operations

Optimize performance with batch operations:

```typescript
class BatchOperations {
  async uploadBatch(
    storage: Storage,
    bucket: string,
    files: Array<{ key: string; data: BodyInit; contentType?: string }>
  ): Promise<BatchResult> {
    const concurrency = 5; // Upload 5 files concurrently
    const results: Array<Promise<APIResponse<void>>> = [];
    
    // Process in batches
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      
      const batchPromises = batch.map(file => 
        storage.upload(bucket, file.key, file.data, file.contentType)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          results.push({
            success: false,
            error: result.reason,
            file: batch[index]
          });
        } else {
          results.push({
            success: result.value.error === null,
            error: result.value.error,
            file: batch[index]
          });
        }
      });
      
      // Small delay between batches to avoid rate limiting
      if (i + concurrency < files.length) {
        await this.delay(100);
      }
    }
    
    return {
      total: files.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
  
  async deleteBatch(
    storage: Storage,
    bucket: string,
    keys: string[]
  ): Promise<BatchResult> {
    // Similar batch implementation for deletions
    const deletePromises = keys.map(key => storage.delete(bucket, key));
    const results = await Promise.allSettled(deletePromises);
    
    return this.processBatchResults(results, keys);
  }
}

interface BatchResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    error: any;
    file: { key: string; data?: BodyInit; contentType?: string };
  }>;
}
```

## Security Best Practices

### Secure Key Management

Implement secure API key management:

```typescript
class SecureKeyManager {
  private static instance: SecureKeyManager;
  private encryptionKey: string;
  private encryptedKey: string | null = null;
  
  private constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
    this.encryptedKey = process.env.ENCRYPTED_API_KEY;
  }
  
  static getInstance(): SecureKeyManager {
    if (!this.instance) {
      this.instance = new SecureKeyManager();
    }
    return this.instance;
  }
  
  getApiKey(): string {
    if (!this.encryptedKey) {
      throw new Error("No encrypted API key available");
    }
    
    return this.decrypt(this.encryptedKey);
  }
  
  setApiKey(apiKey: string): void {
    this.encryptedKey = this.encrypt(apiKey);
  }
  
  private encrypt(data: string): string {
    // Simple encryption for demonstration
    // In production, use proper encryption libraries
    return Buffer.from(data).toString('base64');
  }
  
  private decrypt(encryptedData: string): string {
    // Simple decryption for demonstration
    // In production, use proper decryption libraries
    return Buffer.from(encryptedData, 'base64').toString();
  }
}
```

### Access Control

Implement role-based access control:

```typescript
class AccessController {
  async checkAccess(
    userId: string,
    bucket: string,
    operation: 'read' | 'write' | 'delete',
    key?: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    const bucketPermissions = await this.getBucketPermissions(bucket);
    
    // Check user permissions
    if (!userPermissions.includes(`${bucket}:${operation}`)) {
      return false;
    }
    
    // Check bucket-level restrictions
    if (bucketPermissions.restricted && !bucketPermissions.allowedUsers.includes(userId)) {
      return false;
    }
    
    // Check key-level restrictions
    if (key && bucketPermissions.restrictedKeys) {
      const keyPattern = new RegExp(bucketPermissions.restrictedKeys);
      if (keyPattern.test(key)) {
        return false;
      }
    }
    
    return true;
  }
  
  async enforceAccess(
    userId: string,
    bucket: string,
    operation: string,
    key?: string,
    callback: () => Promise<any>
  ): Promise<any> {
    const hasAccess = await this.checkAccess(userId, bucket, operation, key);
    
    if (!hasAccess) {
      throw new Error(`Access denied for ${operation} on ${bucket}${key ? `/${key}` : ''}`);
    }
    
    // Log access attempt
    await this.logAccessAttempt(userId, bucket, operation, key, true);
    
    try {
      const result = await callback();
      await this.logAccessSuccess(userId, bucket, operation, key);
      return result;
    } catch (error) {
      await this.logAccessError(userId, bucket, operation, key, error);
      throw error;
    }
  }
}
```

## Signed URL Management

### URL Generation with Security

Generate secure signed URLs with enhanced security:

```typescript
class SecureUrlManager {
  async generateSecureUrl(
    storage: Storage,
    bucket: string,
    options: SecureUrlOptions
  ): Promise<SecureUrlResult> {
    // Validate options
    this.validateUrlOptions(options);
    
    // Add security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
    
    // Restrict by IP if specified
    if (options.allowedIPs) {
      options.ipRestriction = options.allowedIPs;
    }
    
    // Add user agent restriction if specified
    if (options.restrictUserAgent) {
      options.userAgentRestriction = options.allowedUserAgents;
    }
    
    // Generate URL with security options
    const result = await storage.getSignedUrl(bucket, {
      key: options.key,
      expiresIn: options.expiresIn,
      operation: options.operation,
      security: securityHeaders,
      restrictions: {
        ip: options.ipRestriction,
        userAgent: options.userAgentRestriction
      }
    });
    
    if (result.error) {
      throw new Error(`Failed to generate secure URL: ${result.error.message}`);
    }
    
    // Log URL generation
    await this.logUrlGeneration(bucket, options, result.data);
    
    return {
      url: result.data,
      expiresAt: new Date(Date.now() + options.expiresIn * 1000),
      securityHeaders,
      restrictions: options
    };
  }
  
  private validateUrlOptions(options: SecureUrlOptions): void {
    if (options.expiresIn > 86400) { // Max 24 hours
      throw new Error("URL expiration cannot exceed 24 hours");
    }
    
    if (options.key.length > 1024) {
      throw new Error("Key length cannot exceed 1024 characters");
    }
    
    if (options.operation === 'write' && options.expiresIn > 3600) {
      throw new Error("Write URLs cannot exceed 1 hour expiration");
    }
  }
}

interface SecureUrlOptions extends SignedUrlOptions {
  allowedIPs?: string[];
  allowedUserAgents?: string[];
  restrictUserAgent?: boolean;
  ipRestriction?: string[];
  userAgentRestriction?: string[];
}

interface SecureUrlResult {
  url: string;
  expiresAt: Date;
  securityHeaders: Record<string, string>;
  restrictions: SecureUrlOptions;
}
```

### URL Tracking and Analytics

Track signed URL usage and analytics:

```typescript
class UrlAnalytics {
  private urlTracker = new Map<string, UrlTrackingInfo>();
  
  async trackUrlUsage(
    urlId: string,
    accessInfo: UrlAccessInfo
  ): Promise<void> {
    const tracking = this.urlTracker.get(urlId) || {
      urlId,
      createdAt: new Date(),
      accessCount: 0,
      lastAccess: null,
      accessHistory: []
    };
    
    tracking.accessCount++;
    tracking.lastAccess = new Date();
    tracking.accessHistory.push({
      timestamp: new Date(),
      ip: accessInfo.ip,
      userAgent: accessInfo.userAgent,
      referer: accessInfo.referer,
      success: accessInfo.success
    });
    
    // Keep only last 100 accesses
    if (tracking.accessHistory.length > 100) {
      tracking.accessHistory = tracking.accessHistory.slice(-100);
    }
    
    this.urlTracker.set(urlId, tracking);
    await this.persistTracking(tracking);
  }
  
  async getUrlAnalytics(urlId: string): Promise<UrlAnalytics> {
    const tracking = this.urlTracker.get(urlId);
    
    if (!tracking) {
      throw new Error(`No tracking data found for URL ${urlId}`);
    }
    
    return {
      totalAccesses: tracking.accessCount,
      uniqueIPs: new Set(tracking.accessHistory.map(a => a.ip)).size,
      uniqueUserAgents: new Set(tracking.accessHistory.map(a => a.userAgent)).size,
      firstAccess: tracking.createdAt,
      lastAccess: tracking.lastAccess,
      successRate: this.calculateSuccessRate(tracking.accessHistory),
      accessPattern: this.analyzeAccessPattern(tracking.accessHistory)
    };
  }
  
  private analyzeAccessPattern(history: UrlAccessInfo[]): AccessPattern {
    const hourlyAccess = new Array(24).fill(0);
    
    history.forEach(access => {
      const hour = access.timestamp.getHours();
      hourlyAccess[hour]++;
    });
    
    const peakHour = hourlyAccess.indexOf(Math.max(...hourlyAccess));
    
    return {
      hourlyDistribution: hourlyAccess,
      peakAccessHour: peakHour,
      averageAccessesPerHour: history.length / 24,
      pattern: this.detectPattern(hourlyAccess)
    };
  }
}

interface UrlTrackingInfo {
  urlId: string;
  createdAt: Date;
  accessCount: number;
  lastAccess: Date | null;
  accessHistory: UrlAccessInfo[];
}

interface UrlAccessInfo {
  timestamp: Date;
  ip: string;
  userAgent: string;
  referer: string;
  success: boolean;
}
```

## Metadata Operations

### Advanced Metadata Management

Implement comprehensive metadata operations:

```typescript
class MetadataManager {
  async setMetadata(
    storage: Storage,
    bucket: string,
    key: string,
    metadata: Record<string, string>,
    options: MetadataOptions = {}
  ): Promise<void> {
    // Validate metadata
    this.validateMetadata(metadata);
    
    // Get existing metadata if merging
    let finalMetadata = metadata;
    if (options.merge) {
      const existing = await this.getMetadata(storage, bucket, key);
      finalMetadata = { ...existing.metadata, ...metadata };
    }
    
    // Re-upload object with new metadata
    const downloadResult = await storage.download(bucket, key);
    if (downloadResult.error) {
      throw new Error(`Failed to download object for metadata update: ${downloadResult.error.message}`);
    }
    
    await storage.upload(bucket, key, downloadResult.data, {
      ...this.extractContentType(downloadResult.data),
      metadata: finalMetadata
    });
  }
  
  async searchByMetadata(
    storage: Storage,
    bucket: string,
    searchCriteria: MetadataSearchCriteria
  ): Promise<StorageObject[]> {
    const listResult = await storage.list(bucket);
    if (listResult.error) {
      throw new Error(`Failed to list objects: ${listResult.error.message}`);
    }
    
    return listResult.data.objects.filter(obj => {
      if (!obj.metadata) return false;
      
      return this.matchesSearchCriteria(obj.metadata, searchCriteria);
    });
  }
  
  private matchesSearchCriteria(
    metadata: Record<string, string>,
    criteria: MetadataSearchCriteria
  ): boolean {
    // Exact match
    if (criteria.exact) {
      for (const [key, value] of Object.entries(criteria.exact)) {
        if (metadata[key] !== value) return false;
      }
    }
    
    // Partial match
    if (criteria.contains) {
      for (const [key, value] of Object.entries(criteria.contains)) {
        if (!metadata[key] || !metadata[key].includes(value)) return false;
      }
    }
    
    // Range match
    if (criteria.range) {
      for (const [key, range] of Object.entries(criteria.range)) {
        const numValue = parseFloat(metadata[key] || '0');
        if (numValue < range.min || numValue > range.max) return false;
      }
    }
    
    return true;
  }
  
  private validateMetadata(metadata: Record<string, string>): void {
    const totalSize = JSON.stringify(metadata).length;
    
    if (totalSize > 2048) { // 2KB limit
      throw new Error(`Metadata size exceeds 2KB limit (${totalSize} bytes)`);
    }
    
    for (const [key, value] of Object.entries(metadata)) {
      if (key.length > 256) {
        throw new Error(`Metadata key "${key}" exceeds 256 character limit`);
      }
      
      if (value.length > 1024) {
        throw new Error(`Metadata value for "${key}" exceeds 1024 character limit`);
      }
    }
  }
}

interface MetadataOptions {
  merge?: boolean;
  overwrite?: boolean;
}

interface MetadataSearchCriteria {
  exact?: Record<string, string>;
  contains?: Record<string, string>;
  range?: Record<string, { min: number; max: number }>;
  tags?: string[];
}
```

## Batch Operations

### Advanced Batch Processing

Implement sophisticated batch operations with error handling:

```typescript
class AdvancedBatchProcessor {
  async processBatchWithRetry<T>(
    operations: BatchOperation<T>[],
    options: BatchOptions = {}
  ): Promise<BatchResult<T>> {
    const maxConcurrency = options.maxConcurrency || 10;
    const maxRetries = options.maxRetries || 3;
    
    let results: BatchResult<T> = {
      total: operations.length,
      successful: 0,
      failed: 0,
      results: []
    };
    
    // Process with concurrency control
    const semaphore = new Semaphore(maxConcurrency);
    
    const promises = operations.map(async (operation, index) => {
      await semaphore.acquire();
      
      try {
        let lastError: any;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await operation.execute();
            
            results.results.push({
              index,
              success: true,
              data: result,
              attempt,
              operation: operation
            });
            
            results.successful++;
            return;
          } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
              const delay = this.calculateRetryDelay(attempt, error);
              console.warn(`Batch operation ${index} attempt ${attempt} failed, retrying in ${delay}ms`, error);
              await this.delay(delay);
            }
          }
        }
        
        // All retries failed
        results.results.push({
          index,
          success: false,
          error: lastError,
          attempt: maxRetries,
          operation
        });
        
        results.failed++;
        
      } finally {
        semaphore.release();
      }
    });
    
    await Promise.all(promises);
    
    return results;
  }
  
  private calculateRetryDelay(attempt: number, error: any): number {
    // Exponential backoff with jitter
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
    
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }
}

class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }
  
  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      next();
      this.permits--;
    }
  }
}

interface BatchOperation<T> {
  execute: () => Promise<T>;
  priority?: number;
  timeout?: number;
}

interface BatchOptions {
  maxConcurrency?: number;
  maxRetries?: number;
  timeout?: number;
  retryCondition?: (error: any) => boolean;
}
```

## Testing Storage Operations

### Comprehensive Testing Framework

Implement thorough testing for storage operations:

```typescript
class StorageTestSuite {
  constructor(private storage: Storage) {}
  
  async runAllTests(): Promise<TestResults> {
    const results: TestResults = {
      upload: await this.testUpload(),
      download: await this.testDownload(),
      list: await this.testList(),
      signedUrl: await this.testSignedUrl(),
      metadata: await this.testMetadata(),
      errorHandling: await this.testErrorHandling(),
      performance: await this.testPerformance()
    };
    
    return results;
  }
  
  async testUpload(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    // Test file upload
    tests.push(await this.testFileUpload());
    
    // Test stream upload
    tests.push(await this.testStreamUpload());
    
    // Test large file upload
    tests.push(await this.testLargeFileUpload());
    
    // Test upload with metadata
    tests.push(await this.testUploadWithMetadata());
    
    // Test upload error handling
    tests.push(await this.testUploadErrors());
    
    return tests;
  }
  
  private async testFileUpload(): Promise<TestResult> {
    const testData = new File(["test content"], "test.txt", { type: "text/plain" });
    
    try {
      const result = await this.storage.upload("test-bucket", "test-file.txt", testData);
      
      if (result.error) {
        return {
          name: "File Upload",
          success: false,
          error: result.error.message,
          duration: 0
        };
      }
      
      // Verify upload
      const downloadResult = await this.storage.download("test-bucket", "test-file.txt");
      
      if (downloadResult.error) {
        return {
          name: "File Upload",
          success: false,
          error: "Failed to verify upload: " + downloadResult.error.message,
          duration: 0
        };
      }
      
      const uploadedContent = await downloadResult.data.text();
      const success = uploadedContent === "test content";
      
      return {
        name: "File Upload",
        success,
        error: success ? null : "Content mismatch",
        duration: 0
      };
      
    } catch (error) {
      return {
        name: "File Upload",
        success: false,
        error: error.message,
        duration: 0
      };
    }
  }
  
  async testPerformance(): Promise<TestResult[]> {
    const tests: TestResult[] = [];
    
    // Test upload performance with different file sizes
    const fileSizes = [1024, 10240, 102400, 1048576]; // 1KB, 10KB, 100KB, 1MB
    
    for (const size of fileSizes) {
      const testData = new Uint8Array(size).buffer;
      
      const startTime = Date.now();
      const result = await this.storage.upload("perf-test", `test-${size}.bin`, testData);
      const endTime = Date.now();
      
      tests.push({
        name: `Upload Performance (${size} bytes)`,
        success: result.error === null,
        error: result.error?.message || null,
        duration: endTime - startTime,
        metadata: { fileSize: size, throughput: size / ((endTime - startTime) / 1000) }
      });
    }
    
    return tests;
  }
}

interface TestResults {
  upload: TestResult[];
  download: TestResult[];
  list: TestResult[];
  signedUrl: TestResult[];
  metadata: TestResult[];
  errorHandling: TestResult[];
  performance: TestResult[];
}

interface TestResult {
  name: string;
  success: boolean;
  error: string | null;
  duration: number;
  metadata?: Record<string, any>;
}
```

### Mock Storage for Testing

Create mock storage for unit testing:

```typescript
class MockStorage implements IStorageClient {
  private buckets = new Map<string, Map<string, MockStorageObject>>();
  private errors = new Map<string, Error>();
  
  // Simulate errors for testing
  setError(operation: string, error: Error): void {
    this.errors.set(operation, error);
  }
  
  clearErrors(): void {
    this.errors.clear();
  }
  
  async upload(bucket: string, key: string, data: BodyInit, contentType?: string): Promise<APIResponse<void>> {
    const error = this.errors.get('upload');
    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          statusCode: 500,
          name: "upload_error"
        },
        headers: null
      };
    }
    
    if (!this.buckets.has(bucket)) {
      this.buckets.set(bucket, new Map());
    }
    
    const bucketMap = this.buckets.get(bucket)!;
    const size = await this.getDataSize(data);
    
    bucketMap.set(key, {
      key,
      size,
      contentType: contentType || "application/octet-stream",
      lastModified: new Date().toISOString(),
      etag: this.generateETag(data),
      data: await this.convertToBuffer(data)
    });
    
    return {
      data: null,
      error: null,
      headers: null
    };
  }
  
  async download(bucket: string, key: string): Promise<APIResponse<Blob>> {
    const error = this.errors.get('download');
    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          statusCode: 500,
          name: "download_error"
        },
        headers: null
      };
    }
    
    const bucketMap = this.buckets.get(bucket);
    if (!bucketMap || !bucketMap.has(key)) {
      return {
        data: null,
        error: {
          message: "Object not found",
          statusCode: 404,
          name: "download_error"
        },
        headers: null
      };
    }
    
    const obj = bucketMap.get(key)!;
    return {
      data: new Blob([obj.data], { type: obj.contentType }),
      error: null,
      headers: null
    };
  }
  
  // Implement other methods similarly...
  
  private async getDataSize(data: BodyInit): Promise<number> {
    if (data instanceof File) return data.size;
    if (data instanceof Blob) return data.size;
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Buffer) return data.length;
    return 0; // Default for streams
  }
  
  private generateETag(data: BodyInit): string {
    // Simple ETag generation for testing
    return `"${Date.now()}-${Math.random().toString(36).substr(2, 9)}"`;
  }
  
  private async convertToBuffer(data: BodyInit): Promise<Buffer> {
    if (data instanceof Buffer) return data;
    if (data instanceof ArrayBuffer) return Buffer.from(data);
    if (data instanceof Blob) {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    if (data instanceof File) {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    return Buffer.from([]);
  }
}

interface MockStorageObject {
  key: string;
  size: number;
  contentType: string;
  lastModified: string;
  etag: string;
  data: Buffer;
}
```

## Common Use Cases

### Content Delivery Network (CDN) Integration

Integrate storage with CDN for content delivery:

```typescript
class CDNManager {
  async uploadWithCDN(
    storage: Storage,
    bucket: string,
    key: string,
    data: BodyInit,
    cdnOptions: CDNOptions
  ): Promise<CDNResult> {
    // Upload to storage
    const uploadResult = await storage.upload(bucket, key, data);
    if (uploadResult.error) {
      throw new Error(`Upload failed: ${uploadResult.error.message}`);
    }
    
    // Get CDN URLs
    const cdnUrls = await this.generateCDNUrls(bucket, key, cdnOptions);
    
    // Cache warming
    if (cdnOptions.warmCache) {
      await this.warmCDNCache(cdnUrls);
    }
    
    return {
      storageUrl: `https://storage.frontal.dev/${bucket}/${key}`,
      cdnUrls,
      cacheStatus: "uploading"
    };
  }
  
  private async generateCDNUrls(
    bucket: string,
    key: string,
    options: CDNOptions
  ): Promise<CDNUrls> {
    const baseUrl = `https://cdn.frontal.dev`;
    
    return {
      primary: `${baseUrl}/${bucket}/${key}`,
      fallback: `${baseUrl}-fallback/${bucket}/${key}`,
      regional: options.regions?.map(region => 
        `${baseUrl}-${region}/${bucket}/${key}`
      ) || []
    };
  }
  
  private async warmCDNCache(urls: CDNUrls): Promise<void> {
    // Make requests to warm CDN cache
    const warmupPromises = [
      fetch(urls.primary),
      ...(urls.fallback ? [fetch(urls.fallback)] : []),
      ...(urls.regional || []).map(url => fetch(url))
    ];
    
    await Promise.allSettled(warmupPromises);
  }
}

interface CDNOptions {
  warmCache?: boolean;
  regions?: string[];
  cacheTTL?: number;
}

interface CDNResult {
  storageUrl: string;
  cdnUrls: CDNUrls;
  cacheStatus: string;
}

interface CDNUrls {
  primary: string;
  fallback?: string;
  regional?: string[];
}
```

### Backup and Disaster Recovery

Implement automated backup and disaster recovery:

```typescript
class BackupManager {
  async createIncrementalBackup(
    storage: Storage,
    sourceBucket: string,
    backupBucket: string,
    options: BackupOptions
  ): Promise<BackupResult> {
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();
    
    // Get last backup state
    const lastBackup = await this.getLastBackup(storage, backupBucket);
    
    // List changes since last backup
    const changes = await this.getChangesSince(
      storage,
      sourceBucket,
      lastBackup?.timestamp
    );
    
    // Process changes
    const backupResults: BackupItemResult[] = [];
    
    for (const change of changes) {
      try {
        if (change.type === 'added' || change.type === 'modified') {
          // Backup new/modified files
          const downloadResult = await storage.download(sourceBucket, change.key);
          
          if (!downloadResult.error) {
            const backupKey = `backups/${backupId}/${change.key}`;
            await storage.upload(backupBucket, backupKey, downloadResult.data);
            
            backupResults.push({
              key: change.key,
              status: 'success',
              size: change.size
            });
          }
        } else if (change.type === 'deleted') {
          // Record deletion
          backupResults.push({
            key: change.key,
            status: 'deleted',
            size: 0
          });
        }
      } catch (error) {
        backupResults.push({
          key: change.key,
          status: 'error',
          error: error.message,
          size: 0
        });
      }
    }
    
    // Create backup manifest
    const manifest = {
      backupId,
      timestamp,
      sourceBucket,
      totalFiles: changes.length,
      successfulBackups: backupResults.filter(r => r.status === 'success').length,
      failedBackups: backupResults.filter(r => r.status === 'error').length,
      items: backupResults
    };
    
    await storage.upload(backupBucket, `backups/${backupId}/manifest.json`, 
      JSON.stringify(manifest));
    
    return {
      backupId,
      timestamp,
      totalFiles: changes.length,
      successfulFiles: backupResults.filter(r => r.status === 'success').length,
      failedFiles: backupResults.filter(r => r.status === 'error').length,
      manifest
    };
  }
  
  async restoreFromBackup(
    storage: Storage,
    backupBucket: string,
    backupId: string,
    targetBucket: string
  ): Promise<RestoreResult> {
    // Get backup manifest
    const manifestResult = await storage.download(backupBucket, `backups/${backupId}/manifest.json`);
    
    if (manifestResult.error) {
      throw new Error(`Failed to load backup manifest: ${manifestResult.error.message}`);
    }
    
    const manifest = JSON.parse(await manifestResult.data.text());
    
    // Restore files
    const restoreResults: RestoreItemResult[] = [];
    
    for (const item of manifest.items) {
      try {
        if (item.status === 'success') {
          // Restore file
          const backupKey = `backups/${backupId}/${item.key}`;
          const downloadResult = await storage.download(backupBucket, backupKey);
          
          if (!downloadResult.error) {
            await storage.upload(targetBucket, item.key, downloadResult.data);
            
            restoreResults.push({
              key: item.key,
              status: 'restored',
              size: item.size
            });
          }
        }
      } catch (error) {
        restoreResults.push({
          key: item.key,
          status: 'error',
          error: error.message,
          size: 0
        });
      }
    }
    
    return {
      backupId,
      restoredFiles: restoreResults.filter(r => r.status === 'restored').length,
      failedFiles: restoreResults.filter(r => r.status === 'error').length,
      results: restoreResults
    };
  }
}

interface BackupOptions {
  includeDeleted?: boolean;
  compressionLevel?: number;
  encryption?: boolean;
}

interface BackupResult {
  backupId: string;
  timestamp: string;
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  manifest: any;
}

interface RestoreResult {
  backupId: string;
  restoredFiles: number;
  failedFiles: number;
  results: RestoreItemResult[];
}
```

## Troubleshooting

### Common Issues and Solutions

Address common storage issues with diagnostic tools:

```typescript
class StorageDiagnostics {
  async diagnoseUploadIssue(
    bucket: string,
    key: string,
    data: BodyInit
  ): Promise<DiagnosticResult> {
    const diagnostics: Diagnostic[] = [];
    
    // Check data size
    const dataSize = await this.getDataSize(data);
    if (dataSize > 5 * 1024 * 1024 * 1024) { // 5GB
      diagnostics.push({
        type: 'warning',
        message: `File size (${dataSize} bytes) exceeds recommended maximum for single upload`,
        suggestion: 'Consider using multi-part upload for large files'
      });
    }
    
    // Check content type
    if (data instanceof File && !data.type) {
      diagnostics.push({
        type: 'warning',
        message: 'No content type specified',
        suggestion: 'Specify content type for proper MIME handling'
      });
    }
    
    // Check bucket permissions
    const bucketAccess = await this.checkBucketAccess(bucket);
    if (!bucketAccess.canWrite) {
      diagnostics.push({
        type: 'error',
        message: 'No write access to bucket',
        suggestion: 'Check bucket permissions and API key access rights'
      });
    }
    
    // Check network connectivity
    const connectivity = await this.checkStorageConnectivity();
    if (!connectivity.reachable) {
      diagnostics.push({
        type: 'error',
        message: 'Storage service unreachable',
        suggestion: 'Check network connection and service status'
      });
    }
    
    return {
      bucket,
      key,
      dataSize,
      diagnostics,
      overall: this.getOverallStatus(diagnostics)
    };
  }
  
  async checkBucketAccess(bucket: string): Promise<BucketAccess> {
    try {
      // Test list access
      const listResult = await this.storage.list(bucket, { maxKeys: 1 });
      
      if (listResult.error) {
        if (listResult.error.statusCode === 403) {
          return { canRead: false, canWrite: false, canDelete: false };
        }
      }
      
      return { canRead: true, canWrite: true, canDelete: true };
    } catch (error) {
      return { canRead: false, canWrite: false, canDelete: false };
    }
  }
  
  async checkStorageConnectivity(): Promise<Connectivity> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity test
      await this.storage.list('connectivity-test');
      const responseTime = Date.now() - startTime;
      
      return {
        reachable: true,
        responseTime,
        status: 'healthy'
      };
    } catch (error) {
      return {
        reachable: false,
        responseTime: Date.now() - startTime,
        status: 'unreachable',
        error: error.message
      };
    }
  }
}

interface Diagnostic {
  type: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

interface DiagnosticResult {
  bucket: string;
  key: string;
  dataSize: number;
  diagnostics: Diagnostic[];
  overall: 'healthy' | 'warning' | 'error';
}

interface BucketAccess {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

interface Connectivity {
  reachable: boolean;
  responseTime: number;
  status: 'healthy' | 'degraded' | 'unreachable';
  error?: string;
}
```

This comprehensive guide provides advanced patterns and best practices for building robust, secure, and performant applications using the Frontal Storage SDK.
