import { apiClient } from './client'
import { getCachedOrFetch, rateLimitedApiCall } from './cache'
import type { Meeting } from '../../types'

/**
 * Meetings-related API service module
 * This module handles all API calls related to Formula 1 meetings
 * A meeting represents a race weekend (practice, qualifying, race sessions)
 */

/**
 * Get recent meetings with optional limit
 * Returns the most recent Formula 1 race weekends
 * 
 * @param limit - Maximum number of meetings to return (default: 25)
 * @returns Promise<Meeting[]> - Array of meeting objects
 */
export const getMeetings = async (limit: number = 25): Promise<Meeting[]> => {
  const cacheKey = `meetings-recent-${limit}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/meetings?limit=${limit}`)
      return response.data
    } catch (error) {
      console.error('Error fetching meetings:', error)
      throw new Error('Failed to fetch meetings data')
    }
  })
}

/**
 * Get all meetings for a specific year
 * Returns all Formula 1 race weekends scheduled for the given year
 * 
 * @param year - Year to get meetings for (e.g., 2025)
 * @returns Promise<Meeting[]> - Array of meeting objects for the year
 */
export const getMeetingsByYear = async (year: number): Promise<Meeting[]> => {
  const cacheKey = `meetings-year-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await rateLimitedApiCall(() => 
        apiClient.get(`/meetings?year=${year}`)
      )
      return response.data
    } catch (error) {
      console.error(`Error fetching meetings for year ${year}:`, error)
      throw new Error(`Failed to fetch meetings data for year ${year}`)
    }
  })
}

/**
 * Get a specific meeting by its key
 * Returns detailed information about a single race weekend
 * 
 * @param meetingKey - Unique identifier for the meeting
 * @returns Promise<Meeting | null> - Meeting object or null if not found
 */
export const getMeeting = async (meetingKey: number): Promise<Meeting | null> => {
  const cacheKey = `meeting-${meetingKey}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const response = await apiClient.get(`/meetings?meeting_key=${meetingKey}`)
      return response.data[0] || null
    } catch (error) {
      console.error(`Error fetching meeting ${meetingKey}:`, error)
      throw new Error(`Failed to fetch meeting data for key ${meetingKey}`)
    }
  })
}

/**
 * Get completed meetings for a specific year
 * Filters meetings to only include those that have already finished
 * 
 * @param year - Year to get completed meetings for
 * @returns Promise<Meeting[]> - Array of completed meeting objects
 */
export const getCompletedMeetings = async (year: number): Promise<Meeting[]> => {
  const cacheKey = `completed-meetings-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      const allMeetings = await getMeetingsByYear(year)
      const now = new Date()
      
      // Filter to only include meetings that have already started
      return allMeetings.filter(meeting => 
        new Date(meeting.date_start) < now
      )
    } catch (error) {
      console.error(`Error fetching completed meetings for year ${year}:`, error)
      throw new Error(`Failed to fetch completed meetings for year ${year}`)
    }
  })
}