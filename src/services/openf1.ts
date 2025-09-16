import axios from 'axios'
import type { 
  Driver, 
  Constructor, 
  Circuit, 
  Session, 
  Meeting, 
  Position, 
  LapTime, 
  ApiResponse 
} from '../types'

// OpenF1 API base URL
const BASE_URL = 'https://api.openf1.org/v1'

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Enhanced caching to prevent too many API calls and 429 errors
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes - longer cache for less API calls

// Rate limiting to prevent 429 errors
let lastApiCall = 0
const MIN_API_INTERVAL = 350 // Minimum 350ms between API calls (less than 3 per second)

const rateLimitedApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  const now = Date.now()
  const timeSinceLastCall = now - lastApiCall
  
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall))
  }
  
  lastApiCall = Date.now()
  return apiCall()
}

// Helper function to get cached data or fetch new data
const getCachedOrFetch = async <T>(key: string, fetchFn: () => Promise<T>): Promise<T> => {
  const now = Date.now()
  const cached = cache.get(key)
  
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data
  }
  
  const data = await fetchFn()
  cache.set(key, { data, timestamp: now })
  return data
}

// API service class for OpenF1 endpoints
export class OpenF1Service {
  // Get the latest available session to determine current data
  static async getLatestAvailableSession(): Promise<Session | null> {
    return getCachedOrFetch('latest-session', async () => {
      try {
        // Get recent sessions without year filter to see what's available
        const response = await api.get('/sessions?limit=1')
        return response.data[0] || null
      } catch (error) {
        console.error('Error fetching latest session:', error)
        return null
      }
    })
  }

  // Get drivers from a specific session, year, or latest available
  static async getDrivers(sessionKey?: number, year?: number): Promise<Driver[]> {
    const cacheKey = year ? `drivers-year-${year}` : `drivers-${sessionKey || 'latest'}`
    
    return getCachedOrFetch(cacheKey, async () => {
      try {
        if (year) {
          // Get drivers from specific year (e.g., 2025 season)
          const meetings = await this.getMeetingsByYear(year)
          if (meetings.length === 0) {
            throw new Error(`No meetings found for year ${year}`)
          }

          // Get the most recent meeting from the year to get current season drivers
          const latestMeeting = meetings[meetings.length - 1]
          const sessions = await this.getSessionsByMeeting(latestMeeting.meeting_key)
          
          if (sessions.length === 0) {
            throw new Error(`No sessions found for meeting ${latestMeeting.meeting_key}`)
          }

          // Use the latest session from the meeting to get drivers
          const latestSession = sessions[sessions.length - 1]
          const response = await rateLimitedApiCall(() =>
            api.get(`/drivers?session_key=${latestSession.session_key}`)
          )
          return response.data
        } else {
          // Original logic for specific session or latest
          let url = '/drivers'
          if (sessionKey) {
            url += `?session_key=${sessionKey}`
          } else {
            // Get drivers from latest session
            const latestSession = await this.getLatestAvailableSession()
            if (latestSession) {
              url += `?session_key=${latestSession.session_key}`
            }
          }
          
          const response = await api.get(url)
          return response.data
        }
      } catch (error) {
        console.error('Error fetching drivers:', error)
        throw new Error('Failed to fetch drivers data')
      }
    })
  }

  // Get driver by driver number from specific session
  static async getDriver(driverNumber: number, sessionKey?: number): Promise<Driver | null> {
    return getCachedOrFetch(`driver-${driverNumber}-${sessionKey || 'latest'}`, async () => {
      try {
        let url = `/drivers?driver_number=${driverNumber}`
        if (sessionKey) {
          url += `&session_key=${sessionKey}`
        }
        
        const response = await api.get(url)
        return response.data[0] || null
      } catch (error) {
        console.error('Error fetching driver:', error)
        throw new Error('Failed to fetch driver data')
      }
    })
  }

  // Get recent sessions (limit to prevent too many results)
  static async getSessions(limit: number = 50): Promise<Session[]> {
    return getCachedOrFetch(`sessions-recent-${limit}`, async () => {
      try {
        const response = await api.get(`/sessions?limit=${limit}`)
        return response.data
      } catch (error) {
        console.error('Error fetching sessions:', error)
        throw new Error('Failed to fetch sessions data')
      }
    })
  }

  // Get recent meetings
  static async getMeetings(limit: number = 25): Promise<Meeting[]> {
    return getCachedOrFetch(`meetings-recent-${limit}`, async () => {
      try {
        const response = await api.get(`/meetings?limit=${limit}`)
        return response.data
      } catch (error) {
        console.error('Error fetching meetings:', error)
        throw new Error('Failed to fetch meetings data')
      }
    })
  }

  // Get meetings by specific year
  static async getMeetingsByYear(year: number): Promise<Meeting[]> {
    return getCachedOrFetch(`meetings-year-${year}`, async () => {
      try {
        const response = await rateLimitedApiCall(() => api.get(`/meetings?year=${year}`))
        return response.data
      } catch (error) {
        console.error(`Error fetching meetings for year ${year}:`, error)
        throw new Error(`Failed to fetch meetings data for year ${year}`)
      }
    })
  }

  // Get sessions by meeting key
  static async getSessionsByMeeting(meetingKey: number): Promise<Session[]> {
    return getCachedOrFetch(`sessions-meeting-${meetingKey}`, async () => {
      try {
        const response = await rateLimitedApiCall(() => api.get(`/sessions?meeting_key=${meetingKey}`))
        return response.data
      } catch (error) {
        console.error(`Error fetching sessions for meeting ${meetingKey}:`, error)
        throw new Error(`Failed to fetch sessions data for meeting ${meetingKey}`)
      }
    })
  }

  // Get circuit information from recent meetings
  static async getCircuits(): Promise<Circuit[]> {
    return getCachedOrFetch('circuits-recent', async () => {
      try {
        const meetings = await this.getMeetings(25)
        const uniqueCircuits = new Map()

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

  // Get positions for a specific session
  static async getPositions(sessionKey: number): Promise<Position[]> {
    return getCachedOrFetch(`positions-${sessionKey}`, async () => {
      try {
        const response = await api.get(`/position?session_key=${sessionKey}`)
        return response.data
      } catch (error) {
        console.error('Error fetching positions:', error)
        throw new Error('Failed to fetch positions data')
      }
    })
  }

  // Get lap times for performance analysis
  static async getLapTimes(sessionKey: number, driverNumber?: number): Promise<LapTime[]> {
    return getCachedOrFetch(`laps-${sessionKey}-${driverNumber || 'all'}`, async () => {
      try {
        let url = `/laps?session_key=${sessionKey}`
        if (driverNumber) {
          url += `&driver_number=${driverNumber}`
        }
        const response = await api.get(url)
        return response.data
      } catch (error) {
        console.error('Error fetching lap times:', error)
        throw new Error('Failed to fetch lap times data')
      }
    })
  }

  // Get latest session
  static async getLatestSession(): Promise<Session | null> {
    return this.getLatestAvailableSession()
  }

  // Helper method to get season statistics for a specific year or current season
  static async getSeasonStats(year?: number) {
    const targetYear = year || 2025 // Default to 2025 season
    const cacheKey = `season-stats-${targetYear}`
    
    return getCachedOrFetch(cacheKey, async () => {
      try {
        // Get data for specific year
        const meetings = await this.getMeetingsByYear(targetYear)
        
        if (meetings.length === 0) {
          throw new Error(`No meetings found for year ${targetYear}`)
        }

        // Get drivers from the specific year
        const drivers = await this.getDrivers(undefined, targetYear)
        
        // OPTIMIZATION: Create circuits from meetings data instead of separate API call
        const circuits = meetings.map(meeting => ({
          circuit_key: meeting.circuit_key,
          circuit_short_name: meeting.circuit_short_name,
          circuit_name: meeting.meeting_official_name,
          country_code: meeting.country_code,
          country_name: meeting.country_name,
          location: meeting.location,
          date_start: meeting.date_start,
          gmt_offset: meeting.gmt_offset,
          meeting_key: meeting.meeting_key,
        })).filter((circuit, index, self) =>
          index === self.findIndex(c => c.circuit_key === circuit.circuit_key)
        )

        const now = new Date()
        const completedRaces = meetings.filter(meeting =>
          new Date(meeting.date_start) < now
        ).length

        // OPTIMIZATION: Skip session fetching to avoid rate limiting
        // Most dashboard functionality doesn't need detailed session data
        const sessions: any[] = []
        
        // If sessions are absolutely needed, fetch them sequentially to avoid rate limits
        // Commented out to prevent 429 errors - uncomment if sessions are truly needed
        // for (const meeting of meetings.slice(0, 3)) { // Limit to first 3 meetings
        //   try {
        //     const meetingSessions = await this.getSessionsByMeeting(meeting.meeting_key)
        //     sessions.push(...meetingSessions)
        //     // Add delay between requests to respect rate limits
        //     await new Promise(resolve => setTimeout(resolve, 400))
        //   } catch (error) {
        //     console.warn(`Failed to fetch sessions for meeting ${meeting.meeting_key}:`, error)
        //   }
        // }

        return {
          totalRaces: meetings.length,
          completedRaces,
          upcomingRaces: meetings.length - completedRaces,
          totalDrivers: drivers.length,
          totalConstructors: new Set(drivers.map(d => d.team_name)).size,
          currentYear: targetYear,
          meetings,
          drivers,
          circuits,
          sessions
        }
      } catch (error) {
        console.error(`Error fetching season stats for year ${targetYear}:`, error)
        throw new Error(`Failed to fetch season statistics for year ${targetYear}`)
      }
    })
  }
}

export default OpenF1Service