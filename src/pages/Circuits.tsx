import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, ArrowRight, Clock } from 'lucide-react'
import OpenF1Service from '../services/openf1'
import type { Circuit } from '../types'

const Circuits = () => {
  const [circuits, setCircuits] = useState<Circuit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCircuits = async () => {
      try {
        setLoading(true)
        const seasonData = await OpenF1Service.getSeasonStats(2025)
        setCircuits(seasonData.circuits)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load circuits data')
      } finally {
        setLoading(false)
      }
    }

    fetchCircuits()
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

  const now = new Date()
  const sortedCircuits = circuits.sort((a, b) => {
    if (!a.date_start || !b.date_start) return 0
    return new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
          <MapPin className="h-8 w-8 mr-3 text-f1-red" />
          F1 Circuits 2025
        </h1>
        <p className="text-f1-gray-300 text-lg">Complete calendar and circuit information</p>
      </div>

      {/* Circuits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCircuits.map((circuit, index) => {
          const raceDate = circuit.date_start ? new Date(circuit.date_start) : null
          const isCompleted = raceDate && raceDate < now
          const isUpcoming = raceDate && raceDate > now
          
          return (
            <Link
              key={circuit.circuit_key}
              to={`/circuit/${circuit.circuit_key}`}
              className="card hover:scale-105 transition-transform duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-f1-gray-800 rounded-lg p-2 mr-3">
                    <MapPin className="h-5 w-5 text-f1-red" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{circuit.circuit_short_name}</h3>
                    <p className="text-f1-gray-400 text-sm">{circuit.country_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-white">#{index + 1}</div>
                  <div className="text-xs text-f1-gray-400">Round</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-f1-gray-300 font-medium mb-1">{circuit.location}</h4>
                <p className="text-f1-gray-400 text-sm">{circuit.country_name}</p>
              </div>

              {raceDate && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-f1-gray-400 mr-2" />
                    <span className="text-f1-gray-300 text-sm">
                      {raceDate.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {isCompleted && (
                      <span className="text-xs bg-green-600 text-green-100 px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              )}

              {circuit.gmt_offset && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-f1-gray-400 mr-2" />
                    <span className="text-f1-gray-400 text-sm">GMT {circuit.gmt_offset}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-f1-gray-400 text-sm">View Details</span>
                <ArrowRight className="h-4 w-4 text-f1-gray-400 group-hover:text-f1-red transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default Circuits