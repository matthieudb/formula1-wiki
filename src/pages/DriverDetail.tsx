import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Trophy, Calendar, Clock, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import OpenF1Service from '../services/openf1-new'
import type { Driver, LapTime, Session } from '../types'

const DriverDetail = () => {
  const { driverId } = useParams<{ driverId: string }>()
  const [driver, setDriver] = useState<Driver | null>(null)
  const [lapTimes, setLapTimes] = useState<LapTime[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDriverData = async () => {
      if (!driverId) return

      try {
        setLoading(true)
        // Get 2025 meetings first, then get sessions from latest meeting
        const [driverData, meetings] = await Promise.all([
          OpenF1Service.getDriver(parseInt(driverId)),
          OpenF1Service.getMeetingsByYear(2025)
        ])

        if (!driverData) {
          setError('Driver not found')
          return
        }

        setDriver(driverData)

        // Get sessions from the latest completed meeting for this driver
        if (meetings.length > 0) {
          // Find latest completed meeting
          const now = new Date()
          const completedMeetings = meetings.filter(m => new Date(m.date_start) < now)
          
          if (completedMeetings.length > 0) {
            const latestMeeting = completedMeetings[completedMeetings.length - 1]
            
            try {
              // Get sessions from latest meeting
              const meetingSessions = await OpenF1Service.getSessionsByMeeting(latestMeeting.meeting_key)
              setSessions(meetingSessions)
              
              // Get lap times from the latest session of that meeting
              if (meetingSessions.length > 0) {
                const latestSession = meetingSessions[meetingSessions.length - 1]
                const lapTimesData = await OpenF1Service.getLapTimes(
                  latestSession.session_key,
                  parseInt(driverId)
                )
                setLapTimes(lapTimesData)
              }
            } catch (error) {
              console.warn('Could not fetch detailed session data for driver:', error)
              // Set empty data to avoid showing zeros
              setSessions([])
              setLapTimes([])
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load driver data')
      } finally {
        setLoading(false)
      }
    }

    fetchDriverData()
  }, [driverId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error Loading Driver</h3>
          <p className="text-red-300">{error || 'Driver not found'}</p>
          <Link
            to="/"
            className="inline-flex items-center mt-4 text-f1-red hover:text-f1-red-dark"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Process lap times for charts
  const lapTimeChartData = lapTimes
    .filter(lap => lap.lap_duration)
    .map(lap => ({
      lap: lap.lap_number,
      time: lap.lap_duration ? lap.lap_duration / 1000 : 0, // Convert to seconds
      sector1: lap.duration_sector_1 ? lap.duration_sector_1 / 1000 : 0,
      sector2: lap.duration_sector_2 ? lap.duration_sector_2 / 1000 : 0,
      sector3: lap.duration_sector_3 ? lap.duration_sector_3 / 1000 : 0,
    }))
    .slice(0, 20) // Show only first 20 laps for better visualization

  const speedData = lapTimes
    .filter(lap => lap.i1_speed || lap.i2_speed || lap.st_speed)
    .map(lap => ({
      lap: lap.lap_number,
      i1_speed: lap.i1_speed || 0,
      i2_speed: lap.i2_speed || 0,
      st_speed: lap.st_speed || 0,
    }))
    .slice(0, 20)

  const stats = [
    {
      title: 'Driver Number',
      value: `#${driver.driver_number}`,
      icon: Trophy,
      color: 'bg-f1-red/20 border-f1-red'
    },
    {
      title: 'Sessions Completed',
      value: sessions.length,
      icon: Calendar,
      color: 'bg-blue-900/20 border-blue-800'
    },
    {
      title: 'Total Laps',
      value: lapTimes.length,
      icon: Clock,
      color: 'bg-green-900/20 border-green-800'
    },
    {
      title: 'Best Lap Time',
      value: lapTimes.length > 0 
        ? `${Math.min(...lapTimes.filter(l => l.lap_duration).map(l => l.lap_duration! / 1000)).toFixed(3)}s`
        : 'N/A',
      icon: TrendingUp,
      color: 'bg-yellow-900/20 border-yellow-800'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2 bg-f1-gray-800 hover:bg-f1-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{driver.full_name}</h1>
            <p className="text-f1-gray-300">{driver.broadcast_name}</p>
          </div>
        </div>
        <div 
          className="h-12 w-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `#${driver.team_colour}` }}
        >
          <span className="text-white font-bold">{driver.name_acronym}</span>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Driver Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Full Name</label>
            <p className="text-white font-medium">{driver.full_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Team</label>
            <div className="flex items-center">
              <div 
                className="h-3 w-3 rounded-full mr-2"
                style={{ backgroundColor: `#${driver.team_colour}` }}
              ></div>
              <p className="text-white font-medium">{driver.team_name}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Country</label>
            <p className="text-white font-medium">{driver.country_code}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Driver Number</label>
            <p className="text-white font-medium">#{driver.driver_number}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
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
              </div>
              <div>
                <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-f1-gray-300">{stat.title}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Performance Analysis */}
      {lapTimeChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lap Times Chart */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-6">Lap Time Analysis</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lapTimeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="lap" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `${value.toFixed(1)}s`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#FFFFFF'
                    }}
                    formatter={(value: any) => [`${value.toFixed(3)}s`, 'Lap Time']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#E10600" 
                    strokeWidth={2}
                    dot={{ fill: '#E10600', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sector Times Chart */}
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-6">Sector Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lapTimeChartData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="lap" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => `${value.toFixed(1)}s`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#FFFFFF'
                    }}
                    formatter={(value: any) => [`${value.toFixed(3)}s`, 'Sector Time']}
                  />
                  <Bar dataKey="sector1" stackId="a" fill="#3B82F6" />
                  <Bar dataKey="sector2" stackId="a" fill="#10B981" />
                  <Bar dataKey="sector3" stackId="a" fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-f1-gray-300">Sector 1</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-f1-gray-300">Sector 2</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
                <span className="text-sm text-f1-gray-300">Sector 3</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Speed Analysis */}
      {speedData.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-6">Speed Analysis</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="lap" 
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${value} km/h`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#FFFFFF'
                  }}
                  formatter={(value: any) => [`${value} km/h`, 'Speed']}
                />
                <Line 
                  type="monotone" 
                  dataKey="i1_speed" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  name="Intermediate 1"
                />
                <Line 
                  type="monotone" 
                  dataKey="i2_speed" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  name="Intermediate 2"
                />
                <Line 
                  type="monotone" 
                  dataKey="st_speed" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                  name="Speed Trap"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-sm text-f1-gray-300">Intermediate 1</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-f1-gray-300">Intermediate 2</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-sm text-f1-gray-300">Speed Trap</span>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {lapTimeChartData.length === 0 && (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-f1-gray-300 mb-2">No Performance Data Available</h3>
          <p className="text-f1-gray-400">
            Performance analysis will be available once session data is recorded for this driver.
          </p>
        </div>
      )}
    </div>
  )
}

export default DriverDetail