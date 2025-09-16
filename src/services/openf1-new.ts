/**
 * OpenF1 Service - Main API Interface
 * This is the main service that provides a clean, unified interface to all Formula 1 data
 * 
 * This service replaces the previous monolithic implementation with a modular approach:
 * - Breaks down functionality into focused modules
 * - Provides comprehensive documentation
 * - Maintains clean separation of concerns
 * - Includes proper error handling and caching
 * 
 * Each module handles a specific area:
 * - api/drivers: Driver-related data and standings
 * - api/meetings: Race weekend and calendar data
 * - api/sessions: Individual session data (practice, qualifying, race)
 * - api/circuits: Circuit and track information
 * - api/positions: Real-time and final race positions
 * - api/performance: Lap times, sector times, and speed data
 * - standings: Championship calculations and points
 */

// Import all the modular API services
import { getDrivers, getDriver, getDriversWithStandings } from './api/drivers'
import { getMeetings, getMeetingsByYear, getCompletedMeetings } from './api/meetings'
import { getSessions, getSessionsByMeeting, getLatestAvailableSession, getRaceSessionsByYear } from './api/sessions'
import { getCircuits, getCircuitsByYear, getCircuit } from './api/circuits'
import { getPositions, getFinalPositions } from './api/positions'
import { getLapTimes, getSessionResults, getLapTimeStats } from './api/performance'
import { calculateStandings, F1_POINTS_SYSTEM } from './standings'
import { getCachedOrFetch } from './api/cache'

/**
 * Season statistics interface
 * Contains comprehensive information about a Formula 1 season
 */
interface SeasonStats {
  totalRaces: number
  completedRaces: number
  upcomingRaces: number
  totalDrivers: number
  totalConstructors: number
  currentYear: number
  meetings: any[]
  drivers: any[]
  constructors: any[]
  circuits: any[]
  sessions: any[]
  lastUpdated: string
}

/**
 * OpenF1Service - Clean, modular API service
 * 
 * This class provides the main interface for accessing Formula 1 data
 * All methods are well-documented and use the modular API services
 */
export class OpenF1Service {
  
  /**
   * Get drivers from a specific session or year
   * @param sessionKey - Optional session key to get drivers from
   * @param year - Optional year to get drivers from (e.g., 2025)
   * @returns Promise<Driver[]> - Array of driver objects
   */
  static async getDrivers(sessionKey?: number, year?: number) {
    return getDrivers(sessionKey, year)
  }

  /**
   * Get a specific driver by driver number
   * @param driverNumber - The driver's race number (e.g., 1, 33, 44)
   * @param sessionKey - Optional session key for driver context
   * @returns Promise<Driver | null> - Driver object or null if not found
   */
  static async getDriver(driverNumber: number, sessionKey?: number) {
    return getDriver(driverNumber, sessionKey)
  }

  /**
   * Get recent sessions with optional limit
   * @param limit - Maximum number of sessions to return (default: 50)
   * @returns Promise<Session[]> - Array of session objects
   */
  static async getSessions(limit: number = 50) {
    return getSessions(limit)
  }

  /**
   * Get recent meetings with optional limit
   * @param limit - Maximum number of meetings to return (default: 25)
   * @returns Promise<Meeting[]> - Array of meeting objects
   */
  static async getMeetings(limit: number = 25) {
    return getMeetings(limit)
  }

  /**
   * Get all meetings for a specific year
   * @param year - Year to get meetings for (e.g., 2025)
   * @returns Promise<Meeting[]> - Array of meeting objects for the year
   */
  static async getMeetingsByYear(year: number) {
    return getMeetingsByYear(year)
  }

  /**
   * Get all sessions for a specific meeting
   * @param meetingKey - Unique identifier for the meeting
   * @returns Promise<Session[]> - Array of session objects for the meeting
   */
  static async getSessionsByMeeting(meetingKey: number) {
    return getSessionsByMeeting(meetingKey)
  }

  /**
   * Get all circuits from recent meetings
   * @returns Promise<Circuit[]> - Array of unique circuit objects
   */
  static async getCircuits() {
    return getCircuits()
  }

  /**
   * Get positions for a specific session
   * @param sessionKey - Unique identifier for the session
   * @returns Promise<Position[]> - Array of position objects
   */
  static async getPositions(sessionKey: number) {
    return getPositions(sessionKey)
  }

  /**
   * Get lap times for performance analysis
   * @param sessionKey - Unique identifier for the session
   * @param driverNumber - Optional driver number to filter results
   * @returns Promise<LapTime[]> - Array of lap time objects
   */
  static async getLapTimes(sessionKey: number, driverNumber?: number) {
    return getLapTimes(sessionKey, driverNumber)
  }

  /**
   * Get session results for championship points calculation
   * @param sessionKey - Unique identifier for the session
   * @returns Promise<any[]> - Array of session result objects
   */
  static async getSessionResults(sessionKey: number) {
    return getSessionResults(sessionKey)
  }

  /**
   * Get race sessions for a specific year (only actual Grand Prix races)
   * @param year - Year to get race sessions for
   * @returns Promise<Session[]> - Array of race session objects
   */
  static async getRaceSessionsByYear(year: number) {
    return getRaceSessionsByYear(year)
  }

  /**
   * Calculate championship standings for a specific year
   * @param year - Year to calculate standings for (default: 2025)
   * @returns Promise<StandingsResult> - Complete standings data
   */
  static async calculateStandings(year: number = 2025) {
    return calculateStandings(year)
  }

  /**
   * Get the latest available session
   * @returns Promise<Session | null> - Latest session or null if none found
   */
  static async getLatestAvailableSession() {
    return getLatestAvailableSession()
  }

  /**
   * Alias for getLatestAvailableSession for backward compatibility
   * @returns Promise<Session | null> - Latest session or null if none found
   */
  static async getLatestSession() {
    return this.getLatestAvailableSession()
  }

  /**
   * Get comprehensive season statistics for a specific year
   * This method combines data from multiple sources to provide a complete season overview
   * 
   * @param year - Year to get statistics for (defaults to 2025)
   * @returns Promise<SeasonStats> - Complete season statistics
   */
  static async getSeasonStats(year?: number): Promise<SeasonStats> {
    const targetYear = year || 2025
    const cacheKey = `season-stats-${targetYear}`
    
    return getCachedOrFetch(cacheKey, async () => {
      try {
        console.log(`Fetching season statistics for ${targetYear}...`)
        
        // Get standings data (this includes drivers and constructors with points)
        const standingsData = await this.calculateStandings(targetYear)
        
        // Get meetings for calendar and circuit data
        const meetings = await getMeetingsByYear(targetYear)
        
        if (meetings.length === 0) {
          throw new Error(`No meetings found for year ${targetYear}`)
        }

        // Create circuits from meetings data (avoids additional API calls)
        const circuits = await getCircuitsByYear(targetYear)

        console.log(`Season stats loaded: ${meetings.length} meetings, ${standingsData.drivers.length} drivers, ${circuits.length} circuits`)

        return {
          totalRaces: standingsData.totalRaces,
          completedRaces: standingsData.completedRaces,
          upcomingRaces: standingsData.upcomingRaces,
          totalDrivers: standingsData.drivers.length,
          totalConstructors: standingsData.constructors.length,
          currentYear: targetYear,
          meetings,
          drivers: standingsData.drivers,
          constructors: standingsData.constructors,
          circuits,
          sessions: [], // Sessions loaded on demand to avoid performance issues
          lastUpdated: standingsData.lastUpdated
        }
      } catch (error) {
        console.error(`Error fetching season stats for year ${targetYear}:`, error)
        throw new Error(`Failed to fetch season statistics for year ${targetYear}`)
      }
    })
  }

  /**
   * F1 Points system constant for external use
   * Points awarded: 1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, 7th=6, 8th=4, 9th=2, 10th=1
   */
  static readonly F1_POINTS_SYSTEM = F1_POINTS_SYSTEM
}

/**
 * Export the new service as default
 * This replaces the previous monolithic implementation
 */
export default OpenF1Service