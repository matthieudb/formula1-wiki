import { apiClient } from './client'
import { getCachedOrFetch, rateLimitedApiCall } from './cache'
import type { Session } from '../../types'

/**
 * Sessions-related API service module
 * This module handles all API calls related to Formula 1 sessions
 * Sessions include practice, qualifying, sprint, and race sessions
 */

/**
 * Get recent sessions with optional limit
 * Returns the most recent Formula 1 sessions across all meetings
 * 
 * @param limit - Maximum number of sessions to return (default: 50)
 * @returns Promise<Session[]> - Array of session objects
 */
export const getSessions = async (limit: number = 50): Promise<Session[]> => {
  const cacheKey = `sessions-recent-${limit}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/sessions?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Error fetching sessions:', error)
      throw new Error('Failed to fetch sessions data')
    }
  })
}

/**
 * Get all sessions for a specific meeting
 * Returns all sessions (practice, qualifying, race) for a race weekend
 * 
 * @param meetingKey - Unique identifier for the meeting
 * @returns Promise<Session[]> - Array of session objects for the meeting
 */
export const getSessionsByMeeting = async (meetingKey: number): Promise<Session[]> => {
  const cacheKey = `sessions-meeting-${meetingKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await rateLimitedApiCall(() => 
        apiClient.get(`/sessions?meeting_key=${meetingKey}`)
      )
      return response.data
    } catch (error) {
      console.error(`Error fetching sessions for meeting ${meetingKey}:`, error)
      throw new Error(`Failed to fetch sessions data for meeting ${meetingKey}`)
    }
  })
}

/**
 * Get the latest available session
 * Returns the most recent session to determine current data availability
 * 
 * @returns Promise<Session | null> - Latest session or null if none found
 */
export const getLatestAvailableSession = async (): Promise<Session | null> => {
  const cacheKey = 'latest-session'
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      // Get recent sessions without year filter to see what's available
      const response = await apiClient.get('/sessions?limit=1')
      return response.data[0] || null
    } catch (error) {
      console.error('Error fetching latest session:', error)
      return null
    }
  })
}

/**
 * Get race sessions for a specific year
 * Filters sessions to only include main Grand Prix races (not Sprint races)
 * 
 * @param year - Year to get race sessions for (e.g., 2025)
 * @returns Promise<Session[]> - Array of race session objects
 */
export const getRaceSessionsByYear = async (year: number): Promise<Session[]> => {
  const cacheKey = `race-sessions-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await rateLimitedApiCall(() =>
        apiClient.get(`/sessions?year=${year}`)
      )
      
      // Filter to only include main race sessions (not Sprint races)
      const raceSessions = response.data.filter((session: Session) =>
        session.session_name === 'Race' && session.session_type === 'Race'
      )
      
      console.log(`Filtered ${raceSessions.length} Grand Prix races from ${response.data.length} total sessions`)
      return raceSessions
    } catch (error) {
      console.error(`Error fetching race sessions for year ${year}:`, error)
      return []
    }
  })
}

/**
 * Get a specific session by its key
 * Returns detailed information about a single session
 * 
 * @param sessionKey - Unique identifier for the session
 * @returns Promise<Session | null> - Session object or null if not found
 */
export const getSession = async (sessionKey: number): Promise<Session | null> => {
  const cacheKey = `session-${sessionKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/sessions?session_key=${sessionKey}`)
      return response.data[0] || null
    } catch (error) {
      console.error(`Error fetching session ${sessionKey}:`, error)
      throw new Error(`Failed to fetch session data for key ${sessionKey}`)
    }
  })
}

/**
 * Get sessions by year with optional filtering
 * Returns all sessions for a specific year with optional session type filtering
 * 
 * @param year - Year to get sessions for
 * @param sessionType - Optional session type filter (e.g., 'Race', 'Qualifying')
 * @returns Promise<Session[]> - Array of filtered session objects
 */
export const getSessionsByYear = async (year: number, sessionType?: string): Promise<Session[]> => {
  const cacheKey = `sessions-year-${year}-${sessionType || 'all'}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await rateLimitedApiCall(() =>
        apiClient.get(`/sessions?year=${year}`)
      )
      
      if (sessionType) {
        return response.data.filter((session: Session) => 
          session.session_type === sessionType
        )
      }
      
      return response.data
    } catch (error) {
      console.error(`Error fetching sessions for year ${year}:`, error)
      throw new Error(`Failed to fetch sessions for year ${year}`)
    }
  })
}