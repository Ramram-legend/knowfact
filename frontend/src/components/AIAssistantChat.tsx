import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Send,
  Sparkles,
  Wrench,
  CheckSquare,
  FileText,
  Layers,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Building2,
  ThumbsUp,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react'
import { aiAssistantApi } from '../api/aiAssistant'
import { useDepartments } from '../contexts/DepartmentContext'
import type {
  AIAssistantRecommendation,
  AIAssistantResponse,
  AISuggestionPrompt,
  AssistantMode,
  ChatHistoryMessage,
} from '../types'

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AIAssistantResponse
  timestamp: number
}

interface AIAssistantChatProps {
  compact?: boolean
  initialQuery?: string
  initialMode?: AssistantMode
  onNavigate?: () => void
}

const MODE_OPTIONS: { value: AssistantMode; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tout', icon: <Layers className="h-3.5 w-3.5" /> },
  { value: 'solutions', label: 'Solutions', icon: <Wrench className="h-3.5 w-3.5" /> },
  { value: 'tasks', label: 'Tâches', icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { value: 'procedures', label: 'Procédures', icon: <FileText className="h-3.5 w-3.5" /> },
]

const STORAGE_KEY = 'knowfact_ai_chat_v1'

function typeBadge(type: string) {
  switch (type) {
    case 'problem_solution':
      return {
        label: 'Solution',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    case 'task_post':
      return {
        label: 'Tâche',
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'procedure':
      return {
        label: 'Procédure',
        cls: 'bg-purple-50 text-purple-700 border-purple-200',
      }
    default:
      return {
        label: type,
        cls: 'bg-gray-50 text-gray-700 border-gray-200',
      }
  }
}

/** Simple safe inline bold/italic renderer without raw HTML injection. */
function FormattedAnswer({ text }: { text: string }) {
  const lines = text.split('\n')

  const renderInline = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={idx} className="italic text-gray-700">
            {part.slice(1, -1)}
          </em>
        )
      }
      return <span key={idx}>{part}</span>
    })
  }

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-gray-700">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1" />
        if (trimmed.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          )
        }
        if (/^\d+\.\s/.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s(.*)$/)
          if (match) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="shrink-0 font-semibold text-primary-700">{match[1]}</span>
                <span>{renderInline(match[2])}</span>
              </div>
            )
          }
        }
        return <p key={i}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

function RecommendationCard({
  rec,
  compact,
  onNavigate,
}: {
  rec: AIAssistantRecommendation
  compact?: boolean
  onNavigate?: () => void
}) {
  const { fiche } = rec
  const badge = typeBadge(fiche.type)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-2xs transition-colors hover:border-primary-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
              {badge.label}
            </span>
            <span className="inline-flex items-center rounded-md bg-primary-50 px-1.5 py-0.5 text-[11px] font-semibold text-primary-700">
              {rec.relevance_score}% pertinent
            </span>
            {fiche.department_name && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <Building2 className="h-3 w-3" />
                {fiche.department_name}
              </span>
            )}
            {fiche.useful_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                <ThumbsUp className="h-3 w-3" />
                {fiche.useful_count}
              </span>
            )}
          </div>

          <Link
            to={`/fiches/${fiche.id}`}
            onClick={onNavigate}
            className="block text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors"
          >
            {fiche.title}
          </Link>
        </div>

        <Link
          to={`/fiches/${fiche.id}`}
          onClick={onNavigate}
          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
        >
          Ouvrir
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {fiche.equipment && (
        <p className="mt-1.5 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Équipement :</span> {fiche.equipment}
        </p>
      )}

      {!compact && rec.excerpt && (
        <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{rec.excerpt}</p>
      )}

      {rec.safety_warning && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span className="line-clamp-2">{rec.safety_warning}</span>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {rec.match_reasons.slice(0, 3).map((reason, idx) => (
            <span
              key={idx}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {reason}
            </span>
          ))}
        </div>

        {fiche.type === 'procedure' && (
          <Link
            to={`/fiches/${fiche.id}/operating-sheet`}
            onClick={onNavigate}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:underline"
          >
            <FileSpreadsheet className="h-3 w-3" />
            Fiche opératoire
          </Link>
        )}
      </div>
    </div>
  )
}

export default function AIAssistantChat({
  compact = false,
  initialQuery = '',
  initialMode = 'all',
  onNavigate,
}: AIAssistantChatProps) {
  const { departments } = useDepartments()

  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // Ignore storage errors
    }
    return []
  })
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<AssistantMode>(initialMode)
  const [departmentId, setDepartmentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestionPrompt[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastAutoQueryRef = useRef<string>('')

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)))
    } catch {
      // Ignore storage errors
    }
  }, [messages])

  useEffect(() => {
    let mounted = true
    aiAssistantApi
      .getSuggestions()
      .then((items) => {
        if (mounted) setSuggestions(items)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(
    async (text: string, overrideMode?: AssistantMode) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      const activeMode = overrideMode ?? mode
      if (overrideMode) setMode(overrideMode)

      const userMsg: AssistantMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      const historyPayload: ChatHistoryMessage[] = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setLoading(true)

      try {
        const res = await aiAssistantApi.ask({
          message: trimmed,
          mode: activeMode,
          department_id: departmentId ? Number(departmentId) : null,
          history: historyPayload,
          limit: compact ? 3 : 5,
        })

        const aiMsg: AssistantMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.answer,
          response: res,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, aiMsg])
      } catch {
        const errMsg: AssistantMessage = {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content:
            "Désolé, je n'ai pas pu contacter le service d'assistance. Vérifiez votre connexion ou réessayez.",
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setLoading(false)
      }
    },
    [loading, mode, messages, departmentId, compact],
  )

  useEffect(() => {
    const q = initialQuery.trim()
    if (q && q !== lastAutoQueryRef.current) {
      lastAutoQueryRef.current = q
      sendMessage(q, initialMode)
    }
  }, [initialQuery, initialMode, sendMessage])

  const handleClear = () => {
    setMessages([])
    sessionStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Mode & Department filter toolbar */}
      <div className="shrink-0 border-b border-gray-200 bg-gray-50/80 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {MODE_OPTIONS.map((opt) => {
              const active = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-primary-500 focus:outline-none"
              aria-label="Filtrer par département"
            >
              <option value="">Tous départements</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                title="Effacer la conversation"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 mb-3">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              Assistant IA KnowFact
            </h3>
            <p className="mt-1 max-w-md text-xs text-gray-500">
              Décrivez votre panne, un équipement ou la tâche à réaliser. Je recherche dans toutes les fiches validées et vous résume les étapes et consignes.
            </p>

            {suggestions.length > 0 && (
              <div className="mt-5 w-full max-w-lg space-y-2 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Exemples de recherches
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(s.prompt, s.mode)}
                      className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-700 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
                    >
                      <span className="truncate font-medium">{s.prompt}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[90%] space-y-3 ${
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-tr-sm bg-primary-600 px-3.5 py-2.5 text-sm text-white shadow-2xs'
                    : 'flex-1 rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50/80 px-4 py-3'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <>
                    <FormattedAnswer text={msg.content} />

                    {msg.response && msg.response.recommendations.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Fiches recommandées ({msg.response.recommendations.length})
                        </p>
                        {msg.response.recommendations.map((rec) => (
                          <RecommendationCard
                            key={rec.fiche.id}
                            rec={rec}
                            compact={compact}
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    )}

                    {msg.response && msg.response.suggested_followups.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.response.suggested_followups.map((followup, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => sendMessage(followup)}
                            className="rounded-full border border-primary-200 bg-white px-2.5 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                          >
                            {followup}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
              Analyse des fiches en cours…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage(input)
        }}
        className="shrink-0 border-t border-gray-200 bg-white p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex : Panne vibration pompe, tâches maintenance convoyeur…"
            className="input-field flex-1 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary px-3.5 py-2 shrink-0"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
            {!compact && <span>Demander</span>}
          </button>
        </div>
      </form>
    </div>
  )
}
