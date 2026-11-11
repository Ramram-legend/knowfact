import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import FicheList from './pages/FicheList'
import FicheDetail from './pages/FicheDetail'
import FicheCreate from './pages/FicheCreate'
import FicheEdit from './pages/FicheEdit'
import Search from './pages/Search'
import Admin from './pages/Admin'
import MyPropositions from './pages/MyPropositions'
import PendingReviews from './pages/PendingReviews'
import ImprovementReview from './pages/ImprovementReview'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — all wrapped in sidebar Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/fiches" element={<FicheList />} />
            <Route path="/fiches/new" element={<FicheCreate />} />
            <Route path="/fiches/:id" element={<FicheDetail />} />
            <Route path="/fiches/:id/edit" element={<FicheEdit />} />
            <Route path="/search" element={<Search />} />
            <Route path="/propositions" element={<MyPropositions />} />
            <Route path="/fiches/improvements/pending" element={<PendingReviews />} />
            <Route path="/fiches/improvements/:versionId/review" element={<ImprovementReview />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
