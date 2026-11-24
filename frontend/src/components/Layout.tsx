import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import PointsBadge from './PointsBadge'
import AIAssistantWidget from './AIAssistantWidget'
import { gamificationApi, UserGamificationProfile } from '../api/gamification'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const [gamificationProfile, setGamificationProfile] = useState<UserGamificationProfile | null>(null)

  useEffect(() => {
    if (!user) return

    let isMounted = true
    const fetchGamification = async () => {
      try {
        const data = await gamificationApi.getMyProfile()
        if (isMounted) {
          setGamificationProfile(data)
        }
      } catch (err) {
        // Silent catch for background points fetch
      }
    }

    fetchGamification()
    const interval = setInterval(fetchGamification, 20000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [user])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-xs">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            {/* Gamification Notification Bell with unread counter */}
            <NotificationBell />

            {/* Small points indicator next to user in navigation bar */}
            {gamificationProfile && (
              <PointsBadge
                totalPoints={gamificationProfile.total_points}
                level={gamificationProfile.level}
                levelIcon={gamificationProfile.level_icon}
              />
            )}

            <div className="flex items-center gap-2 pl-1 border-l border-gray-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold shadow-2xs">
                {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-medium text-gray-800 leading-tight">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-gray-500 font-medium capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Floating AI Assistant */}
      <AIAssistantWidget />
    </div>
  )
}
