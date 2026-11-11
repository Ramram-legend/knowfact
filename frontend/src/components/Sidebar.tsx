/**
 * components/Sidebar.tsx — Navigation principale avec sections par département.
 */
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Search,
  PlusCircle,
  ShieldCheck,
  LogOut,
  BookOpen,
  X,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Factory,
  Wrench,
  Package,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDepartments } from '../contexts/DepartmentContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

/** Résoudre une icône Lucide depuis son nom (chaîne). */
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

function NavItem({
  to,
  icon,
  label,
  end = false,
}: {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, demoLogin } = useAuth()
  const { departments } = useDepartments()
  const navigate = useNavigate()
  // Chaque département peut être replié ; état stocké localement
  const [collapsedDepts, setCollapsedDepts] = useState<Set<number>>(new Set())

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const toggleDept = (id: number) => {
    setCollapsedDepts((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canCreateFiche = user?.role !== 'operator'

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">KnowFact</span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {/* Liens globaux */}
        <NavItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" end />
        <NavItem to="/fiches" icon={<FileText className="h-4 w-4" />} label="Toutes les fiches" />
        {canCreateFiche && (
          <NavItem to="/fiches/new" icon={<PlusCircle className="h-4 w-4" />} label="Nouvelle fiche" />
        )}
        <NavItem to="/search" icon={<Search className="h-4 w-4" />} label="Recherche" />

        {/* ─── Section Départements ─── */}
        {departments.length > 0 && (
          <div className="mt-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Départements
            </p>

            {departments.map((dept) => {
              const isCollapsed = collapsedDepts.has(dept.id)
              return (
                <div key={dept.id} className="mb-0.5">
                  {/* En-tête du département */}
                  <div className="flex items-center">
                    <NavLink
                      to={`/departements/${dept.id}`}
                      className={({ isActive }) =>
                        `flex flex-1 items-center gap-2 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`
                      }
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                        style={{ backgroundColor: dept.color + '25', color: dept.color }}
                      >
                        <DeptIcon name={dept.icon} className="h-3 w-3" />
                      </span>
                      <span className="truncate">{dept.name}</span>
                    </NavLink>
                    <button
                      onClick={() => toggleDept(dept.id)}
                      className="px-1.5 py-2 text-gray-400 hover:text-gray-600 rounded-r-lg hover:bg-gray-100 transition-colors"
                      title={isCollapsed ? 'Déplier' : 'Replier'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Sous-liens du département */}
                  {!isCollapsed && (
                    <div className="ml-4 pl-3 border-l border-gray-200 space-y-0.5 mt-0.5">
                      <NavLink
                        to={`/fiches?department_id=${dept.id}`}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                          }`
                        }
                      >
                        <FileText className="h-3 w-3" />
                        Fiches du département
                      </NavLink>
                      {canCreateFiche && (
                        <NavLink
                          to={`/fiches/new?department_id=${dept.id}`}
                          className={({ isActive }) =>
                            `flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                            }`
                          }
                        >
                          <PlusCircle className="h-3 w-3" />
                          Nouvelle fiche
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Liens de workflow ─── */}
        <div className="mt-4 pt-3 border-t border-gray-100 space-y-0.5">
          <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Mes activités
          </p>
          <NavItem
            to="/propositions"
            icon={<Sparkles className="h-4 w-4 text-blue-500" />}
            label="Mes propositions"
          />
          {(user?.role === 'expert' || user?.role === 'admin') && (
            <NavItem
              to="/fiches/improvements/pending"
              icon={<ShieldCheck className="h-4 w-4 text-amber-500" />}
              label="À valider (améliorations)"
            />
          )}
          {user?.role === 'admin' && (
            <>
              <div className="mt-2 pt-2 border-t border-gray-100" />
              <NavItem
                to="/admin"
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Administration"
              />
              <NavItem
                to="/admin/departements"
                icon={<Building2 className="h-4 w-4" />}
                label="Gérer les départements"
              />
            </>
          )}
        </div>
      </nav>

      {/* Section utilisateur + sélecteur de rôle */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-gray-50 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="truncate text-xs font-semibold text-primary-600 uppercase tracking-wide">
              {user?.role}
            </p>
          </div>
        </div>

        {/* Sélecteur de rôle démo rapide */}
        <div className="mb-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Changer de rôle (démo) :
          </p>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => demoLogin('admin')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                user?.role === 'admin'
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => demoLogin('expert')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                user?.role === 'expert'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Expert
            </button>
            <button
              onClick={() => demoLogin('engineer')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                user?.role === 'engineer'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Ingénieur
            </button>
            <button
              onClick={() => demoLogin('technician')}
              className={`px-1.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                user?.role === 'technician'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Technicien
            </button>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Déconnexion
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
