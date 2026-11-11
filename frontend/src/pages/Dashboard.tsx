import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, Clock, Edit3, PlusCircle, TrendingUp, AlertCircle } from 'lucide-react'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import type { DashboardStats } from '../types'
import FicheCard from '../components/FicheCard'
import StatusBadge from '../components/StatusBadge'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setError('')
      setLoading(true)
      const data = await fichesApi.getDashboardStats()
      setStats(data)
    } catch (err: any) {
      setError('Impossible de charger les données du tableau de bord. Le serveur backend (port 8000) est peut-être temporairement inaccessible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user?.role, user?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 my-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur de chargement</h3>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Here's what's happening in your knowledge base.
          </p>
        </div>
        <Link to="/fiches/new" className="btn-primary hidden sm:inline-flex">
          <PlusCircle className="h-4 w-4" />
          New Fiche
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Fiches"
          value={stats?.total_fiches ?? 0}
          icon={<FileText className="h-6 w-6 text-primary-700" />}
          color="bg-primary-100"
        />
        <StatCard
          label="Published"
          value={stats?.published_fiches ?? 0}
          icon={<CheckCircle className="h-6 w-6 text-green-700" />}
          color="bg-green-100"
        />
        <StatCard
          label="Pending Review"
          value={stats?.pending_review ?? 0}
          icon={<Clock className="h-6 w-6 text-amber-700" />}
          color="bg-amber-100"
        />
        <StatCard
          label="My Drafts"
          value={stats?.my_drafts ?? 0}
          icon={<Edit3 className="h-6 w-6 text-slate-600" />}
          color="bg-slate-100"
        />
      </div>

      {/* Quick actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-600" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/fiches/new" className="btn-primary text-xs px-3 py-1.5">
            <PlusCircle className="h-3.5 w-3.5" />
            Create Fiche
          </Link>
          <Link to="/fiches" className="btn-secondary text-xs px-3 py-1.5">
            <FileText className="h-3.5 w-3.5" />
            Browse All
          </Link>
          {(user?.role === 'expert' || user?.role === 'admin') && (
            <Link
              to="/fiches?status=submitted"
              className="btn-amber text-xs px-3 py-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              Review Queue
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn-secondary text-xs px-3 py-1.5">
              Manage Users
            </Link>
          )}
        </div>
      </div>

      {/* Recent fiches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Fiches</h2>
          <Link to="/fiches" className="text-sm text-primary-600 hover:underline font-medium">
            View all →
          </Link>
        </div>

        {!stats?.recent_fiches?.length ? (
          <div className="card text-center py-12 text-gray-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No fiches yet. Create your first one!</p>
            <Link to="/fiches/new" className="btn-primary mt-4 inline-flex mx-auto">
              <PlusCircle className="h-4 w-4" />
              Create Fiche
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recent_fiches.map((fiche) => (
              <FicheCard key={fiche.id} fiche={fiche} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
