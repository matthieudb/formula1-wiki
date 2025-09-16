import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Drivers from './pages/Drivers'
import Circuits from './pages/Circuits'
import DriverDetail from './pages/DriverDetail'
import CircuitDetail from './pages/CircuitDetail'

function App() {
  return (
    <div className="min-h-screen bg-f1-gray-950">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/drivers" element={<Drivers />} />
          <Route path="/circuits" element={<Circuits />} />
          <Route path="/driver/:driverId" element={<DriverDetail />} />
          <Route path="/circuit/:circuitId" element={<CircuitDetail />} />
        </Routes>
      </Layout>
    </div>
  )
}

export default App