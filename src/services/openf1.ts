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

  // Get session results for points calculation
  static async getSessionResults(sessionKey: number): Promise<any[]> {
    return getCachedOrFetch(`session-results-${sessionKey}`, async () => {
      try {
        const response = await rateLimitedApiCall(() =>
          api.get(`/session_result?session_key=${sessionKey}`)
        )
        return response.data
      } catch (error) {
        console.error('Error fetching session results:', error)
        return []
      }
    })
  }

  // Get race sessions for a specific year (only actual Grand Prix races, not sprint races)
  static async getRaceSessionsByYear(year: number): Promise<Session[]> {
    return getCachedOrFetch(`race-sessions-${year}`, async () => {
      try {
        const response = await rateLimitedApiCall(() =>
          api.get(`/sessions?year=${year}`)
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

  // F1 Points system: 1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, 7th=6, 8th=4, 9th=2, 10th=1
  static readonly F1_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

  // Calculate championship standings for a specific year
  static async calculateStandings(year: number = 2025) {
    const cacheKey = `calculated-standings-${year}`
    
    return getCachedOrFetch(cacheKey, async () => {
      try {
        console.log(`Calculating standings for ${year} season...`)
        
        // Step 1: Get all race sessions for the year
        const raceSessions = await this.getRaceSessionsByYear(year)
        console.log(`Found ${raceSessions.length} race sessions for ${year}`)
        
        if (raceSessions.length === 0) {
          throw new Error(`No race sessions found for year ${year}`)
        }

        // Step 2: Determine completed races (date_end < now)
        const now = new Date()
        const completedRaces = raceSessions.filter(session =>
          session.date_end && new Date(session.date_end) < now
        )
        console.log(`Found ${completedRaces.length} completed races out of ${raceSessions.length} total`)

        // Step 3: Get drivers list from latest meeting
        const allDrivers = await this.getDrivers(undefined, year)
        console.log(`Found ${allDrivers.length} drivers for ${year} season`)

        // Step 4: Initialize points tables
        const driverPoints = new Map<number, number>()
        const constructorPoints = new Map<string, number>()
        const driverWins = new Map<number, number>()
        const constructorWins = new Map<string, number>()

        // Initialize all drivers with 0 points
        allDrivers.forEach(driver => {
          driverPoints.set(driver.driver_number, 0)
          constructorPoints.set(driver.team_name, constructorPoints.get(driver.team_name) || 0)
          driverWins.set(driver.driver_number, 0)
          constructorWins.set(driver.team_name, constructorWins.get(driver.team_name) || 0)
        })

        // Step 5: Process each completed race
        for (const raceSession of completedRaces) {
          console.log(`Processing race: ${raceSession.session_name} at ${raceSession.location}`)
          
          try {
            // Add delay between API calls to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 400))
            
            // Get positions for this race
            const positions = await this.getPositions(raceSession.session_key)
            
            if (positions.length === 0) {
              console.warn(`No positions found for race session ${raceSession.session_key}`)
              continue
            }

            // Sort positions by position number and assign points
            const sortedPositions = positions
              .filter(pos => pos.position > 0) // Only valid positions
              .sort((a, b) => a.position - b.position)

            sortedPositions.forEach((pos, index) => {
              const driver = allDrivers.find(d => d.driver_number === pos.driver_number)
              if (!driver) return

              // Award points according to F1 system
              const points = this.F1_POINTS_SYSTEM[index] || 0
              if (points > 0) {
                driverPoints.set(pos.driver_number,
                  (driverPoints.get(pos.driver_number) || 0) + points)
                constructorPoints.set(driver.team_name,
                  (constructorPoints.get(driver.team_name) || 0) + points)
              }

              // Track wins (1st place)
              if (pos.position === 1) {
                driverWins.set(pos.driver_number,
                  (driverWins.get(pos.driver_number) || 0) + 1)
                constructorWins.set(driver.team_name,
                  (constructorWins.get(driver.team_name) || 0) + 1)
              }
            })

            console.log(`Processed ${sortedPositions.length} positions for ${raceSession.location}`)
          } catch (error) {
            console.error(`Error processing race session ${raceSession.session_key}:`, error)
            continue
          }
        }

        // Step 6: Create driver standings
        const driverStandings = allDrivers.map(driver => ({
          ...driver,
          points: driverPoints.get(driver.driver_number) || 0,
          wins: driverWins.get(driver.driver_number) || 0,
        })).sort((a, b) => {
          // Sort by points descending, then by wins as tiebreaker
          if (b.points !== a.points) return b.points - a.points
          return b.wins - a.wins
        })

        // Step 7: Create constructor standings
        const constructorStandings = Array.from(
          new Set(allDrivers.map(d => d.team_name))
        ).map(teamName => {
          const teamDrivers = allDrivers.filter(d => d.team_name === teamName)
          return {
            name: teamName,
            colour: teamDrivers[0]?.team_colour || '000000',
            drivers: teamDrivers,
            points: constructorPoints.get(teamName) || 0,
            wins: constructorWins.get(teamName) || 0,
          }
        }).sort((a, b) => {
          // Sort by points descending, then by wins as tiebreaker
          if (b.points !== a.points) return b.points - a.points
          return b.wins - a.wins
        })

        console.log(`Standings calculation complete:`)
        console.log(`- Driver leader: ${driverStandings[0]?.full_name} (${driverStandings[0]?.points} pts)`)
        console.log(`- Constructor leader: ${constructorStandings[0]?.name} (${constructorStandings[0]?.points} pts)`)

        return {
          drivers: driverStandings,
          constructors: constructorStandings,
          totalRaces: raceSessions.length,
          completedRaces: completedRaces.length,
          upcomingRaces: raceSessions.length - completedRaces.length,
          lastUpdated: new Date().toISOString()
        }

      } catch (error) {
        console.error(`Error calculating standings for year ${year}:`, error)
        throw error
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
        // Use the new standings calculation method
        const standingsData = await this.calculateStandings(targetYear)
        
        // Get meetings for circuits data
        const meetings = await this.getMeetingsByYear(targetYear)
        
        if (meetings.length === 0) {
          throw new Error(`No meetings found for year ${targetYear}`)
        }

        // Create circuits from meetings data
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
          sessions: [],
          lastUpdated: standingsData.lastUpdated
        }
      } catch (error) {
        console.error(`Error fetching season stats for year ${targetYear}:`, error)
        throw new Error(`Failed to fetch season statistics for year ${targetYear}`)
      }
    })
  }
}

export default OpenF1Service