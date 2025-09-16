import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Trophy, Calendar, MapPin, Clock, TrendingUp } from 'lucide-react'
import OpenF1Service from '../services/openf1'
import type { Driver, Circuit, DashboardStats, ConstructorStandingsEntry } from '../types'

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [constructors, setConstructors] = useState<ConstructorStandingsEntry[]>([])
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [loading, setLoading] = useState(true)
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'drivers' | 'constructors'>('drivers')

  useEffect(() => {
    const fetchBasicData = async () => {
      try {
        setLoading(true)
        
        // First, get basic season info (meetings) quickly
        const meetings = await OpenF1Service.getMeetingsByYear(2025)
        const basicDrivers = await OpenF1Service.getDrivers(undefined, 2025)
        
        // Set basic stats immediately
        const now = new Date()
        const completedRaces = meetings.filter(meeting =>
          new Date(meeting.date_start) < now
        ).length
        
        setStats({
          totalRaces: meetings.length,
          completedRaces,
          upcomingRaces: meetings.length - completedRaces,
          totalDrivers: basicDrivers.length,
          totalConstructors: new Set(basicDrivers.map(d => d.team_name)).size,
          currentYear: 2025
        })
        
        // Set basic drivers (without points initially)
        setDrivers(basicDrivers.map(driver => ({ ...driver, points: 0 })))
        
        // Set circuits
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
        setCircuits(circuits)
        
        setLoading(false)
        
        // Now calculate standings in the background
        setStandingsLoading(true)
        try {
          const standingsData = await OpenF1Service.calculateStandings(2025)
          
          console.log('Standings calculated:', {
            totalRaces: standingsData.totalRaces,
            completedRaces: standingsData.completedRaces,
            upcomingRaces: standingsData.upcomingRaces,
            driversCount: standingsData.drivers?.length,
            constructorsCount: standingsData.constructors?.length,
            lastUpdated: standingsData.lastUpdated
          })
          
          // Update with calculated standings
          setStats(prev => ({
            ...prev!,
            totalRaces: standingsData.totalRaces,
            completedRaces: standingsData.completedRaces,
            upcomingRaces: standingsData.upcomingRaces,
            lastUpdated: standingsData.lastUpdated
          }))
          setDrivers(standingsData.drivers)
          setConstructors(standingsData.constructors || [])
        } catch (standingsError) {
          console.error('Error calculating standings:', standingsError)
          // Keep the basic data, just show error for standings
        } finally {
          setStandingsLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        setLoading(false)
      }
    }

    fetchBasicData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error Loading Data</h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Races',
      value: stats?.totalRaces || 0,
      icon: Calendar,
      description: `${stats?.currentYear || new Date().getFullYear()} Season`,
      color: 'bg-blue-900/20 border-blue-800'
    },
    {
      title: 'Completed Races',
      value: stats?.completedRaces || 0,
      icon: Trophy,
      description: 'Races finished',
      color: 'bg-green-900/20 border-green-800'
    },
    {
      title: 'Upcoming Races',
      value: stats?.upcomingRaces || 0,
      icon: Clock,
      description: 'Remaining races',
      color: 'bg-yellow-900/20 border-yellow-800'
    },
    {
      title: 'Active Drivers',
      value: stats?.totalDrivers || 0,
      icon: Users,
      description: 'Current season',
      color: 'bg-f1-red/20 border-f1-red'
    }
  ]

  // Use the properly calculated constructor standings from the API
  const constructorStandings = constructors

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Formula 1 Wiki</h1>
        <p className="text-f1-gray-300 text-lg">{stats?.currentYear || new Date().getFullYear()} Season Dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={`card ${stat.color} hover:scale-105 transition-transform duration-200`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-f1-gray-800 rounded-lg">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-4 w-4 text-f1-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-f1-gray-300 mb-1">{stat.title}</p>
                <p className="text-xs text-f1-gray-400">{stat.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Standings Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              Championship Standings
              {standingsLoading && (
                <div className="ml-3 animate-spin rounded-full h-4 w-4 border-b-2 border-f1-red"></div>
              )}
            </h2>
            {standingsLoading ? (
              <p className="text-xs text-yellow-400 mt-1">
                Calculating current standings...
              </p>
            ) : stats?.lastUpdated ? (
              <p className="text-xs text-f1-gray-400 mt-1">
                Last updated: {new Date(stats.lastUpdated).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-f1-gray-400 mt-1">
                Showing basic driver list (points calculating...)
              </p>
            )}
          </div>
          <div className="flex bg-f1-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'drivers'
                  ? 'bg-f1-red text-white'
                  : 'text-f1-gray-300 hover:text-white'
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setActiveTab('constructors')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'constructors'
                  ? 'bg-f1-red text-white'
                  : 'text-f1-gray-300 hover:text-white'
              }`}
            >
              Constructors
            </button>
          </div>
        </div>

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-f1-gray-700">
              <thead className="bg-f1-gray-800">
                <tr>
                  <th className="table-header">Position</th>
                  <th className="table-header">Driver</th>
                  <th className="table-header">Team</th>
                  <th className="table-header">Number</th>
                  <th className="table-header">Points</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-f1-gray-900 divide-y divide-f1-gray-700">
                {drivers.map((driver, index) => (
                  <tr key={driver.driver_number} className="hover:bg-f1-gray-800">
                    <td className="table-cell text-f1-gray-300 font-bold">
                      #{index + 1}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-f1-gray-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {driver.name_acronym}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {driver.full_name}
                          </div>
                          <div className="text-sm text-f1-gray-400">
                            {driver.broadcast_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: `#${driver.team_colour}` }}
                        ></div>
                        <span className="text-sm text-white">{driver.team_name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-f1-gray-300">
                      #{driver.driver_number}
                    </td>
                    <td className="table-cell text-f1-gray-300">
                      <div className="flex items-center space-x-2">
                        <span>{driver.points || 0} pts</span>
                        {(driver as any).wins > 0 && (
                          <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                            {(driver as any).wins} wins
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Link
                        to={`/driver/${driver.driver_number}`}
                        className="text-f1-red hover:text-f1-red-dark font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Constructors Tab */}
        {activeTab === 'constructors' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-f1-gray-700">
              <thead className="bg-f1-gray-800">
                <tr>
                  <th className="table-header">Position</th>
                  <th className="table-header">Constructor</th>
                  <th className="table-header">Drivers</th>
                  <th className="table-header">Points</th>
                </tr>
              </thead>
              <tbody className="bg-f1-gray-900 divide-y divide-f1-gray-700">
                {constructorStandings.map((constructor, index) => (
                  <tr key={constructor.name} className="hover:bg-f1-gray-800">
                    <td className="table-cell text-f1-gray-300 font-bold">
                      #{index + 1}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div
                          className="h-4 w-4 rounded-full mr-3"
                          style={{ backgroundColor: `#${constructor.colour}` }}
                        ></div>
                        <span className="text-sm font-medium text-white">
                          {constructor.name}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col space-y-1">
                        {constructor.drivers.map((driver: Driver) => (
                          <span key={driver.driver_number} className="text-sm text-f1-gray-300">
                            {driver.full_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-cell text-f1-gray-300">
                      <div className="flex items-center space-x-2">
                        <span>{constructor.points || 0} pts</span>
                        {constructor.wins > 0 && (
                          <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                            {constructor.wins} wins
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Circuits Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <MapPin className="h-6 w-6 mr-2 text-f1-red" />
            {stats?.currentYear || new Date().getFullYear()} Season Circuits
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {circuits.slice(0, 6).map((circuit) => (
            <Link
              key={circuit.circuit_key}
              to={`/circuit/${circuit.circuit_key}`}
              className="bg-f1-gray-800 hover:bg-f1-gray-700 rounded-lg p-4 transition-colors duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-white">{circuit.circuit_short_name}</h3>
                <span className="text-xs text-f1-gray-400">{circuit.country_code}</span>
              </div>
              <p className="text-sm text-f1-gray-300 mb-2">{circuit.location}</p>
              {circuit.date_start && (
                <p className="text-xs text-f1-gray-400">
                  {new Date(circuit.date_start).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard