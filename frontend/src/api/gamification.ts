import client from './client'

export interface BadgeEarned {
  badge_id: string
  name: string
  description: string
  icon: string
  color: string
  earned_at: string
}

export interface PointsTransaction {
  id: number
  user_id?: number
  action: string
  points: number
  reference_id: number | null
  reference_type: string | null
  reason: string | null
  created_at: string
  awarded_by_name?: string
}

export interface UserGamificationProfile {
  user_id: number
  full_name?: string
  role?: string
  initials?: string
  total_points: number
  level: number
  level_name: string
  level_icon: string
  progress_pct: number
  points_to_next: number
  next_level_name: string | null
  solutions_shared: number
  procedures_created: number
  tasks_contributed: number
  helpful_contributions: number
  total_contributions: number
  badges: BadgeEarned[]
  recent_transactions: PointsTransaction[]
  leaderboard_rank?: number | null
}

export interface LeaderboardEntry {
  rank: number
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

export interface LeaderboardResponse {
  period: string
  role?: string
  current_user_rank: number | null
  leaderboard: LeaderboardEntry[]
  entries?: LeaderboardEntry[]
}

export interface GamificationNotification {
  id: number
  type: string
  message: string
  reference_id: number | null
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  unread_count: number
  notifications: GamificationNotification[]
}

export interface PointConfig {
  id: number
  action_key: string
  points: number
  label: string
  description: string | null
  is_active: boolean
  updated_at?: string
}

export interface AdminStats {
  total_users_with_points: number
  total_points_awarded: number
  total_transactions: number
  avg_points_per_user: number
  top_earners: {
    user_id: number
    full_name: string
    total_points: number
    level: number
  }[]
  recent_transactions: PointsTransaction[]
  suspicious_users: {
    user_id: number
    full_name: string
    flagged_actions: { action: string; count: number }[]
  }[]
}

export interface PaginatedTransactionsResponse {
  total: number
  page: number
  limit: number
  transactions: PointsTransaction[]
}

export const gamificationApi = {
  getMyProfile: () =>
    client.get<UserGamificationProfile>('/gamification/me').then((r) => r.data),

  getMyTransactions: (page = 1, limit = 20) =>
    client
      .get<PaginatedTransactionsResponse>(`/gamification/me/transactions?page=${page}&limit=${limit}`)
      .then((r) => r.data),

  getNotifications: () =>
    client.get<NotificationsResponse>('/gamification/me/notifications').then((r) => r.data),

  markNotificationsRead: () =>
    client.post<{ detail: string }>('/gamification/me/notifications/read').then((r) => r.data),

  getLeaderboard: (period: 'all' | 'weekly' | 'monthly' = 'all', role?: string) => {
    const roleParam = role && role !== 'all' ? `&role=${encodeURIComponent(role)}` : ''
    return client
      .get<LeaderboardResponse>(`/gamification/leaderboard?period=${period}${roleParam}`)
      .then((r) => {
        const data = r.data
        // normalize leaderboard entries
        if (!data.leaderboard && data.entries) {
          data.leaderboard = data.entries
        }
        return data
      })
  },

  getUserProfile: (userId: number) =>
    client
      .get<UserGamificationProfile>(`/gamification/users/${userId}/profile`)
      .then((r) => r.data),

  getConfig: () =>
    client.get<PointConfig[]>('/gamification/config').then((r) => r.data),

  updateConfig: (actionKey: string, payload: { points: number; label?: string; description?: string; is_active?: boolean }) =>
    client
      .put<PointConfig>(`/gamification/config/${actionKey}`, payload)
      .then((r) => r.data),

  getAdminStats: () =>
    client.get<AdminStats>('/gamification/admin/stats').then((r) => r.data),

  getAdminTransactions: (userId?: number, page = 1, limit = 50) => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', String(userId))
    params.append('page', String(page))
    params.append('limit', String(limit))
    return client
      .get<PaginatedTransactionsResponse>(`/gamification/admin/transactions?${params.toString()}`)
      .then((r) => r.data)
  },

  adminAdjust: (userId: number, points: number, reason: string) =>
    client
      .post<{ detail: string; transaction: any }>('/gamification/admin/adjust', {
        user_id: userId,
        points,
        reason,
      })
      .then((r) => r.data),

  evaluateFiche: (ficheId: number) =>
    client
      .post<{ message: string; evaluations_count: number; has_evaluated: boolean }>(`/fiches/${ficheId}/evaluate`)
      .then((r) => r.data),

  getFicheEvaluationStatus: (ficheId: number) =>
    client
      .get<{ evaluations_count: number; has_evaluated: boolean }>(`/fiches/${ficheId}/evaluation-status`)
      .then((r) => r.data),
}
