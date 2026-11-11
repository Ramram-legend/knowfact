/**
 * pages/DepartmentDashboard.tsx
 * Tableau de bord d'un département : infos, membres, postes, fiches récentes.
 */
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  FileText,
  PlusCircle,
  ArrowLeft,
  AlertCircle,
  Briefcase,
  Factory,
  Wrench,
  Package,
  AlertTriangle,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { departmentsApi } from '../api/departments'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import type { DepartmentDetail, Fiche } from '../types'
import StatusBadge from '../components/StatusBadge'

/** Résoudre une icône Lucide depuis son nom. */
function DeptIcon({ name, className }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    Factory: <Factory className={className} />,
    Wrench: <Wrench className={className} />,
    ShieldCheck: <ShieldCheck className={className} />,
    Package: <Package className={className} />,
    AlertTriangle: <AlertTriangle className={className} />,
    Building2: <Building2 className={className} />,
  }
  return <>{icons[name] ?? <Building2 className={className} />}</>
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    expert: 'bg-amber-100 text-amber-700',
    engineer: 'bg-blue-100 text-blue-700',
    technician: 'bg-emerald-100 text-emerald-700',
    operator: 'bg-gray-100 text-gray-700',
  }
  const labels: Record<string, string> = {
    admin: 'Admin',
    expert: 'Expert',
    engineer: 'Ingénieur',
    technician: 'Technicien',
    operator: 'Opérateur',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[role] ?? 'bg-gray-100 text-gray-700'}`}>
      {labels[role] ?? role}
    </span>
  )
}

export default function DepartmentDashboard() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dept, setDept] = useState<DepartmentDetail | null>(null)
  const [recentFiches, setRecentFiches] = useState<Fiche[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const deptId = Number(id)

  useEffect(() => {
    if (!deptId) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [deptData, fichesData] = await Promise.all([
          departmentsApi.get(deptId),
          fichesApi.list({ department_id: deptId, page: 1 } as any),
        ])
        setDept(deptData)
        setRecentFiches(fichesData.results.slice(0, 6))
      } catch {
        setError('Impossible de charger les données du département.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [deptId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !dept) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-red-600">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">{error || 'Département introuvable.'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-secondary">
          Retour au dashboard
        </button>
      </div>
    )
  }

  const canCreateFiche = user?.role !== 'operator'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: dept.color + '20', color: dept.color }}
          >
            <DeptIcon name={dept.icon} className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dept.name}</h1>
            <p className="text-sm text-gray-500">
              Code : <span className="font-mono font-semibold">{dept.code}</span>
              {dept.description && ` — ${dept.description}`}
            </p>
          </div>
        </div>

        {canCreateFiche && (
          <Link
            to={`/fiches/new?department_id=${dept.id}`}
            className="btn-primary"
          >
            <PlusCircle className="h-4 w-4" />
            Nouvelle fiche
          </Link>
        )}
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
            style={{ backgroundColor: dept.color + '20', color: dept.color }}
          >
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{dept.fiche_count}</p>
            <p className="text-sm text-gray-500">Fiches</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{dept.members.length}</p>
            <p className="text-sm text-gray-500">Membres</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {dept.workstations.filter((w) => w.is_active).length}
            </p>
            <p className="text-sm text-gray-500">Postes actifs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Membres */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            Membres
          </h2>
          {dept.members.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun membre affecté.</p>
          ) : (
            <ul className="space-y-2">
              {dept.members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                      {m.workstation && (
                        <p className="text-xs text-gray-400 truncate">{m.workstation.name}</p>
                      )}
                    </div>
                  </div>
                  <RoleBadge role={m.role} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Postes de travail */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-gray-500" />
            Postes de travail
          </h2>
          {dept.workstations.filter((w) => w.is_active).length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun poste configuré.</p>
          ) : (
            <ul className="space-y-2">
              {dept.workstations
                .filter((w) => w.is_active)
                .sort((a, b) => a.display_order - b.display_order)
                .map((ws) => (
                  <li
                    key={ws.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Briefcase className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{ws.name}</p>
                      {ws.code && (
                        <p className="text-xs font-mono text-gray-400">{ws.code}</p>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* Fiches récentes */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Fiches récentes
            </h2>
            <Link
              to={`/fiches?department_id=${dept.id}`}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Voir tout
            </Link>
          </div>
          {recentFiches.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune fiche pour ce département.</p>
          ) : (
            <ul className="space-y-2">
              {recentFiches.map((f) => (
                <li key={f.id}>
                  <Link
                    to={`/fiches/${f.id}`}
                    className="flex items-start gap-2 rounded-lg p-2 hover:bg-gray-50 transition-colors group"
                  >
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-primary-700">
                        {f.title}
                      </p>
                      <StatusBadge status={f.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Vue opérateur — Accès rapides gros boutons */}
      {user?.role === 'operator' && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Accès rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              to={`/fiches?department_id=${dept.id}&status=published`}
              className="flex items-center gap-4 rounded-xl border-2 border-primary-100 bg-primary-50 p-5 hover:border-primary-300 hover:bg-primary-100 transition-colors"
            >
              <FileText className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-base font-semibold text-primary-800">Fiches validées</p>
                <p className="text-sm text-primary-600">Solutions et procédures disponibles</p>
              </div>
            </Link>
            <Link
              to={`/search?department_id=${dept.id}`}
              className="flex items-center gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FileText className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-base font-semibold text-gray-800">Rechercher</p>
                <p className="text-sm text-gray-500">Trouver une solution rapidement</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
