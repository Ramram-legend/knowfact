import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, AlertCircle, Users, Wrench, Cpu, Star, ExternalLink } from 'lucide-react'
import { gamificationApi } from '../api/gamification'
import type { LeaderboardEntry, LeaderboardResponse } from '../api/gamification'

type Period = 'all' | 'monthly' | 'weekly'
type RoleFilter = 'all' | 'engineer' | 'technician' | 'expert'

const PERIOD_LABELS: Record<Period, string> = {
  all: 'All Time',
  monthly: 'This Month',
  weekly: 'This Week',
}

const ROLE_TABS: { key: RoleFilter; label: string; icon: any }[] = [
  { key: 'all', label: 'Overall Top', icon: Users },
  { key: 'engineer', label: 'Top Engineers', icon: Cpu },
  { key: 'technician', label: 'Top Technicians', icon: Wrench },
  { key: 'expert', label: 'Top Experts', icon: Star },
]

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  expert: 'bg-amber-100 text-amber-700',
  engineer: 'bg-blue-100 text-blue-700',
  technician: 'bg-emerald-100 text-emerald-700',
  operator: 'bg-gray-100 text-gray-600',
}

const AVATAR_COLORS: Record<string, string> = {
  admin: 'bg-purple-500',
  expert: 'bg-amber-500',
  engineer: 'bg-blue-500',
  technician: 'bg-emerald-500',
  operator: 'bg-gray-400',
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-black text-sm border border-amber-300 shadow-2xs">
        1
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 font-black text-sm border border-gray-300 shadow-2xs">
        2
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-black text-sm border border-orange-300 shadow-2xs">
        3
      </div>
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-gray-500 font-semibold text-sm border border-gray-200">
      {rank}
    </div>
  )
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  isCurrentUser: boolean
}) {
  const avatarColor = AVATAR_COLORS[entry.role] ?? 'bg-gray-400'
  const roleColor = ROLE_COLORS[entry.role] ?? 'bg-gray-100 text-gray-600'

  return (
    <div
      className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
        isCurrentUser
          ? 'border-primary-300 bg-primary-50/60 shadow-2xs'
          : 'border-transparent hover:bg-gray-50'
      }`}
    >
      {/* Rank */}
      <div className="shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Medal (top 3 only) */}
      {entry.rank <= 3 && (
        <span className="text-xl shrink-0 hidden sm:block">{RANK_MEDALS[entry.rank - 1]}</span>
      )}

      {/* Avatar with initials */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${avatarColor} text-white text-sm font-bold shadow-2xs`}
      >
        {entry.initials}
      </div>

      {/* Name + profession / role */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/achievements/${entry.user_id}`}
            className="font-semibold text-gray-900 truncate hover:text-primary-600 transition-colors inline-flex items-center gap-1 group"
          >
            <span>{entry.full_name}</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary-500 transition-opacity" />
          </Link>
          {isCurrentUser && (
            <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full border border-primary-200">
              VOUS
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleColor}`}>
            {entry.role}
          </span>
          <span className="text-xs text-gray-500">
            {entry.level_icon} Niveau {entry.level} · {entry.level_name}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p className="text-lg font-black text-gray-900">{entry.total_points.toLocaleString()}</p>
        <p className="text-xs text-gray-400 font-medium">points</p>
      </div>

      {/* Badges count */}
      <div className="text-right shrink-0 hidden sm:block pl-2 border-l border-gray-100">
        <p className="text-sm font-bold text-amber-600">{entry.badges_count} 🏅</p>
        <p className="text-xs text-gray-400">badges</p>
      </div>
    </div>
  )
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        setError('')
        const result = await gamificationApi.getLeaderboard(period, roleFilter)
        setData(result)
      } catch (err: any) {
        setError('Unable to load leaderboard. The backend may be temporarily unavailable.')
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [period, roleFilter])

  const entries = data?.leaderboard || data?.entries || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 shadow-2xs">
            <Trophy className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Top Contributors & Collaborative Rankings</p>
          </div>
        </div>

        {/* Current user rank badge */}
        {data?.current_user_rank != null && (
          <div className="flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-full px-4 py-1.5 self-start sm:self-auto shadow-2xs">
            <span className="text-xs text-primary-600 font-medium">Votre rang :</span>
            <span className="text-sm font-bold text-primary-700">
              #{data.current_user_rank}
            </span>
          </div>
        )}
      </div>

      {/* Role Tabs (Top engineers, Top technicians, Top experts, Overall) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
        {ROLE_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = roleFilter === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Period tabs (Weekly, Monthly, All Time) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="card p-1 max-w-sm w-full">
          <div className="flex gap-1">
            {(['all', 'monthly', 'weekly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  period === p
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary text */}
        {!loading && (
          <span className="text-xs text-gray-500 font-medium">
            {entries.length} contributeur{entries.length > 1 ? 's' : ''} classé{entries.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error loading leaderboard</h3>
              <p className="text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card space-y-3 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      )}

      {/* Leaderboard list */}
      {!loading && !error && (
        <div className="card p-2 sm:p-3 space-y-1">
          {entries.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucun résultat pour cette période et ce rôle.</p>
              <p className="text-xs text-gray-400 mt-1">
                Les contributions enregistrées s'afficheront ici.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const isCurrentUser = data?.current_user_rank === entry.rank
              return (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={isCurrentUser}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
