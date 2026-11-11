import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Clock,
  Sparkles,
  ArrowRight,
  User,
  Lightbulb,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { ImprovementProposal } from '../types'

export default function PendingReviews() {
  const [pendingList, setPendingList] = useState<ImprovementProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPending = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fichesApi.getPendingImprovements()
      setPendingList(data)
    } catch {
      setError('Impossible de charger les propositions en attente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600" />
            File de validation des améliorations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Propositions soumises par les ingénieurs et techniciens nécessitant votre validation d’expert.
          </p>
        </div>
        <span className="bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full self-start">
          {pendingList.length} en attente
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent mb-2" />
          <p className="text-xs text-gray-400">Chargement de la file d’attente...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-12 text-red-600 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={loadPending} className="btn-secondary text-xs px-3 py-1.5 mt-2">
            Réessayer
          </button>
        </div>
      ) : pendingList.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Toutes les améliorations sont à jour !</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Aucune proposition n’est actuellement en attente de validation. Bravo pour votre réactivité !
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingList.map((item) => (
            <div
              key={item.id}
              className="card border-l-4 border-l-amber-500 hover:shadow-md transition-shadow space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Proposition v{item.version_number}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(item.created_at), 'dd MMM yyyy à HH:mm')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900">
                    {item.title || item.fiche_title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400" />
                      Auteur : <strong className="text-gray-800">{item.author_name}</strong>
                    </span>
                    <span>•</span>
                    <span>Fiche : <em>{item.fiche_title}</em></span>
                  </div>
                </div>

                <Link
                  to={`/fiches/improvements/${item.id}/review`}
                  className="btn-primary text-xs px-4 py-2 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 shrink-0 self-start shadow-sm"
                >
                  Examiner et comparer <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Motif de l'amélioration */}
              {item.improvement_reason && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-950 flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Motif renseigné par l'ingénieur : </span>
                    {item.improvement_reason}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
