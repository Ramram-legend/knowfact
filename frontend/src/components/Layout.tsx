import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Menu, Search } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import PointsBadge from './PointsBadge'
import AIAssistantWidget from './AIAssistantWidget'
import CommandPalette from './CommandPalette'
import { gamificationApi, UserGamificationProfile } from '../api/gamification'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { user } = useAuth()
  const [gamificationProfile, setGamificationProfile] = useState<UserGamificationProfile | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!user) return

    let isMounted = true
    const fetchGamification = async () => {
      try {
        const data = await gamificationApi.getMyProfile()
        if (isMounted) {
          setGamificationProfile(data)
        }
      } catch {
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
    <div className="flex h-screen overflow-hidden bg-[#f4f5f6]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100/80 transition-colors w-64 justify-between"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-400" />
                <span>Accès rapide…</span>
              </span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                Ctrl+K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="sm:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Recherche rapide"
            >
              <Search className="h-4 w-4" />
            </button>

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

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold">
                {user?.full_name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-medium text-slate-800 leading-tight">
                  {user?.full_name}
                </span>
                <span className="text-[11px] text-slate-500 font-medium capitalize">
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

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Global Floating AI Assistant */}
      <AIAssistantWidget />
    </div>
  )
}
