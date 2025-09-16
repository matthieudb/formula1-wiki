import { Link, useLocation } from 'react-router-dom'
import { Trophy, Home, Users, MapPin } from 'lucide-react'

const Navbar = () => {
  const location = useLocation()

  // Get all available navigation items
  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Drivers', href: '/drivers', icon: Users },
    { name: 'Circuits', href: '/circuits', icon: MapPin },
  ]

  // Filter navigation based on current page
  const navigation = allNavigation.filter(item => {
    // Always show Dashboard
    if (item.href === '/') return true
    
    // Don't show Drivers link if we're on a driver page
    if (item.href === '/drivers' && location.pathname.startsWith('/driver')) return false
    
    // Don't show Circuits link if we're on a circuit page
    if (item.href === '/circuits' && location.pathname.startsWith('/circuit')) return false
    
    // Show all other links
    return true
  })

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/'
    if (href === '/drivers') return location.pathname === '/drivers'
    if (href === '/circuits') return location.pathname === '/circuits'
    return false
  }

  return (
    <nav className="bg-f1-gray-900 border-b border-f1-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-f1-red p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Formula 1 Wiki</h1>
                <p className="text-xs text-f1-gray-400">2025 Season</p>
              </div>
            </Link>
          </div>

          {/* Navigation links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-f1-red text-white'
                      : 'text-f1-gray-300 hover:text-white hover:bg-f1-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              className="bg-f1-gray-800 inline-flex items-center justify-center p-2 rounded-md text-f1-gray-400 hover:text-white hover:bg-f1-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-f1-red"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-f1-gray-800">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.href)
                    ? 'bg-f1-red text-white'
                    : 'text-f1-gray-300 hover:text-white hover:bg-f1-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

export default Navbar