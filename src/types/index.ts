// Driver types
export interface Driver {
  driver_number: number
  broadcast_name: string
  full_name: string
  name_acronym: string
  team_name: string
  team_colour: string
  first_name: string
  last_name: string
  headshot_url?: string
  country_code: string
  session_key?: number
  meeting_key?: number
}

// Constructor/Team types
export interface Constructor {
  name: string
  full_name: string
  colour: string
  logo_url?: string
  points?: number
  position?: number
}

// Circuit types
export interface Circuit {
  circuit_key: number
  circuit_short_name: string
  circuit_name: string
  country_code: string
  country_name: string
  location: string
  date_start?: string
  date_end?: string
  gmt_offset?: string
  meeting_key?: number
}

// Session types
export interface Session {
  session_key: number
  session_name: string
  session_type: string
  date_start: string
  date_end: string
  gmt_offset: string
  meeting_key: number
  location: string
  country_code: string
  country_name: string
  circuit_key: number
  circuit_short_name: string
  year: number
}

// Meeting types
export interface Meeting {
  meeting_key: number
  meeting_name: string
  meeting_official_name: string
  location: string
  country_code: string
  country_name: string
  circuit_key: number
  circuit_short_name: string
  date_start: string
  gmt_offset: string
  year: number
}

// Position data for real-time tracking
export interface Position {
  date: string
  driver_number: number
  meeting_key: number
  session_key: number
  position: number
}

// Lap time data for performance analysis
export interface LapTime {
  date_start: string
  driver_number: number
  duration_sector_1?: number
  duration_sector_2?: number
  duration_sector_3?: number
  i1_speed?: number
  i2_speed?: number
  is_pit_out_lap: boolean
  lap_duration?: number
  lap_number: number
  meeting_key: number
  session_key: number
  st_speed?: number
}

// API Response types
export interface ApiResponse<T> {
  data: T[]
  status: 'success' | 'error'
  message?: string
}

// Dashboard statistics
export interface DashboardStats {
  totalRaces: number
  completedRaces: number
  upcomingRaces: number
  totalDrivers: number
  totalConstructors: number
  currentYear?: number
}

// Standings data
export interface DriverStanding {
  driver: Driver
  points: number
  position: number
  wins: number
  podiums: number
}

export interface ConstructorStanding {
  constructor: Constructor
  points: number
  position: number
  wins: number
  podiums: number
}