import { apiClient } from './client'
import { getCachedOrFetch } from './cache'
import type { LapTime } from '../../types'

/**
 * Performance-related API service module
 * This module handles all API calls related to Formula 1 performance data
 * Includes lap times, sector times, and speed data for analysis
 */

/**
 * Get lap times for a specific session
 * Returns detailed lap timing data for performance analysis
 * 
 * @param sessionKey - Unique identifier for the session
 * @param driverNumber - Optional driver number to filter results
 * @returns Promise<LapTime[]> - Array of lap time objects
 */
export const getLapTimes = async (sessionKey: number, driverNumber?: number): Promise<LapTime[]> => {
  const cacheKey = `laps-${sessionKey}-${driverNumber || 'all'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      let url = `/laps?session_key=${sessionKey}`
      if (driverNumber) {
        url += `&driver_number=${driverNumber}`
      }
      const response = await apiClient.get(url)
      return response.data
    } catch (error) {
      console.error('Error fetching lap times:', error)
      throw new Error('Failed to fetch lap times data')
    }
  })
}

/**
 * Get fastest lap times for a session
 * Returns the fastest lap for each driver in the session
 * 
 * @param sessionKey - Unique identifier for the session
 * @returns Promise<LapTime[]> - Array of fastest lap objects per driver
 */
export const getFastestLaps = async (sessionKey: number): Promise<LapTime[]> => {
  const cacheKey = `fastest-laps-${sessionKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const allLaps = await getLapTimes(sessionKey)
      
      // Group laps by driver and find fastest for each
      const fastestByDriver = new Map<number, LapTime>()
      
      allLaps.forEach(lap => {
        if (!lap.lap_duration) return // Skip laps without valid time
        
        const currentFastest = fastestByDriver.get(lap.driver_number)
        if (!currentFastest || lap.lap_duration < currentFastest.lap_duration!) {
          fastestByDriver.set(lap.driver_number, lap)
        }
      })
      
      return Array.from(fastestByDriver.values())
        .sort((a, b) => (a.lap_duration || 0) - (b.lap_duration || 0))
    } catch (error) {
      console.error('Error calculating fastest laps:', error)
      throw new Error('Failed to calculate fastest laps')
    }
  })
}

/**
 * Get sector times analysis for a session
 * Returns sector timing data for performance comparison
 * 
 * @param sessionKey - Unique identifier for the session
 * @param driverNumber - Optional driver number to filter results
 * @returns Promise<LapTime[]> - Array of lap objects with sector data
 */
export const getSectorTimes = async (sessionKey: number, driverNumber?: number): Promise<LapTime[]> => {
  const cacheKey = `sectors-${sessionKey}-${driverNumber || 'all'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const lapTimes = await getLapTimes(sessionKey, driverNumber)
      
      // Filter to only laps with complete sector data
      return lapTimes.filter(lap => 
        lap.duration_sector_1 && 
        lap.duration_sector_2 && 
        lap.duration_sector_3
      )
    } catch (error) {
      console.error('Error fetching sector times:', error)
      throw new Error('Failed to fetch sector times data')
    }
  })
}

/**
 * Get speed trap data for a session
 * Returns speed measurements at various points on the track
 * 
 * @param sessionKey - Unique identifier for the session
 * @param driverNumber - Optional driver number to filter results
 * @returns Promise<LapTime[]> - Array of lap objects with speed data
 */
export const getSpeedData = async (sessionKey: number, driverNumber?: number): Promise<LapTime[]> => {
  const cacheKey = `speeds-${sessionKey}-${driverNumber || 'all'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const lapTimes = await getLapTimes(sessionKey, driverNumber)
      
      // Filter to only laps with speed data
      return lapTimes.filter(lap => 
        lap.i1_speed || lap.i2_speed || lap.st_speed
      )
    } catch (error) {
      console.error('Error fetching speed data:', error)
      throw new Error('Failed to fetch speed data')
    }
  })
}

/**
 * Get session results for championship points calculation
 * Returns final classification and results for a session
 * 
 * @param sessionKey - Unique identifier for the session
 * @returns Promise<any[]> - Array of session result objects
 */
export const getSessionResults = async (sessionKey: number): Promise<any[]> => {
  const cacheKey = `session-results-${sessionKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/session_result?session_key=${sessionKey}`)
      return response.data
    } catch (error) {
      console.error('Error fetching session results:', error)
      return []
    }
  })
}

/**
 * Calculate lap time statistics for a driver in a session
 * Returns statistical analysis of lap times including average, best, etc.
 * 
 * @param sessionKey - Unique identifier for the session
 * @param driverNumber - Driver's race number
 * @returns Promise<object> - Statistical summary of lap times
 */
export const getLapTimeStats = async (sessionKey: number, driverNumber: number) => {
  const cacheKey = `lap-stats-${sessionKey}-${driverNumber}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const lapTimes = await getLapTimes(sessionKey, driverNumber)
      const validLaps = lapTimes.filter(lap => lap.lap_duration && !lap.is_pit_out_lap)
      
      if (validLaps.length === 0) {
        return {
          totalLaps: 0,
          validLaps: 0,
          bestLap: null,
          averageLap: null,
          consistency: null
        }
      }
      
      const durations = validLaps.map(lap => lap.lap_duration!)
      const bestLap = Math.min(...durations)
      const averageLap = durations.reduce((a, b) => a + b, 0) / durations.length
      
      // Calculate consistency (standard deviation)
      const variance = durations.reduce((sum, time) => sum + Math.pow(time - averageLap, 2), 0) / durations.length
      const consistency = Math.sqrt(variance)
      
      return {
        totalLaps: lapTimes.length,
        validLaps: validLaps.length,
        bestLap: bestLap / 1000, // Convert to seconds
        averageLap: averageLap / 1000, // Convert to seconds
        consistency: consistency / 1000 // Convert to seconds
      }
    } catch (error) {
      console.error('Error calculating lap time stats:', error)
      throw new Error('Failed to calculate lap time statistics')
    }
  })
}