import { getCachedOrFetch } from './api/cache'
import { getRaceSessionsByYear } from './api/sessions'
import { getDrivers } from './api/drivers'
import { getPositions } from './api/positions'
import type { Driver, ConstructorStandingsEntry } from '../types'

/**
 * Championship standings calculation module
 * This module handles the complex calculation of driver and constructor championships
 * Uses real race results and F1 points system to determine standings
 */

/**
 * F1 Points system for race positions
 * Points awarded: 1st=25, 2nd=18, 3rd=15, 4th=12, 5th=10, 6th=8, 7th=6, 8th=4, 9th=2, 10th=1
 * Based on the current Formula 1 points system
 */
export const F1_POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

/**
 * Standings calculation result interface
 * Contains both driver and constructor standings with metadata
 */
interface StandingsResult {
  drivers: Driver[]
  constructors: ConstructorStandingsEntry[]
  totalRaces: number
  completedRaces: number
  upcomingRaces: number
  lastUpdated: string
}

/**
 * Calculate complete championship standings for a specific year
 * This is the main function that processes all race results and calculates points
 * 
 * @param year - Year to calculate standings for (default: 2025)
 * @returns Promise<StandingsResult> - Complete standings data
 */
export const calculateStandings = async (year: number = 2025): Promise<StandingsResult> => {
  const cacheKey = `calculated-standings-${year}`
  
  return getCachedOrFetch(cacheKey, async () => {
    try {
      console.log(`Calculating standings for ${year} season...`)
      
      // Step 1: Get all race sessions for the year
      const raceSessions = await getRaceSessionsByYear(year)
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
      const allDrivers = await getDrivers(undefined, year)
      console.log(`Found ${allDrivers.length} drivers for ${year} season`)

      // Step 4: Initialize points and wins tracking
      const driverPoints = new Map<number, number>()
      const constructorPoints = new Map<string, number>()
      const driverWins = new Map<number, number>()
      const constructorWins = new Map<string, number>()

      // Initialize all drivers and constructors with 0 points
      allDrivers.forEach(driver => {
        driverPoints.set(driver.driver_number, 0)
        constructorPoints.set(driver.team_name, constructorPoints.get(driver.team_name) || 0)
        driverWins.set(driver.driver_number, 0)
        constructorWins.set(driver.team_name, constructorWins.get(driver.team_name) || 0)
      })

      // Step 5: Process each completed race to calculate points
      for (const raceSession of completedRaces) {
        console.log(`Processing race: ${raceSession.session_name} at ${raceSession.location}`)
        
        try {
          // Add delay between API calls to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 400))
          
          // Get final positions for this race
          const positions = await getPositions(raceSession.session_key)
          
          if (positions.length === 0) {
            console.warn(`No positions found for race session ${raceSession.session_key}`)
            continue
          }

          // Sort positions by finishing order and assign points
          const sortedPositions = positions
            .filter((pos: any) => pos.position > 0) // Only valid finishing positions
            .sort((a: any, b: any) => a.position - b.position)

          sortedPositions.forEach((pos: any, index: number) => {
            const driver = allDrivers.find(d => d.driver_number === pos.driver_number)
            if (!driver) return

            // Award points according to F1 system (top 10 only)
            const points = F1_POINTS_SYSTEM[index] || 0
            if (points > 0) {
              // Add points to driver
              driverPoints.set(pos.driver_number,
                (driverPoints.get(pos.driver_number) || 0) + points)
              
              // Add points to constructor
              constructorPoints.set(driver.team_name,
                (constructorPoints.get(driver.team_name) || 0) + points)
            }

            // Track race wins (1st place finishes)
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

      // Step 6: Create sorted driver standings
      const driverStandings = allDrivers.map(driver => ({
        ...driver,
        points: driverPoints.get(driver.driver_number) || 0,
        wins: driverWins.get(driver.driver_number) || 0,
      })).sort((a, b) => {
        // Sort by points descending, then by wins as tiebreaker
        if (b.points !== a.points) return b.points - a.points
        return b.wins - a.wins
      })

      // Step 7: Create sorted constructor standings
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

/**
 * Get current driver championship leader
 * Returns the driver with the most points in the current standings
 * 
 * @param year - Year to get leader for (default: 2025)
 * @returns Promise<Driver | null> - Championship leader or null if no data
 */
export const getChampionshipLeader = async (year: number = 2025): Promise<Driver | null> => {
  try {
    const standings = await calculateStandings(year)
    return standings.drivers[0] || null
  } catch (error) {
    console.error('Error getting championship leader:', error)
    return null
  }
}

/**
 * Get current constructor championship leader
 * Returns the constructor with the most points in the current standings
 * 
 * @param year - Year to get leader for (default: 2025)
 * @returns Promise<ConstructorStandingsEntry | null> - Constructor leader or null if no data
 */
export const getConstructorLeader = async (year: number = 2025): Promise<ConstructorStandingsEntry | null> => {
  try {
    const standings = await calculateStandings(year)
    return standings.constructors[0] || null
  } catch (error) {
    console.error('Error getting constructor leader:', error)
    return null
  }
}