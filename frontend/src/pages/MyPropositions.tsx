import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Lightbulb,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { ImprovementProposal } from '../types'

export default function MyPropositions() {
  const [proposals, setProposals] = useState<ImprovementProposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProposals = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fichesApi.getMyImprovements()
      setProposals(data)
    } catch {
      setError('Impossible de charger vos propositions d’amélioration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProposals()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            Mes propositions d'amélioration
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi des solutions améliorées que vous avez soumises à la validation des experts.
          </p>
        </div>
        <Link to="/fiches" className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 self-start">
          <FileText className="h-4 w-4" /> Parcourir les fiches
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-gray-400">Chargement de vos propositions...</p>
        </div>
      ) : error ? (
        <div className="card text-center py-12 text-red-600 space-y-2">
          <AlertCircle className="h-8 w-8 mx-auto" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={loadProposals} className="btn-secondary text-xs px-3 py-1.5 mt-2">
            Réessayer
          </button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="card text-center py-16 space-y-3">
          <Sparkles className="h-12 w-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Aucune proposition d'amélioration</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Lorsque vous trouvez une fiche validée dont la méthode peut être optimisée ou mise à jour, cliquez sur « Proposer une amélioration » depuis sa page.
          </p>
          <Link to="/fiches" className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 mt-2">
            Découvrir les fiches existantes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((item) => {
            const isPending = item.status === 'pending_review'
            const isActive = item.status === 'active'
            const isToCorrect = item.status === 'to_correct'
            const isRejected = item.status === 'rejected'

            return (
              <div
                key={item.id}
                className="card hover:shadow-md transition-shadow border-l-4 border-l-blue-500 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-gray-400">v{item.version_number}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isPending
                            ? 'bg-amber-100 text-amber-800'
                            : isActive
                            ? 'bg-green-100 text-green-800'
                            : isToCorrect
                            ? 'bg-orange-100 text-orange-800'
                            : isRejected
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {isPending && 'En attente de validation'}
                        {isActive && 'Validée & En production'}
                        {isToCorrect && 'Correction requise par l’expert'}
                        {isRejected && 'Rejetée'}
                        {item.status === 'draft' && 'Brouillon'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(item.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">
                      {item.title || item.fiche_title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Fiche parente : <strong className="text-gray-700">{item.fiche_title}</strong>
                    </p>
                  </div>

                  <Link
                    to={`/fiches/improvements/${item.id}/review`}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 shrink-0 self-start mt-1 sm:mt-0"
                  >
                    Voir comparaison <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Motif de l'amélioration */}
                {item.improvement_reason && (
                  <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700 flex items-start gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-gray-900">Motif : </span>
                      {item.improvement_reason}
                    </div>
                  </div>
                )}

                {/* Retour de correction si to_correct */}
                {isToCorrect && item.latest_review_comment && (
                  <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-xs text-orange-950 flex items-start gap-2">
                    <RotateCcw className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Commentaire de l'expert : </span>
                      {item.latest_review_comment}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
