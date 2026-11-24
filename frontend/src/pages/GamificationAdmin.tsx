import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Trophy, Users, Zap, BarChart3, RefreshCw, AlertCircle,
  Search, ChevronLeft, CheckCircle, XCircle, Edit3, Eye, X,
  Shield, Award, Layers,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  gamificationApi,
  type AdminStats,
  type PointConfig,
  type PointsTransaction,
  type LeaderboardEntry,
} from '../api/gamification'

// ─── Static data ────────────────────────────────────────────────────────────

const ALL_BADGES = [
  { id: 'first_contribution', name: 'First Contribution', description: 'Published first contribution', icon: '🎯', color: '#0d9488', criteria: '1 published fiche' },
  { id: 'problem_solver', name: 'Problem Solver', description: 'Published 10 technical solutions', icon: '🔑', color: '#3b82f6', criteria: '10 problem_solution fiches published' },
  { id: 'knowledge_sharer', name: 'Knowledge Sharer', description: 'Made 20 total contributions', icon: '📚', color: '#8b5cf6', criteria: '20 total published fiches' },
  { id: 'maintenance_specialist', name: 'Maintenance Specialist', description: 'Published 10 maintenance procedures', icon: '🔧', color: '#f59e0b', criteria: '10 procedure fiches published' },
  { id: 'active_expert', name: 'Active Expert', description: 'Made 50 helpful contributions', icon: '💡', color: '#10b981', criteria: '50 helpful contributions (answers/evaluations/improvements)' },
  { id: 'top_contributor', name: 'Top Contributor', description: 'Reached Top 10 leaderboard', icon: '🏆', color: '#ef4444', criteria: 'In top 10 overall leaderboard' },
]

const ALL_LEVELS = [
  { level: 1, name: 'Beginner', icon: '🌱', min_points: 0 },
  { level: 2, name: 'Contributor', icon: '⭐', min_points: 100 },
  { level: 3, name: 'Skilled Technician', icon: '🔧', min_points: 300 },
  { level: 4, name: 'Professional Engineer', icon: '🏗️', min_points: 600 },
  { level: 5, name: 'Technical Expert', icon: '💡', min_points: 1000 },
  { level: 6, name: 'Master Expert', icon: '🏆', min_points: 2000 },
]

// ─── Toast ──────────────────────────────────────────────────────────────────

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

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  )
}

// ─── Error alert ─────────────────────────────────────────────────────────────

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'config' | 'users' | 'badges'

// ─── Adjust Points Modal ──────────────────────────────────────────────────────

interface AdjustModalProps {
  user: { user_id: number; full_name: string }
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}

function AdjustModal({ user, onClose, onSuccess, onError }: AdjustModalProps) {
  const [points, setPoints] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) { onError('Reason is required.'); return }
    const pts = parseInt(points, 10)
    if (isNaN(pts) || pts === 0) { onError('Enter a non-zero integer (can be negative).'); return }
    setSaving(true)
    try {
      await gamificationApi.adminAdjust(user.user_id, pts, reason.trim())
      onSuccess(`Points adjusted for ${user.full_name}.`)
      onClose()
    } catch {
      onError('Failed to adjust points.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Adjust Points</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Adjusting points for <span className="font-semibold text-gray-900">{user.full_name}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Points (use negative to deduct)</label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 50 or -50"
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Reason <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="input-field"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Apply'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── History Side Panel ───────────────────────────────────────────────────────

interface HistoryPanelProps {
  userId: number
  userName: string
  onClose: () => void
}

function HistoryPanel({ userId, userName, onClose }: HistoryPanelProps) {
  const [txns, setTxns] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    gamificationApi.getAdminTransactions(userId)
      .then((res: any) => setTxns(Array.isArray(res) ? res : (res?.transactions ?? [])))
      .catch(() => setError('Failed to load history.'))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-gray-200 shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Transaction History</h3>
          <p className="text-xs text-gray-500">{userName}</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorAlert message={error} />
        ) : txns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">No transactions found.</span>
          </div>
        ) : (
          txns.map((tx) => (
            <div key={tx.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-gray-700 capitalize">{tx.action.replace(/_/g, ' ')}</span>
                <span className={`font-semibold ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.points >= 0 ? '+' : ''}{tx.points} pts
                </span>
              </div>
              {tx.reason && <p className="text-gray-500 truncate">{tx.reason}</p>}
              <p className="text-gray-400 mt-0.5">{format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Tab 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    gamificationApi.getAdminStats()
      .then(setStats)
      .catch(() => setError('Failed to load statistics.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (error) return <ErrorAlert message={error} />
  if (!stats) return null

  const statCards = [
    { label: 'Users with Points', value: stats.total_users_with_points, icon: <Users className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-50' },
    { label: 'Total Points Awarded', value: stats.total_points_awarded.toLocaleString(), icon: <Zap className="h-5 w-5 text-amber-600" />, bg: 'bg-amber-50' },
    { label: 'Total Transactions', value: stats.total_transactions.toLocaleString(), icon: <BarChart3 className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-50' },
    { label: 'Avg Points / User', value: Math.round(stats.avg_points_per_user).toLocaleString(), icon: <Trophy className="h-5 w-5 text-primary-600" />, bg: 'bg-primary-50' },
  ]

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.bg}`}>
              {c.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-xl font-bold text-gray-900">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top 5 Earners */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Top 5 Earners
          </h2>
          <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Rank', 'Name', 'Role', 'Level', 'Points'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {stats.top_earners.map((e: any, idx: number) => {
                const rank = e.rank ?? (idx + 1)
                const initials = e.initials ?? e.full_name?.slice(0, 2)?.toUpperCase() ?? '??'
                return (
                  <tr key={e.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        rank === 1 ? 'bg-amber-100 text-amber-700' :
                        rank === 2 ? 'bg-gray-200 text-gray-600' :
                        rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{rank}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold shrink-0">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{e.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">{e.role ?? 'technician'}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">Level {e.level}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-primary-700">{e.total_points.toLocaleString()}</span>
                    </td>
                  </tr>
                )
              })}
              {stats.top_earners.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Transactions (last 10)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Date', 'User', 'Action', 'Points', 'Reason'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {stats.recent_transactions.map((tx: PointsTransaction) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">#{tx.user_id}</td>
                  <td className="px-5 py-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                      {tx.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-sm font-semibold ${tx.points >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points >= 0 ? '+' : ''}{tx.points}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500 max-w-[200px] truncate">{tx.reason ?? '—'}</td>
                </tr>
              ))}
              {stats.recent_transactions.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No transactions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspicious Activity */}
      {stats.suspicious_users && stats.suspicious_users.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4" /> Suspicious Activity
          </h2>
          <div className="space-y-2">
            {stats.suspicious_users.map((u: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white border border-amber-200 px-4 py-2 text-sm">
                <span className="font-medium text-gray-900">{u.full_name ?? `User #${u.user_id}`}</span>
                <span className="text-gray-500">— repeated action:</span>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 capitalize">{u.action?.replace(/_/g, ' ')}</span>
                {u.count && <span className="text-xs text-gray-400">× {u.count}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab 2: Config ────────────────────────────────────────────────────────────

function ConfigTab({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [configs, setConfigs] = useState<PointConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    gamificationApi.getConfig()
      .then((data) => {
        setConfigs(data)
        const init: Record<string, number> = {}
        data.forEach((c) => { init[c.action_key] = c.points })
        setEditing(init)
      })
      .catch(() => setError('Failed to load point configuration.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (actionKey: string) => {
    setSaving((prev) => ({ ...prev, [actionKey]: true }))
    try {
      await gamificationApi.updateConfig(actionKey, { points: editing[actionKey] })
      setConfigs((prev) => prev.map((c) => c.action_key === actionKey ? { ...c, points: editing[actionKey] } : c))
      onToast(`Updated points for "${actionKey}".`, 'success')
    } catch {
      onToast('Failed to update config.', 'error')
    } finally {
      setSaving((prev) => ({ ...prev, [actionKey]: false }))
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Point Values Configuration</h2>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Action Key</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Label</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Points</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Active</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {configs.map((c) => {
              const isDirty = editing[c.action_key] !== c.points
              return (
                <tr key={c.action_key} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{c.action_key}</code>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{c.label}</td>
                  <td className="px-5 py-3">
                    <input
                      type="number"
                      value={editing[c.action_key] ?? c.points}
                      onChange={(e) =>
                        setEditing((prev) => ({ ...prev, [c.action_key]: parseInt(e.target.value, 10) || 0 }))
                      }
                      className="input-field w-24"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleSave(c.action_key)}
                      disabled={!isDirty || saving[c.action_key]}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
                    >
                      {saving[c.action_key]
                        ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        : <><Edit3 className="h-3.5 w-3.5" /> Save</>
                      }
                    </button>
                  </td>
                </tr>
              )
            })}
            {configs.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No configuration found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab 3: User Management ───────────────────────────────────────────────────

interface UserRow {
  user_id: number
  full_name: string
  role: string
  level: number
  level_name: string
  level_icon: string
  total_points: number
  badges_count: number
  initials: string
}

function UsersTab({ onToast }: { onToast: (msg: string, t: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<{ user_id: number; full_name: string } | null>(null)
  const [historyTarget, setHistoryTarget] = useState<{ userId: number; userName: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    // Use leaderboard as source for user list (all period gives all users)
    gamificationApi.getLeaderboard('all')
      .then((res) => setUsers(((res.leaderboard || res.entries || []) as unknown) as UserRow[]))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="input-field pl-9"
          />
        </div>
        <button onClick={load} className="btn-secondary text-xs px-3 py-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Rank', 'Name', 'Role', 'Level', 'Points', 'Badges', 'Actions'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-500">#{u.user_id}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold shrink-0">
                          {u.initials}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.level_icon} {u.level_name}</td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-semibold text-primary-700">{u.total_points.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{u.badges_count}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setAdjustTarget({ user_id: u.user_id, full_name: u.full_name })}
                          className="btn-secondary text-xs px-2.5 py-1"
                        >
                          <Edit3 className="h-3 w-3" /> Adjust
                        </button>
                        <button
                          onClick={() => setHistoryTarget({ userId: u.user_id, userName: u.full_name })}
                          className="btn-secondary text-xs px-2.5 py-1"
                        >
                          <Eye className="h-3 w-3" /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                      {search ? 'No users match the search.' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {adjustTarget && (
        <AdjustModal
          user={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSuccess={(msg) => { onToast(msg, 'success'); load() }}
          onError={(msg) => onToast(msg, 'error')}
        />
      )}
      {historyTarget && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setHistoryTarget(null)} />
          <HistoryPanel
            userId={historyTarget.userId}
            userName={historyTarget.userName}
            onClose={() => setHistoryTarget(null)}
          />
        </>
      )}
    </div>
  )
}

// ─── Tab 4: Badges & Levels ───────────────────────────────────────────────────

function BadgesTab() {
  return (
    <div className="space-y-6">
      {/* Badges */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary-600" /> Badge Definitions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_BADGES.map((b) => (
            <div key={b.id} className="card flex gap-3 items-start">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
                style={{ backgroundColor: b.color + '1a' }}
              >
                {b.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900">{b.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{b.description}</p>
                <p className="text-xs mt-1.5 rounded bg-gray-100 px-2 py-0.5 text-gray-600 inline-block">{b.criteria}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Levels */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary-600" /> Level Definitions
        </h2>
        <div className="card p-0 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Level', 'Icon', 'Name', 'Min Points Required'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {ALL_LEVELS.map((l) => (
                <tr key={l.level} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                      {l.level}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xl">{l.icon}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{l.name}</td>
                  <td className="px-5 py-3">
                    <span className="text-sm font-semibold text-primary-700">
                      {l.min_points.toLocaleString()} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GamificationAdmin() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [toast, setToast] = useState<Toast | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { key: 'config', label: 'Point Values', icon: <Zap className="h-4 w-4" /> },
    { key: 'users', label: 'User Management', icon: <Users className="h-4 w-4" /> },
    { key: 'badges', label: 'Badges & Levels', icon: <Award className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-5">
      {toast && <ToastBar {...toast} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary-600" />
            Gamification Admin
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage points, badges, and user gamification data.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-1.5 text-xs text-primary-700 font-medium">
          <Shield className="h-3.5 w-3.5" />
          Admin only
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'config' && <ConfigTab onToast={showToast} />}
      {activeTab === 'users' && <UsersTab onToast={showToast} />}
      {activeTab === 'badges' && <BadgesTab />}
    </div>
  )
}
