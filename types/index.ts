/**
 * Frontal SDK Global Types
 * Shared types and interfaces used across all packages
 */

// ============================================================================
// Core API Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = null> {
  /**
   * Response data
   */
  data: T;
  /**
   * Error information
   */
  error: ErrorResponse | null;
  /**
   * Response headers
   */
  headers: Record<string, string> | null;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  /**
   * Error code
   */
  code: string;
  /**
   * Error message
   */
  message: string;
  /**
   * Request ID for tracking
   */
  requestId: string;
  /**
   * Documentation URL for this error
   */
  docs?: string;
  /**
   * Field-specific validation errors
   */
  fields?: ErrorField[];
}

/**
 * Field-specific error information
 */
export interface ErrorField {
  /**
   * Field name
   */
  field: string;
  /**
   * Error code
   */
  code: string;
  /**
   * Error message
   */
  message: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Base configuration interface for all Frontal services
 */
export interface BaseConfig {
  /**
   * Frontal API key (must start with 'frt_')
   */
  apiKey: string;
  /**
   * Base URL for API requests
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
  /**
   * Environment name
   */
  environment?: string;
  /**
   * Enable debug logging
   */
  debug?: boolean;
  /**
   * Additional headers for all requests
   */
  headers?: Record<string, string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  /**
   * Delay between retries in milliseconds
   */
  retryDelay: number;
  /**
   * Backoff strategy
   */
  backoff: 'exponential' | 'linear' | 'constant';
  /**
   * HTTP status codes to retry on
   */
  retryOn: number[];
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Response metadata
 */
export interface ResponseMeta {
  /**
   * Unique request identifier
   */
  requestId: string;
  /**
   * Response timestamp
   */
  timestamp: Date;
  /**
   * API version
   */
  version?: string;
  /**
   * Substrate identifier
   */
  substrate?: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /**
   * Cursor for next page
   */
  cursor: string | null;
  /**
   * Whether more items are available
   */
  hasMore: boolean;
  /**
   * Total number of items
   */
  total?: number;
}

/**
 * Paginated response wrapper
 */
export interface PageResult<T> {
  /**
   * Array of items
   */
  data: T[];
  /**
   * Response metadata
   */
  meta?: ResponseMeta;
  /**
   * Pagination information
   */
  pagination: PaginationMeta;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Environment variable validation result
 */
export interface EnvValidationResult {
  success: boolean;
  error?: string;
}

/**
 * Package information
 */
export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
}

// ============================================================================
// Global Types for Node.js and Bun
// ============================================================================

/**
 * Node.js global process object
 */
export interface NodeProcess {
  /**
   * Node.js version
   */
  version: string;
  /**
   * Platform
   */
  platform: string;
  /**
   * Architecture
   */
  arch: string;
  /**
   * Environment variables
   */
  env: Record<string, string | undefined>;
}

/**
 * Bun global object
 */
export interface BunGlobal {
  /**
   * Bun version
   */
  version: string;
  /**
   * Revision
   */
  revision: string;
  /**
   * Environment variables
   */
  env: Record<string, string | undefined>;
}

// ============================================================================
// Re-exports from packages for convenience
// ============================================================================
