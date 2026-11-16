import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage       from './pages/HomePage'
import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import CataloguePage  from './pages/CataloguePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage       from './pages/CartPage'
import CheckoutPage   from './pages/CheckoutPage'
import PaymentPage    from './pages/PaymentPage'
import ConfirmationPage from './pages/ConfirmationPage'
import OrdersPage     from './pages/OrdersPage'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/"            element={<HomePage />} />
          <Route path="/login"       element={<LoginPage />} />
          <Route path="/register"    element={<RegisterPage />} />
          <Route path="/catalogue"   element={<CataloguePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart"        element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="/checkout"    element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/payment"     element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="/confirmation/:orderId" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
          <Route path="/orders"      element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="*"            element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
