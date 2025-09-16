import { getCachedOrFetch } from './cache'
import { getMeetings } from './meetings'
import type { Circuit } from '../../types'

/**
 * Circuits-related API service module
 * This module handles all operations related to Formula 1 circuits
 * Circuits are derived from meeting data since the API doesn't have a dedicated circuits endpoint
 */

/**
 * Get all circuits from recent meetings
 * Creates circuit objects from meeting data to avoid missing circuit information
 * 
 * @param limit - Maximum number of meetings to check for circuits (default: 25)
 * @returns Promise<Circuit[]> - Array of unique circuit objects
 */
export const getCircuits = async (limit: number = 25): Promise<Circuit[]> => {
  const cacheKey = `circuits-recent-${limit}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const meetings = await getMeetings(limit)
      const uniqueCircuits = new Map<number, Circuit>()

      // Create circuit objects from meeting data
      meetings.forEach(meeting => {
        if (!uniqueCircuits.has(meeting.circuit_key)) {
          uniqueCircuits.set(meeting.circuit_key, {
            circuit_key: meeting.circuit_key,
            circuit_short_name: meeting.circuit_short_name,
            circuit_name: meeting.meeting_official_name,
            country_code: meeting.country_code,
            country_name: meeting.country_name,
            location: meeting.location,
            date_start: meeting.date_start,
            gmt_offset: meeting.gmt_offset,
            meeting_key: meeting.meeting_key,
          })
        }
      })

      return Array.from(uniqueCircuits.values())
    } catch (error) {
      console.error('Error fetching circuits:', error)
      throw new Error('Failed to fetch circuits data')
    }
  })
}

/**
 * Get circuits for a specific year
 * Returns all unique circuits that host races in the given year
 * 
 * @param year - Year to get circuits for (e.g., 2025)
 * @returns Promise<Circuit[]> - Array of circuit objects for the year
 */
export const getCircuitsByYear = async (year: number): Promise<Circuit[]> => {
  const cacheKey = `circuits-year-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const { getMeetingsByYear } = await import('./meetings')
      const meetings = await getMeetingsByYear(year)
      
      // Create unique circuits from meetings data
      const circuitsMap = new Map<number, Circuit>()
      
      meetings.forEach(meeting => {
        if (!circuitsMap.has(meeting.circuit_key)) {
          circuitsMap.set(meeting.circuit_key, {
            circuit_key: meeting.circuit_key,
            circuit_short_name: meeting.circuit_short_name,
            circuit_name: meeting.meeting_official_name,
            country_code: meeting.country_code,
            country_name: meeting.country_name,
            location: meeting.location,
            date_start: meeting.date_start,
            gmt_offset: meeting.gmt_offset,
            meeting_key: meeting.meeting_key,
          })
        }
      })
      
      // Sort circuits by date to maintain calendar order
      return Array.from(circuitsMap.values())
        .sort((a, b) => {
          if (!a.date_start || !b.date_start) return 0
          return new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
        })
    } catch (error) {
      console.error(`Error fetching circuits for year ${year}:`, error)
      throw new Error(`Failed to fetch circuits for year ${year}`)
    }
  })
}

/**
 * Get a specific circuit by its key
 * Returns detailed information about a single circuit
 * 
 * @param circuitKey - Unique identifier for the circuit
 * @returns Promise<Circuit | null> - Circuit object or null if not found
 */
export const getCircuit = async (circuitKey: number): Promise<Circuit | null> => {
  const cacheKey = `circuit-${circuitKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Get circuits and find the one with matching key
      const circuits = await getCircuits(50) // Check more meetings for better coverage
      return circuits.find(circuit => circuit.circuit_key === circuitKey) || null
    } catch (error) {
      console.error(`Error fetching circuit ${circuitKey}:`, error)
      throw new Error(`Failed to fetch circuit data for key ${circuitKey}`)
    }
  })
}

/**
 * Get circuits with upcoming races
 * Returns circuits that have races scheduled in the future
 * 
 * @param year - Year to check for upcoming races (default: current year)
 * @returns Promise<Circuit[]> - Array of circuits with upcoming races
 */
export const getUpcomingCircuits = async (year?: number): Promise<Circuit[]> => {
  const targetYear = year || new Date().getFullYear()
  const cacheKey = `upcoming-circuits-${targetYear}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const circuits = await getCircuitsByYear(targetYear)
      const now = new Date()
      
      // Filter to circuits with races in the future
      return circuits.filter(circuit => 
        circuit.date_start && new Date(circuit.date_start) > now
      )
    } catch (error) {
      console.error(`Error fetching upcoming circuits for year ${targetYear}:`, error)
      throw new Error(`Failed to fetch upcoming circuits for year ${targetYear}`)
    }
  })
}