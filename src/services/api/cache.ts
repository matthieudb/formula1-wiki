/**
 * Caching and rate limiting utilities for OpenF1 API
 * This module handles API response caching and request rate limiting
 * to prevent API abuse and improve performance
 */

/**
 * Cache entry structure for storing API responses with timestamps
 * - data: The actual API response data
 * - timestamp: When the data was cached (milliseconds since epoch)
 */
interface CacheEntry {
  data: any
  timestamp: number
}

/**
 * In-memory cache for API responses
 * Uses Map for better performance than plain objects
 */
const cache = new Map<string, CacheEntry>()

/**
 * Cache duration in milliseconds (15 minutes)
 * Longer cache duration reduces API calls and prevents rate limiting
 */
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

/**
 * Rate limiting variables to prevent API abuse
 * OpenF1 API has rate limits, so we space out requests
 */
let lastApiCall = 0
const MIN_API_INTERVAL = 350 // Minimum 350ms between API calls (less than 3 per second)

/**
 * Rate-limited API call wrapper
 * Ensures minimum time interval between API requests to respect rate limits
 * 
 * @param apiCall - Function that returns a Promise with the API call
 * @returns Promise with the API call result
 */
export const rateLimitedApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCall
  
  // If not enough time has passed, wait before making the call
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall))
  }
  
  // Update the last call timestamp and execute the API call
  lastApiCall = Date.now()
  return apiCall()
}

/**
 * Generic caching utility function
 * Checks cache first, returns cached data if fresh, otherwise fetches new data
 * 
 * @param key - Unique cache key for this data request
 * @param fetchFn - Function that fetches fresh data when cache is stale
 * @returns Promise with either cached or fresh data
 */
export const getCachedOrFetch = async <T>(key: string, fetchFn: () => Promise<T>): Promise<T> => {
  const now = Date.now()
  const cached = cache.get(key)
  
  // Return cached data if it exists and is still fresh
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data
  }
  
  // Fetch fresh data and cache it
  const data = await fetchFn()
  cache.set(key, { data, timestamp: now })
  return data
}

/**
 * Clear all cached data
 * Useful for testing or when fresh data is explicitly needed
 */
export const clearCache = (): void => {
  cache.clear()
}

/**
 * Get cache statistics for debugging
 * Returns information about current cache state
 */
export const getCacheStats = () => ({
  totalEntries: cache.size,
  cacheDurationMs: CACHE_DURATION,
  rateLimitIntervalMs: MIN_API_INTERVAL,
})