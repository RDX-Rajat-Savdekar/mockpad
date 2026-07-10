import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Room from './pages/Room'

/** Normalize trailing slashes so shared links always hit the same room. */
function RoomRedirect() {
  const { roomId } = useParams()
  const { search } = useLocation()
  return <Navigate to={`/room/${roomId}${search}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/room/:roomId/" element={<RoomRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
