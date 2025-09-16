import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, Clock, Flag } from 'lucide-react'
import OpenF1Service from '../services/openf1-new'
import type { Circuit, Meeting, Session } from '../types'

const CircuitDetail = () => {
  const { circuitId } = useParams<{ circuitId: string }>()
  const [circuit, setCircuit] = useState<Circuit | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCircuitData = async () => {
      if (!circuitId) return

      try {
        setLoading(true)
        // Get 2025 meetings first, then derive circuits from meetings
        const meetingsData = await OpenF1Service.getMeetingsByYear(2025)
        
        // Create circuits from meetings data to avoid extra API calls
        const circuitsData = meetingsData.map(meeting => ({
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

        const circuitData = circuitsData.find(c => c.circuit_key === parseInt(circuitId))
        if (!circuitData) {
          setError('Circuit not found')
          return
        }

        const circuitMeetings = meetingsData.filter(m => m.circuit_key === parseInt(circuitId))
        
        setCircuit(circuitData)
        setMeetings(circuitMeetings)
        
        // Only fetch sessions if we have meetings for this circuit
        if (circuitMeetings.length > 0) {
          try {
            // Get sessions for this circuit's meetings sequentially to avoid rate limits
            const allSessions: any[] = []
            for (const meeting of circuitMeetings) {
              try {
                const sessions = await OpenF1Service.getSessionsByMeeting(meeting.meeting_key)
                allSessions.push(...sessions)
                // Add small delay between requests
                await new Promise(resolve => setTimeout(resolve, 400))
              } catch (error) {
                console.warn('Failed to fetch sessions for a meeting:', error)
              }
            }
            
            setSessions(allSessions)
          } catch (error) {
            console.warn('Could not fetch session data for circuit:', error)
            setSessions([])
          }
        } else {
          setSessions([])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load circuit data')
      } finally {
        setLoading(false)
      }
    }

    fetchCircuitData()
  }, [circuitId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-f1-red"></div>
      </div>
    )
  }

  if (error || !circuit) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error Loading Circuit</h3>
          <p className="text-red-300">{error || 'Circuit not found'}</p>
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

  const stats = [
    {
      title: 'Circuit Length',
      value: 'N/A', // This would come from additional circuit data
      icon: Flag,
      color: 'bg-f1-red/20 border-f1-red'
    },
    {
      title: 'Total Meetings',
      value: meetings.length,
      icon: Calendar,
      color: 'bg-blue-900/20 border-blue-800'
    },
    {
      title: 'Total Sessions',
      value: sessions.length,
      icon: Clock,
      color: 'bg-green-900/20 border-green-800'
    },
    {
      title: 'Location',
      value: circuit.country_name,
      icon: MapPin,
      color: 'bg-yellow-900/20 border-yellow-800'
    }
  ]

  // Group sessions by meeting
  const sessionsByMeeting = sessions.reduce((acc, session) => {
    if (!acc[session.meeting_key]) {
      acc[session.meeting_key] = []
    }
    acc[session.meeting_key].push(session)
    return acc
  }, {} as Record<number, Session[]>)

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
            <h1 className="text-3xl font-bold text-white">{circuit.circuit_name}</h1>
            <p className="text-f1-gray-300">{circuit.circuit_short_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-f1-gray-800 px-4 py-2 rounded-lg">
          <MapPin className="h-4 w-4 text-f1-red" />
          <span className="text-white">{circuit.country_code}</span>
        </div>
      </div>

      {/* Circuit Info Card */}
      <div className="card">
        <h2 className="text-2xl font-bold text-white mb-6">Circuit Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Circuit Name</label>
            <p className="text-white font-medium">{circuit.circuit_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Short Name</label>
            <p className="text-white font-medium">{circuit.circuit_short_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Location</label>
            <p className="text-white font-medium">{circuit.location}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-f1-gray-400">Country</label>
            <p className="text-white font-medium">{circuit.country_name} ({circuit.country_code})</p>
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

      {/* Track Layout Placeholder */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-6">Track Layout</h3>
        <div className="bg-f1-gray-800 rounded-lg p-8 text-center">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-f1-gray-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-f1-gray-300 mb-2">Track Layout</h4>
              <p className="text-f1-gray-400">
                Track layout visualization would be displayed here with detailed circuit information.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings and Sessions */}
      {meetings.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-6">2025 Season Events</h3>
          <div className="space-y-6">
            {meetings.map((meeting) => {
              const meetingSessions = sessionsByMeeting[meeting.meeting_key] || []
              return (
                <div
                  key={meeting.meeting_key}
                  className="bg-f1-gray-800 rounded-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">{meeting.meeting_name}</h4>
                      <p className="text-f1-gray-300">{meeting.meeting_official_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-f1-gray-300">
                        {new Date(meeting.date_start).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-f1-gray-400">
                        GMT {meeting.gmt_offset}
                      </p>
                    </div>
                  </div>

                  {meetingSessions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-f1-gray-400 mb-3">Sessions:</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {meetingSessions.map((session) => (
                          <div
                            key={session.session_key}
                            className="bg-f1-gray-700 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                {session.session_name}
                              </span>
                              <span className="text-xs text-f1-gray-400">
                                {session.session_type}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-f1-gray-300">
                              <p>Start: {new Date(session.date_start).toLocaleString()}</p>
                              <p>End: {new Date(session.date_end).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Circuit History Placeholder */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-6">Circuit History</h3>
        <div className="bg-f1-gray-800 rounded-lg p-6">
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-f1-gray-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-f1-gray-300 mb-2">Historical Data</h4>
            <p className="text-f1-gray-400">
              Circuit history, lap records, and past race results would be displayed here.
            </p>
          </div>
        </div>
      </div>

      {/* No Events Message */}
      {meetings.length === 0 && (
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-f1-gray-300 mb-2">No Events Scheduled</h3>
          <p className="text-f1-gray-400">
            No events are currently scheduled for this circuit in the 2025 season.
          </p>
        </div>
      )}
    </div>
  )
}

export default CircuitDetail