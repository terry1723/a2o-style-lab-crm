import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Experience from './pages/Experience'
import Booking from './pages/Booking'
import CrmLogin from './pages/CrmLogin'
import CrmStylingPool from './pages/CrmStylingPool'
import CrmDashboard from './pages/CrmDashboard'
import Portal from './pages/Portal'
import PortalStaff from './pages/PortalStaff'
import PublicProducts from './pages/PublicProducts'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/experience" element={<Experience />} />
      <Route path="/products" element={<PublicProducts />} />
      <Route path="/products/:productId" element={<PublicProducts />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/crm/login" element={<CrmLogin />} />
      <Route path="/crm/styling-pool" element={<CrmStylingPool />} />
      <Route path="/crm/dashboard" element={<CrmDashboard />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="/portal/staff" element={<PortalStaff />} />
    </Routes>
  )
}
