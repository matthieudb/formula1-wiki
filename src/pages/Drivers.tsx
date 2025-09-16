import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Trophy, ArrowRight } from 'lucide-react'
import OpenF1Service from '../services/openf1'
import type { Driver } from '../types'

const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true)
        const seasonData = await OpenF1Service.getSeasonStats(2025)
        setDrivers(seasonData.drivers)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drivers data')
      } finally {
        setLoading(false)
      }
    }

    fetchDrivers()
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center">
          <Users className="h-8 w-8 mr-3 text-f1-red" />
          F1 Drivers 2025
        </h1>
        <p className="text-f1-gray-300 text-lg">Complete driver standings and information</p>
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver, index) => (
          <Link
            key={driver.driver_number}
            to={`/driver/${driver.driver_number}`}
            className="card hover:scale-105 transition-transform duration-200 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-f1-gray-800 rounded-full w-12 h-12 flex items-center justify-center mr-3">
                  <span className="text-white font-bold">{driver.name_acronym}</span>
                </div>
                <div>
                  <h3 className="text-white font-bold">{driver.full_name}</h3>
                  <p className="text-f1-gray-400 text-sm">#{driver.driver_number}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">#{index + 1}</div>
                <div className="text-sm text-f1-gray-400">Position</div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div
                  className="h-4 w-4 rounded-full mr-2"
                  style={{ backgroundColor: `#${driver.team_colour}` }}
                ></div>
                <span className="text-f1-gray-300 text-sm">{driver.team_name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <span className="text-white font-medium">{driver.points || 0} pts</span>
              </div>
            </div>

            {(driver as any).wins > 0 && (
              <div className="mb-4">
                <span className="text-xs bg-yellow-600 text-yellow-100 px-2 py-1 rounded">
                  {(driver as any).wins} wins
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-f1-gray-400 text-sm">{driver.country_code}</span>
              <ArrowRight className="h-4 w-4 text-f1-gray-400 group-hover:text-f1-red transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Drivers