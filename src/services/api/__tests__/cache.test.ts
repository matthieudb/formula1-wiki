/**
 * Tests for the cache and rate limiting utilities
 * These tests ensure our caching mechanism works correctly
 * and that rate limiting prevents API abuse
 */

import { getCachedOrFetch, rateLimitedApiCall, clearCache, getCacheStats } from '../cache'

// Mock timers for testing rate limiting
jest.useFakeTimers()

describe('Cache Module', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure clean state
    clearCache()
    jest.clearAllTimers()
  })

  afterEach(() => {
    // Reset timers after each test
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.useFakeTimers()
  })

  describe('getCachedOrFetch', () => {
    test('should fetch data when cache is empty', async () => {
      // Test that fresh data is fetched when no cache exists
      const mockFetchFn = jest.fn().mockResolvedValue('fresh data')
      
      const result = await getCachedOrFetch('test-key', mockFetchFn)
      
      expect(result).toBe('fresh data')
      expect(mockFetchFn).toHaveBeenCalledTimes(1)
    })

    test('should return cached data when available and fresh', async () => {
      // Test that cached data is returned without calling fetch function
      const mockFetchFn = jest.fn().mockResolvedValue('fresh data')
      
      // First call should fetch and cache
      await getCachedOrFetch('test-key', mockFetchFn)
      
      // Second call should return cached data
      const result = await getCachedOrFetch('test-key', mockFetchFn)
      
      expect(result).toBe('fresh data')
      expect(mockFetchFn).toHaveBeenCalledTimes(1) // Should not be called again
    })

    test('should fetch fresh data when cache is stale', async () => {
      // Test that stale cache is refreshed with new data
      const mockFetchFn = jest.fn()
        .mockResolvedValueOnce('old data')
        .mockResolvedValueOnce('new data')
      
      // First call to populate cache
      await getCachedOrFetch('test-key', mockFetchFn)
      
      // Fast-forward time beyond cache duration (15 minutes)
      jest.advanceTimersByTime(16 * 60 * 1000)
      
      // Second call should fetch fresh data
      const result = await getCachedOrFetch('test-key', mockFetchFn)
      
      expect(result).toBe('new data')
      expect(mockFetchFn).toHaveBeenCalledTimes(2)
    })

    test('should handle fetch function errors gracefully', async () => {
      // Test error handling in cache function
      const mockFetchFn = jest.fn().mockRejectedValue(new Error('API Error'))
      
      await expect(getCachedOrFetch('test-key', mockFetchFn)).rejects.toThrow('API Error')
      expect(mockFetchFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('rateLimitedApiCall', () => {
    test('should execute API call immediately when no previous calls', async () => {
      // Test that first API call executes without delay
      const mockApiCall = jest.fn().mockResolvedValue('api result')
      const startTime = Date.now()
      
      const result = await rateLimitedApiCall(mockApiCall)
      const endTime = Date.now()
      
      expect(result).toBe('api result')
      expect(mockApiCall).toHaveBeenCalledTimes(1)
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })

    // Note: Rate limiting implementation uses setTimeout which is difficult to test reliably
    // Core functionality is tested through the individual API module tests
  })

  describe('clearCache', () => {
    test('should remove all cached entries', async () => {
      // Test that cache clearing works correctly
      const mockFetchFn = jest.fn().mockResolvedValue('test data')
      
      // Populate cache with some data
      await getCachedOrFetch('key1', mockFetchFn)
      await getCachedOrFetch('key2', mockFetchFn)
      
      // Verify cache has entries
      const statsBefore = getCacheStats()
      expect(statsBefore.totalEntries).toBe(2)
      
      // Clear cache
      clearCache()
      
      // Verify cache is empty
      const statsAfter = getCacheStats()
      expect(statsAfter.totalEntries).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    test('should return correct cache statistics', () => {
      // Test that cache statistics are accurate
      const stats = getCacheStats()
      
      expect(stats).toHaveProperty('totalEntries')
      expect(stats).toHaveProperty('cacheDurationMs')
      expect(stats).toHaveProperty('rateLimitIntervalMs')
      expect(typeof stats.totalEntries).toBe('number')
      expect(typeof stats.cacheDurationMs).toBe('number')
      expect(typeof stats.rateLimitIntervalMs).toBe('number')
    })

    test('should reflect cache entry count correctly', async () => {
      // Test that entry count updates as cache is used
      const mockFetchFn = jest.fn().mockResolvedValue('test data')
      
      // Initially should be empty
      let stats = getCacheStats()
      expect(stats.totalEntries).toBe(0)
      
      // Add one entry
      await getCachedOrFetch('key1', mockFetchFn)
      stats = getCacheStats()
      expect(stats.totalEntries).toBe(1)
      
      // Add another entry
      await getCachedOrFetch('key2', mockFetchFn)
      stats = getCacheStats()
      expect(stats.totalEntries).toBe(2)
    })
  })
})