import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Trophy, Star, Lock, TrendingUp, CheckCircle, FileText, Wrench, AlertCircle, HeartHandshake, ArrowLeft } from 'lucide-react'
import { gamificationApi } from '../api/gamification'
import type { UserGamificationProfile, PointsTransaction } from '../api/gamification'

const ACTION_LABELS: Record<string, string> = {
  publish_problem_solution: 'Published Technical Solution',
  publish_procedure: 'Published Maintenance Procedure',
  publish_task_post: 'Published Technical Task',
  share_best_practice: 'Shared Best Practice',
  provide_useful_answer: 'Provided Useful Answer',
  receive_positive_evaluation: 'Received Positive Evaluation',
  solution_approved_by_expert: 'Solution Approved by Expert',
  improvement_validated: 'Improvement Validated',
  admin_adjustment: 'Admin Adjustment',
}

const ALL_BADGES = [
  {
    badge_id: 'first_contribution',
    name: 'First Contribution',
    description: 'Published your first contribution',
    icon: '🎯',
    color: '#0d9488',
  },
  {
    badge_id: 'problem_solver',
    name: 'Problem Solver',
    description: 'Published 10 technical solutions',
    icon: '🔑',
    color: '#f59e0b',
  },
  {
    badge_id: 'knowledge_sharer',
    name: 'Knowledge Sharer',
    description: 'Made 20 total contributions',
    icon: '📚',
    color: '#3b82f6',
  },
  {
    badge_id: 'maintenance_specialist',
    name: 'Maintenance Specialist',
    description: 'Published 10 maintenance procedures',
    icon: '🔧',
    color: '#8b5cf6',
  },
  {
    badge_id: 'active_expert',
    name: 'Active Expert',
    description: 'Made 50 helpful contributions',
    icon: '💡',
    color: '#f97316',
  },
  {
    badge_id: 'top_contributor',
    name: 'Top Contributor',
    description: 'Reached the Top 10 leaderboard',
    icon: '🏆',
    color: '#eab308',
  },
]

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card h-24 bg-gray-100" />
        ))}
      </div>
      <div className="card h-40 bg-gray-100" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card h-40 bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

export default function Achievements() {
  const { userId } = useParams<{ userId?: string }>()
  const isOtherUser = Boolean(userId)

  const [profile, setProfile] = useState<UserGamificationProfile | null>(null)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError('')
        if (isOtherUser) {
          const prof = await gamificationApi.getUserProfile(Number(userId))
          setProfile(prof)
          setTransactions(prof.recent_transactions || [])
        } else {
          const [prof, txns] = await Promise.all([
            gamificationApi.getMyProfile(),
            gamificationApi.getMyTransactions(1, 20),
          ])
          setProfile(prof)
          const txList = Array.isArray(txns) ? txns : (txns?.transactions ?? [])
          setTransactions(txList)
        }
      } catch (err: any) {
        setError('Unable to load achievements. The backend may be temporarily unavailable.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId, isOtherUser])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 my-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error loading achievements</h3>
            <p className="text-sm text-red-700 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const earnedBadgeIds = new Set((profile?.badges ?? []).map((b) => b.badge_id))

  return (
    <div className="space-y-6">
      {/* Back button if viewing other user */}
      {isOtherUser && (
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au classement
        </Link>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 shadow-2xs">
          <Trophy className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isOtherUser ? `${profile?.full_name || 'Utilisateur'} — Succès & Points` : 'Mes Achievements'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isOtherUser ? `Profil technique de ${profile?.role || 'contributeur'}` : 'Vos contributions et votre progression sur KnowFact'}
          </p>
        </div>
      </div>

      {/* Stats row — 5 metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 shrink-0">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{profile?.total_points ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">Total Points</p>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 shrink-0">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{profile?.solutions_shared ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">Solutions Shared</p>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 shrink-0">
            <Wrench className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{profile?.procedures_created ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">Procedures Created</p>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{profile?.tasks_contributed ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">Tasks Contributed</p>
          </div>
        </div>

        <div className="card flex items-center gap-3.5 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 shrink-0">
            <HeartHandshake className="h-5 w-5 text-teal-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 leading-tight">{profile?.helpful_contributions ?? 0}</p>
            <p className="text-xs text-gray-500 truncate">Helpful Contributions</p>
          </div>
        </div>
      </div>

      {/* Level section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900">Level Progress</h2>
        </div>
        <div className="flex items-center gap-4 mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 border-2 border-primary-200 text-3xl shrink-0">
            {profile?.level_icon ?? '⭐'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black text-gray-900">Level {profile?.level ?? 1}</span>
              <span className="text-lg font-semibold text-primary-600">{profile?.level_name ?? 'Novice'}</span>
            </div>
            {profile?.next_level_name && (
              <p className="text-sm text-gray-500 mt-0.5">
                {profile.points_to_next} points to{' '}
                <span className="font-medium text-gray-700">{profile.next_level_name}</span>
              </p>
            )}
            {!profile?.next_level_name && (
              <p className="text-sm text-green-600 font-medium mt-0.5">🎉 Maximum level reached!</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{profile?.total_points ?? 0} pts</span>
            <span>{profile?.progress_pct ?? 0}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(profile?.progress_pct ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badges grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">
            Badges ({earnedBadgeIds.size}/{ALL_BADGES.length})
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ALL_BADGES.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.badge_id)
            const earnedData = profile?.badges.find((b) => b.badge_id === badge.badge_id)
            return (
              <div
                key={badge.badge_id}
                className={`card flex flex-col items-center text-center p-5 transition-all ${
                  isEarned
                    ? 'border-primary-200 shadow-md'
                    : 'opacity-50 grayscale border-gray-100'
                }`}
              >
                {isEarned ? (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl mb-3 shadow-sm"
                    style={{ backgroundColor: badge.color + '20' }}
                  >
                    {badge.icon}
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl mb-3 relative">
                    {badge.icon}
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-200/70">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                )}
                <p className="font-semibold text-sm text-gray-900">{badge.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-snug">{badge.description}</p>
                {isEarned && earnedData && (
                  <p className="text-[11px] font-medium text-primary-600 mt-2">
                    Earned {formatDate(earnedData.earned_at)}
                  </p>
                )}
                {!isEarned && (
                  <p className="text-[11px] text-gray-400 mt-2">Not yet earned</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Points History */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary-600" />
          <h2 className="text-base font-semibold text-gray-900">Points History</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 font-semibold text-gray-600 pr-4">Date</th>
                  <th className="text-left pb-2 font-semibold text-gray-600 pr-4">Action</th>
                  <th className="text-right pb-2 font-semibold text-gray-600">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-2.5 pr-4 text-gray-700">
                      <div className="font-medium">
                        {ACTION_LABELS[tx.action] ?? tx.action}
                      </div>
                      {tx.reason && (
                        <div className="text-xs text-gray-400 mt-0.5">{tx.reason}</div>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`font-bold ${
                          tx.points >= 0 ? 'text-green-600' : 'text-red-500'
                        }`}
                      >
                        {tx.points >= 0 ? '+' : ''}{tx.points}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
