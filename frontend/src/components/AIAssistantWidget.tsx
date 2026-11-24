import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bot, Maximize2, Sparkles, X } from 'lucide-react'
import AIAssistantChat from './AIAssistantChat'

export default function AIAssistantWidget() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Masquer le widget flottant sur la page dédiée /assistant
  if (location.pathname === '/assistant') {
    return null
  }

  return (
    <div className="print:hidden">
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 flex h-[560px] max-h-[calc(100vh-6.5rem)] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Drawer header */}
          <div className="flex shrink-0 items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-tight">Assistant IA KnowFact</h3>
                <p className="text-[11px] text-slate-300">Solutions, tâches & procédures</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/assistant')
                }}
                title="Ouvrir en plein écran"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Fermer"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat body */}
          <div className="min-h-0 flex-1">
            <AIAssistantChat compact onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Floating launcher button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-4 sm:right-6 z-40 inline-flex items-center gap-2.5 rounded-full bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all"
        aria-label="Ouvrir l'Assistant IA"
      >
        {open ? (
          <>
            <X className="h-4 w-4" />
            <span>Fermer</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Assistant IA</span>
          </>
        )}
      </button>
    </div>
  )
}
