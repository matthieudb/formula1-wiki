import { apiClient } from './client'
import { getCachedOrFetch, rateLimitedApiCall } from './cache'
import type { Driver } from '../../types'

/**
 * Driver-related API service module
 * This module handles all API calls related to Formula 1 drivers
 * Includes caching and rate limiting for optimal performance
 */

/**
 * Get all drivers from a specific session or year
 * This function handles multiple scenarios:
 * - Get drivers from a specific session key
 * - Get drivers from a specific year (uses latest session from that year)
 * - Get drivers from latest available session (default)
 * 
 * @param sessionKey - Optional session key to get drivers from
 * @param year - Optional year to get drivers from (e.g., 2025)
 * @returns Promise<Driver[]> - Array of driver objects
 */
export const getDrivers = async (sessionKey?: number, year?: number): Promise<Driver[]> => {
  // Create unique cache key based on parameters
  const cacheKey = year ? `drivers-year-${year}` : `drivers-${sessionKey || 'latest'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      if (year) {
        // Get drivers from specific year by finding the latest session
        const { getMeetingsByYear } = await import('./meetings')
        const { getSessionsByMeeting } = await import('./sessions')
        
        const meetings = await getMeetingsByYear(year)
        if (meetings.length === 0) {
          throw new Error(`No meetings found for year ${year}`)
        }

        // Get the most recent meeting from the year to get current season drivers
        const latestMeeting = meetings[meetings.length - 1]
        const sessions = await getSessionsByMeeting(latestMeeting.meeting_key)
        
        if (sessions.length === 0) {
          throw new Error(`No sessions found for meeting ${latestMeeting.meeting_key}`)
        }

        // Use the latest session from the meeting to get drivers
        const latestSession = sessions[sessions.length - 1]
        const response = await rateLimitedApiCall(() =>
          apiClient.get(`/drivers?session_key=${latestSession.session_key}`)
        )
        return response.data
      } else {
        // Get drivers from specific session or latest available
        let url = '/drivers'
        if (sessionKey) {
          url += `?session_key=${sessionKey}`
        } else {
          // Get drivers from latest session
          const { getLatestAvailableSession } = await import('./sessions')
          const latestSession = await getLatestAvailableSession()
          if (latestSession) {
            url += `?session_key=${latestSession.session_key}`
          }
        }
        
        const response = await apiClient.get(url)
        return response.data
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
      throw new Error('Failed to fetch drivers data')
    }
  })
}

/**
 * Get a specific driver by driver number
 * Returns detailed information about a single driver
 * 
 * @param driverNumber - The driver's race number (e.g., 1, 33, 44)
 * @param sessionKey - Optional session key for driver context
 * @returns Promise<Driver | null> - Driver object or null if not found
 */
export const getDriver = async (driverNumber: number, sessionKey?: number): Promise<Driver | null> => {
  const cacheKey = `driver-${driverNumber}-${sessionKey || 'latest'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      let url = `/drivers?driver_number=${driverNumber}`
      if (sessionKey) {
        url += `&session_key=${sessionKey}`
      }
      
      const response = await apiClient.get(url)
      return response.data[0] || null // Return first driver or null
    } catch (error) {
      console.error('Error fetching driver:', error)
      throw new Error('Failed to fetch driver data')
    }
  })
}

/**
 * Get drivers with their current championship points
 * This combines driver data with calculated standings
 * 
 * @param year - Year to get standings for (defaults to current year)
 * @returns Promise<Driver[]> - Array of drivers with points and standings
 */
export const getDriversWithStandings = async (year: number = 2025): Promise<Driver[]> => {
  const cacheKey = `drivers-standings-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Get basic driver data first
      const drivers = await getDrivers(undefined, year)
      
      // Get standings data to add points
      const { calculateStandings } = await import('../standings')
      const standingsData = await calculateStandings(year)
      
      // Merge driver data with standings
      return standingsData.drivers || drivers.map(driver => ({ ...driver, points: 0 }))
    } catch (error) {
      console.error('Error fetching drivers with standings:', error)
      // Return basic drivers without points if standings fail
      return getDrivers(undefined, year)
    }
  })
}