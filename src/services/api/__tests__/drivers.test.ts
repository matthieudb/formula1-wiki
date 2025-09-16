/**
 * Tests for the drivers API service module
 * These tests ensure driver data fetching and processing works correctly
 */

import { getDrivers, getDriver } from '../drivers'
import * as cache from '../cache'
import * as client from '../client'

// Mock the cache and client modules
jest.mock('../cache')
jest.mock('../client')
jest.mock('../meetings')
jest.mock('../sessions')

const mockGetCachedOrFetch = cache.getCachedOrFetch as jest.MockedFunction<typeof cache.getCachedOrFetch>
const mockApiClient = client.apiClient as jest.Mocked<typeof client.apiClient>

describe('Drivers API Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  describe('getDrivers', () => {
    const mockDriversData = [
      {
        driver_number: 1,
        full_name: 'Max Verstappen',
        name_acronym: 'VER',
        team_name: 'Red Bull Racing',
        team_colour: '0600EF',
        country_code: 'NED',
        broadcast_name: 'M VERSTAPPEN',
        first_name: 'Max',
        last_name: 'Verstappen'
      },
      {
        driver_number: 44,
        full_name: 'Lewis Hamilton',
        name_acronym: 'HAM',
        team_name: 'Mercedes',
        team_colour: '00D2BE',
        country_code: 'GBR',
        broadcast_name: 'L HAMILTON',
        first_name: 'Lewis',
        last_name: 'Hamilton'
      }
    ]

    test('should fetch drivers successfully without parameters', async () => {
      // Test basic driver fetching functionality
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriversData)
      mockApiClient.get.mockResolvedValueOnce({ data: mockDriversData })

      const result = await getDrivers()

      expect(result).toEqual(mockDriversData)
      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        'drivers-latest',
        expect.any(Function)
      )
    })

    test('should fetch drivers for specific session', async () => {
      // Test driver fetching with session parameter
      const sessionKey = 12345
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriversData)
      mockApiClient.get.mockResolvedValueOnce({ data: mockDriversData })

      const result = await getDrivers(sessionKey)

      expect(result).toEqual(mockDriversData)
      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        `drivers-${sessionKey}`,
        expect.any(Function)
      )
    })

    test('should fetch drivers for specific year', async () => {
      // Test driver fetching with year parameter
      const year = 2025
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriversData)

      const result = await getDrivers(undefined, year)

      expect(result).toEqual(mockDriversData)
      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        `drivers-year-${year}`,
        expect.any(Function)
      )
    })

    test('should handle API errors gracefully', async () => {
      // Test error handling in driver fetching
      const mockError = new Error('API Error')
      mockGetCachedOrFetch.mockRejectedValueOnce(mockError)

      await expect(getDrivers()).rejects.toThrow('API Error')
    })

    test('should use correct cache key format', async () => {
      // Test that cache keys are formatted correctly
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriversData)

      await getDrivers(123, 2025)

      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        'drivers-year-2025',
        expect.any(Function)
      )
    })
  })

  describe('getDriver', () => {
    const mockDriver = {
      driver_number: 1,
      full_name: 'Max Verstappen',
      name_acronym: 'VER',
      team_name: 'Red Bull Racing',
      team_colour: '0600EF',
      country_code: 'NED',
      broadcast_name: 'M VERSTAPPEN',
      first_name: 'Max',
      last_name: 'Verstappen'
    }

    test('should fetch single driver successfully', async () => {
      // Test fetching a specific driver by number
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriver)
      mockApiClient.get.mockResolvedValueOnce({ data: [mockDriver] })

      const result = await getDriver(1)

      expect(result).toEqual(mockDriver)
      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        'driver-1-latest',
        expect.any(Function)
      )
    })

    test('should fetch driver with session context', async () => {
      // Test driver fetching with session parameter
      const sessionKey = 12345
      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriver)
      mockApiClient.get.mockResolvedValueOnce({ data: [mockDriver] })

      const result = await getDriver(1, sessionKey)

      expect(result).toEqual(mockDriver)
      expect(mockGetCachedOrFetch).toHaveBeenCalledWith(
        `driver-1-${sessionKey}`,
        expect.any(Function)
      )
    })

    test('should return null when driver not found', async () => {
      // Test handling of missing driver
      mockGetCachedOrFetch.mockResolvedValueOnce(null)
      mockApiClient.get.mockResolvedValueOnce({ data: [] })

      const result = await getDriver(999)

      expect(result).toBeNull()
    })

    test('should handle API errors in single driver fetch', async () => {
      // Test error handling for single driver
      const mockError = new Error('Driver not found')
      mockGetCachedOrFetch.mockRejectedValueOnce(mockError)

      await expect(getDriver(1)).rejects.toThrow('Driver not found')
    })
  })

  describe('Data Quality', () => {
    test('should return well-formed driver objects', async () => {
      // Test that returned driver objects have expected structure
      const mockDriversData = [
        {
          driver_number: 1,
          full_name: 'Max Verstappen',
          name_acronym: 'VER',
          team_name: 'Red Bull Racing',
          team_colour: '0600EF',
          country_code: 'NED',
          broadcast_name: 'M VERSTAPPEN',
          first_name: 'Max',
          last_name: 'Verstappen'
        }
      ]

      mockGetCachedOrFetch.mockResolvedValueOnce(mockDriversData)

      const result = await getDrivers()

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('driver_number')
      expect(result[0]).toHaveProperty('full_name')
      expect(result[0]).toHaveProperty('team_name')
      expect(result[0]).toHaveProperty('team_colour')
      expect(typeof result[0].driver_number).toBe('number')
      expect(typeof result[0].full_name).toBe('string')
    })

    test('should handle empty driver arrays', async () => {
      // Test handling of empty results
      mockGetCachedOrFetch.mockResolvedValueOnce([])

      const result = await getDrivers()

      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })
  })
})