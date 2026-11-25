import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  FileText,
  LayoutDashboard,
  PlusCircle,
  Bot,
  Trophy,
  Award,
  Building2,
  CornerDownLeft,
  X,
} from 'lucide-react'
import { searchApi } from '../api/search'
import { useDepartments } from '../contexts/DepartmentContext'
import { useAuth } from '../contexts/AuthContext'
import type { Fiche } from '../types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

interface PaletteItem {
  id: string
  label: string
  subtitle?: string
  to: string
  group: 'Navigation' | 'Départements' | 'Fiches trouvées'
  icon: React.ReactNode
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { departments } = useDepartments()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setFiches([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [isOpen])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setFiches([])
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.search({ q: trimmed })
        if (!cancelled) {
          setFiches((res.results ?? []).slice(0, 6))
        }
      } catch {
        if (!cancelled) setFiches([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const staticItems = useMemo<PaletteItem[]>(() => {
    const nav: PaletteItem[] = [
      {
        id: 'nav-dashboard',
        label: 'Tableau de bord',
        subtitle: 'Vue globale & indicateurs',
        to: '/dashboard',
        group: 'Navigation',
        icon: <LayoutDashboard className="h-4 w-4 text-slate-500" />,
      },
      {
        id: 'nav-fiches',
        label: 'Toutes les fiches',
        subtitle: 'Catalogue des fiches techniques',
        to: '/fiches',
        group: 'Navigation',
        icon: <FileText className="h-4 w-4 text-slate-500" />,
      },
      {
        id: 'nav-assistant',
        label: 'Assistant IA',
        subtitle: 'Poser une question technique sourcée',
        to: '/assistant',
        group: 'Navigation',
        icon: <Bot className="h-4 w-4 text-primary-600" />,
      },
      {
        id: 'nav-search',
        label: 'Recherche avancée',
        subtitle: 'Filtrer par département, type ou statut',
        to: '/search',
        group: 'Navigation',
        icon: <Search className="h-4 w-4 text-slate-500" />,
      },
      {
        id: 'nav-achievements',
        label: 'Mes Succès & Points',
        to: '/achievements',
        group: 'Navigation',
        icon: <Trophy className="h-4 w-4 text-amber-500" />,
      },
      {
        id: 'nav-leaderboard',
        label: 'Classement',
        to: '/leaderboard',
        group: 'Navigation',
        icon: <Award className="h-4 w-4 text-primary-600" />,
      },
    ]

    if (user?.role !== 'operator') {
      nav.splice(2, 0, {
        id: 'nav-new-fiche',
        label: 'Créer une nouvelle fiche',
        subtitle: 'Procédure, poste ou problème/solution',
        to: '/fiches/new',
        group: 'Navigation',
        icon: <PlusCircle className="h-4 w-4 text-primary-600" />,
      })
    }

    const depts: PaletteItem[] = departments.map((d) => ({
      id: `dept-${d.id}`,
      label: d.name,
      subtitle: `${d.code} · ${d.workstations.filter((w) => w.is_active).length} poste(s)`,
      to: `/departements/${d.id}`,
      group: 'Départements',
      icon: <Building2 className="h-4 w-4" style={{ color: d.color }} />,
    }))

    return [...nav, ...depts]
  }, [departments, user?.role])

  const filteredItems = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    const matchingStatic = q
      ? staticItems.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.subtitle && item.subtitle.toLowerCase().includes(q))
        )
      : staticItems

    const ficheItems: PaletteItem[] = fiches.map((f) => ({
      id: `fiche-${f.id}`,
      label: f.title,
      subtitle: f.content?.equipment ? `Équipement : ${f.content.equipment}` : f.type,
      to: `/fiches/${f.id}`,
      group: 'Fiches trouvées',
      icon: <FileText className="h-4 w-4 text-primary-600" />,
    }))

    return [...ficheItems, ...matchingStatic]
  }, [query, staticItems, fiches])

  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems.length])

  const handleSelect = (item: PaletteItem) => {
    onClose()
    navigate(item.to)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) =>
        filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      )
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault()
      handleSelect(filteredItems[selectedIndex])
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 backdrop-blur-[2px] pt-[12vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commande rapide"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une fiche, un département ou une page…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {searching && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent shrink-0" />
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex
                const prevGroup = idx > 0 ? filteredItems[idx - 1].group : null
                const showHeader = item.group !== prevGroup
                return (
                  <li key={item.id}>
                    {showHeader && (
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {item.group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                        isSelected ? 'bg-primary-50 text-primary-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          {item.subtitle && (
                            <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd> naviguer
            </span>
            <span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> ouvrir
            </span>
          </div>
          <span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">Échap</kbd> fermer
          </span>
        </div>
      </div>
    </div>
  )
}
