import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Users, FileText, ShieldCheck, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Building2,
} from 'lucide-react'
import { authApi } from '../api/auth'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import type { User, Fiche, UserRole } from '../types'
import StatusBadge from '../components/StatusBadge'

interface Toast { message: string; type: 'success' | 'error' }

function ToastBar({ message, type }: Toast) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {message}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingFiches, setLoadingFiches] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'fiches'>('users')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await authApi.listUsers()
      setUsers(data)
    } catch {
      showToast('Failed to load users.', 'error')
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadFiches = async () => {
    setLoadingFiches(true)
    try {
      const res = await fichesApi.list({ page: 1 })
      setFiches(res.results)
    } catch {
      showToast('Failed to load fiches.', 'error')
    } finally {
      setLoadingFiches(false)
    }
  }

  useEffect(() => {
    loadUsers()
    loadFiches()
  }, [])

  const handleRoleChange = async (userId: number, role: UserRole) => {
    try {
      const updated = await authApi.updateUserRole(userId, role)
      setUsers((prev) => prev.map((u) => u.id === userId ? updated : u))
      showToast('Role updated.', 'success')
    } catch {
      showToast('Failed to update role.', 'error')
    }
  }

  const handleToggleActive = async (u: User) => {
    try {
      const updated = await authApi.toggleUserActive(u.id, !u.is_active)
      setUsers((prev) => prev.map((x) => x.id === u.id ? updated : x))
      showToast(`User ${updated.is_active ? 'activated' : 'deactivated'}.`, 'success')
    } catch {
      showToast('Failed to update user.', 'error')
    }
  }

  return (
    <div className="space-y-5">
      {toast && <ToastBar {...toast} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary-600" />
            Admin Panel
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage users and fiches across the platform.</p>
        </div>
        <Link to="/admin/departements" className="btn-primary">
          <Building2 className="h-4 w-4" />
          Départements d'usine
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('fiches')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'fiches'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText className="h-4 w-4" />
          Fiches ({fiches.length})
        </button>
      </div>

      {/* Users table */}
      {activeTab === 'users' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">All Users</h2>
            <button onClick={loadUsers} className="btn-secondary text-xs px-3 py-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold shrink-0">
                            {u.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          disabled={u.id === user?.id}
                        >
                          <option value="operator">Operator</option>
                          <option value="technician">Technician</option>
                          <option value="engineer">Engineer</option>
                          <option value="expert">Expert</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === user?.id}
                          className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-40 disabled:no-underline"
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <AlertCircle className="h-4 w-4" />
                  No users found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fiches table */}
      {activeTab === 'fiches' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">All Fiches</h2>
            <button onClick={loadFiches} className="btn-secondary text-xs px-3 py-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {loadingFiches ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Author</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {fiches.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <a
                          href={`/fiches/${f.id}`}
                          className="text-sm font-medium text-primary-700 hover:underline line-clamp-1"
                        >
                          {f.title}
                        </a>
                      </td>
                      <td className="px-5 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                          {f.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={f.status} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{f.author_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">
                        {format(new Date(f.updated_at), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fiches.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                  <AlertCircle className="h-4 w-4" />
                  No fiches found.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
