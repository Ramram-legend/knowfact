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
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItem = (
  to: string,
  icon: React.ReactNode,
  label: string,
  end = false
) => (
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, demoLogin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItem('/dashboard', <LayoutDashboard className="h-4 w-4" />, 'Dashboard', true)}
        {navItem('/fiches', <FileText className="h-4 w-4" />, 'Fiches')}
        {navItem('/fiches/new', <PlusCircle className="h-4 w-4" />, 'Nouvelle fiche')}
        {navItem('/propositions', <Sparkles className="h-4 w-4 text-blue-500" />, 'Mes propositions')}
        {(user?.role === 'expert' || user?.role === 'admin') && (
          navItem('/fiches/improvements/pending', <ShieldCheck className="h-4 w-4 text-amber-500" />, 'À valider (améliorations)')
        )}
        {navItem('/search', <Search className="h-4 w-4" />, 'Recherche')}
        {(user?.role === 'admin') && (
          navItem('/admin', <ShieldCheck className="h-4 w-4" />, 'Administration')
        )}
      </nav>

      {/* User section with Direct Role Switcher */}
      <div className="border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-gray-50 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{user?.full_name}</p>
            <p className="truncate text-xs font-semibold text-primary-600 uppercase tracking-wide">{user?.role}</p>
          </div>
        </div>

        {/* Quick Role Switcher */}
        <div className="mb-2 px-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Changer de rôle (démo) :</p>
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
