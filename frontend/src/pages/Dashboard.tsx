import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, CheckCircle, Clock, Edit3, PlusCircle, TrendingUp, AlertCircle, Building2, Shield, EyeOff, Sparkles, Bot } from 'lucide-react'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentContext'
import type { DashboardStats } from '../types'
import FicheCard from '../components/FicheCard'
import { DashboardSkeleton } from '../components/Skeletons'

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4 hover:border-slate-300 transition-colors">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { departments } = useDepartments()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    try {
      setError('')
      setLoading(true)
      const data = await fichesApi.getDashboardStats()
      setStats(data)
    } catch {
      setError('Impossible de charger les données du tableau de bord. Le serveur backend (port 8000) est peut-être temporairement inaccessible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user?.role, user?.id])

  if (loading) {
    return <DashboardSkeleton />
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
            className="btn-danger"
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bonjour, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vue d'ensemble de votre base de connaissances industrielles.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Link to="/assistant" className="btn-secondary">
            <Bot className="h-4 w-4 text-primary-600" />
            Assistant IA
          </Link>
          {user?.role !== 'operator' && (
            <Link to="/fiches/new" className="btn-primary">
              <PlusCircle className="h-4 w-4" />
              Nouvelle fiche
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total des fiches"
          value={stats?.total_fiches ?? 0}
          icon={<FileText className="h-5 w-5 text-primary-700" />}
          color="bg-primary-50"
        />
        <StatCard
          label="Fiches publiées"
          value={stats?.published_fiches ?? 0}
          icon={<CheckCircle className="h-5 w-5 text-emerald-700" />}
          color="bg-emerald-50"
        />
        <StatCard
          label="En attente de validation"
          value={stats?.pending_review ?? 0}
          icon={<Clock className="h-5 w-5 text-amber-700" />}
          color="bg-amber-50"
        />
        <StatCard
          label="Mes brouillons"
          value={stats?.my_drafts ?? 0}
          icon={<Edit3 className="h-5 w-5 text-slate-600" />}
          color="bg-slate-100"
        />
      </div>

      {/* Indicateurs Éthiques */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3.5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          Engagements Éthiques & Souveraineté
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
            <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">0 donnée personnelle exposée</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">100 % réponses IA sourcées</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3">
            <EyeOff className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">0 surveillance individuelle</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3.5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary-600" />
          Actions rapides
        </h2>
        <div className="flex flex-wrap gap-2">
          {user?.role !== 'operator' && (
            <Link to="/fiches/new" className="btn-primary text-xs px-3 py-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              Créer une fiche
            </Link>
          )}
          <Link to="/fiches" className="btn-secondary text-xs px-3 py-1.5">
            <FileText className="h-3.5 w-3.5" />
            Parcourir tout le catalogue
          </Link>
          {(user?.role === 'expert' || user?.role === 'admin') && (
            <Link
              to="/fiches?status=submitted"
              className="btn-amber text-xs px-3 py-1.5"
            >
              <Clock className="h-3.5 w-3.5" />
              File de validation
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="btn-secondary text-xs px-3 py-1.5">
              Gérer les utilisateurs
            </Link>
          )}
        </div>
      </div>

      {/* Départements de l'usine */}
      {departments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary-600" />
              Départements de l'usine
            </h2>
            {user?.role === 'admin' && (
              <Link to="/admin/departements" className="text-xs text-primary-600 hover:underline font-medium">
                Gérer les départements →
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {departments.map((d) => (
              <Link
                key={d.id}
                to={`/departements/${d.id}`}
                className="card hover:shadow-md hover:border-primary-300/80 active:scale-[0.99] transition-all flex flex-col items-center text-center p-4 group"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl mb-2.5 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: d.color + '18', color: d.color }}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm text-slate-900 group-hover:text-primary-600 transition-colors">
                  {d.name}
                </p>
                <span className="font-mono text-[10px] text-slate-400 mt-0.5">{d.code}</span>
                <span className="text-xs text-slate-500 mt-1 tabular-nums">
                  {d.workstations.filter((w) => w.is_active).length} poste(s)
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Fiches récentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Fiches récentes</h2>
          <Link to="/fiches" className="text-sm text-primary-600 hover:underline font-medium">
            Tout voir →
          </Link>
        </div>

        {!stats?.recent_fiches?.length ? (
          <div className="card text-center py-12 text-slate-500">
            <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">Aucune fiche pour le moment. Créez la première !</p>
            <Link to="/fiches/new" className="btn-primary mt-4 inline-flex mx-auto">
              <PlusCircle className="h-4 w-4" />
              Créer une fiche
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
