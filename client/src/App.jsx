import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import MapPage from './pages/MapPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/mapa" element={<MapPage />} />
    </Routes>
  )
}

export default App
