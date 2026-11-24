import { useSearchParams } from 'react-router-dom'
import { Bot, Sparkles, Wrench, CheckSquare, FileText } from 'lucide-react'
import AIAssistantChat from '../components/AIAssistantChat'
import type { AssistantMode } from '../types'

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const rawMode = searchParams.get('mode') || 'all'
  const initialMode: AssistantMode =
    rawMode === 'solutions' || rawMode === 'tasks' || rawMode === 'procedures' ? rawMode : 'all'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Assistant IA KnowFact
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 border border-primary-200">
                <Sparkles className="h-3 w-3" />
                Recherche intelligente
              </span>
            </h1>
            <p className="text-sm text-gray-500">
              Posez votre question en langage naturel pour trouver rapidement une solution, une tâche ou une procédure.
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-1 font-medium border border-emerald-200">
            <Wrench className="h-3.5 w-3.5" /> Solutions
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 px-2.5 py-1 font-medium border border-blue-200">
            <CheckSquare className="h-3.5 w-3.5" /> Tâches
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 text-purple-700 px-2.5 py-1 font-medium border border-purple-200">
            <FileText className="h-3.5 w-3.5" /> Procédures
          </span>
        </div>
      </div>

      {/* Main chat container */}
      <div className="h-[calc(100vh-13.5rem)] min-h-[500px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <AIAssistantChat initialQuery={initialQuery} initialMode={initialMode} />
      </div>
    </div>
  )
}
