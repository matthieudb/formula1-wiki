import { apiClient } from './client'
import { getCachedOrFetch } from './cache'
import type { Position } from '../../types'

/**
 * Positions-related API service module
 * This module handles all API calls related to Formula 1 race positions
 * Positions represent real-time driver standings during sessions
 */

/**
 * Get positions for a specific session
 * Returns the final or current positions of all drivers in a session
 * 
 * @param sessionKey - Unique identifier for the session
 * @returns Promise<Position[]> - Array of position objects
 */
export const getPositions = async (sessionKey: number): Promise<Position[]> => {
  const cacheKey = `positions-${sessionKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/position?session_key=${sessionKey}`)
      return response.data
    } catch (error) {
      console.error('Error fetching positions:', error)
      throw new Error('Failed to fetch positions data')
    }
  })
}

/**
 * Get positions for a specific driver in a session
 * Returns position data for a single driver throughout a session
 * 
 * @param sessionKey - Unique identifier for the session
 * @param driverNumber - Driver's race number
 * @returns Promise<Position[]> - Array of position objects for the driver
 */
export const getDriverPositions = async (sessionKey: number, driverNumber: number): Promise<Position[]> => {
  const cacheKey = `positions-${sessionKey}-driver-${driverNumber}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/position?session_key=${sessionKey}&driver_number=${driverNumber}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching positions for driver ${driverNumber}:`, error)
      throw new Error(`Failed to fetch positions data for driver ${driverNumber}`)
    }
  })
}

/**
 * Get final race positions for a session
 * Returns only the final finishing positions, filtered and sorted
 * 
 * @param sessionKey - Unique identifier for the race session
 * @returns Promise<Position[]> - Array of final position objects, sorted by position
 */
export const getFinalPositions = async (sessionKey: number): Promise<Position[]> => {
  const cacheKey = `final-positions-${sessionKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const allPositions = await getPositions(sessionKey)
      
      // Filter to only valid positions and sort by finishing order
      return allPositions
        .filter(pos => pos.position > 0) // Only valid finishing positions
        .sort((a, b) => a.position - b.position) // Sort by position ascending
    } catch (error) {
      console.error(`Error fetching final positions for session ${sessionKey}:`, error)
      throw new Error(`Failed to fetch final positions for session ${sessionKey}`)
    }
  })
}

/**
 * Get position at a specific time during a session
 * Returns positions closest to the specified timestamp
 * 
 * @param sessionKey - Unique identifier for the session
 * @param timestamp - ISO timestamp to get positions for
 * @returns Promise<Position[]> - Array of position objects at the specified time
 */
export const getPositionsAtTime = async (sessionKey: number, timestamp: string): Promise<Position[]> => {
  const cacheKey = `positions-${sessionKey}-time-${timestamp}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/position?session_key=${sessionKey}&date<=${timestamp}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching positions at time ${timestamp}:`, error)
      throw new Error(`Failed to fetch positions at specified time`)
    }
  })
}