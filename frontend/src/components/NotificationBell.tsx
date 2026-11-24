import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Sparkles, Trophy, Award, CheckCircle2, ChevronRight } from 'lucide-react'
import { gamificationApi, GamificationNotification } from '../api/gamification'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<GamificationNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const data = await gamificationApi.getNotifications()
      setUnreadCount(data.unread_count)
      setNotifications(data.notifications)
    } catch (err) {
      // Ignore network errors on background poll
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleMarkAllRead = async () => {
    try {
      setIsLoading(true)
      await gamificationApi.markNotificationsRead()
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark notifications read:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'level_up':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <Sparkles className="h-4 w-4" />
          </div>
        )
      case 'badge_earned':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Trophy className="h-4 w-4" />
          </div>
        )
      case 'top10':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Award className="h-4 w-4" />
          </div>
        )
      case 'approved':
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        )
      case 'points_earned':
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <span className="text-xs font-bold">+pts</span>
          </div>
        )
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p>Aucune notification pour le moment.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Contribuez et résolvez des problèmes pour gagner des points !
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                let timeAgo = ''
                try {
                  timeAgo = formatDistanceToNow(new Date(notif.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })
                } catch {
                  timeAgo = notif.created_at
                }

                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3.5 transition-colors ${
                      notif.is_read ? 'bg-white hover:bg-gray-50/80' : 'bg-primary-50/40 hover:bg-primary-50/70'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{getNotificationIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${notif.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
                    </div>
                    {!notif.is_read && (
                      <span className="shrink-0 h-2 w-2 rounded-full bg-primary-600 mt-1.5" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-center">
            <a
              href="/achievements"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
              onClick={() => setIsOpen(false)}
            >
              Voir mon tableau des succès
              <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

