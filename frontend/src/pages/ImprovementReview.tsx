import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  User,
  Clock,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  FileText,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import type { VersionDiff } from '../types'

interface ReviewModalProps {
  action: 'validate' | 'request_correction' | 'reject'
  isOpen: boolean
  onClose: () => void
  onConfirm: (comment: string) => Promise<void>
}

function ReviewModal({ action, isOpen, onClose, onConfirm }: ReviewModalProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const isCorrection = action === 'request_correction'
  const isReject = action === 'reject'
  const isValidate = action === 'validate'

  const title = isValidate
    ? 'Valider et activer cette amélioration'
    : isCorrection
    ? 'Demander des corrections à l’auteur'
    : 'Rejeter cette proposition d’amélioration'

  const confirmLabel = isValidate
    ? 'Confirmer la validation'
    : isCorrection
    ? 'Envoyer la demande de correction'
    : 'Confirmer le rejet'

  const confirmClass = isValidate
    ? 'bg-green-600 hover:bg-green-700 text-white'
    : isCorrection
    ? 'bg-amber-600 hover:bg-amber-700 text-white'
    : 'bg-red-600 hover:bg-red-700 text-white'

  const handleConfirm = async () => {
    if ((isCorrection || isReject) && !comment.trim()) {
      setError('Un commentaire explicatif est obligatoire.')
      return
    }
    setLoading(true)
    try {
      await onConfirm(comment.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>

        <p className="text-xs text-gray-600">
          {isValidate &&
            'La nouvelle version remplacera la version active immédiatement. L’ancienne version restera consultable dans l’historique.'}
          {isCorrection &&
            'La proposition repassera entre les mains de l’auteur avec vos remarques pour correction.'}
          {isReject &&
            'La proposition sera marquée comme rejetée. La version actuellement en ligne restera inchangée.'}
        </p>

        <div>
          <label className="label text-xs">
            {isValidate ? 'Commentaire d’approbation (optionnel)' : 'Motif / Remarques (obligatoire) *'}
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value)
              if (error) setError('')
            }}
            placeholder={
              isValidate
                ? 'Ex : Excellente optimisation, validée pour déploiement...'
                : isCorrection
                ? 'Ex : Merci de préciser le couple de serrage et la référence du joint...'
                : 'Ex : Procédure non conforme aux normes ATEX en vigueur...'
            }
            className={`input-field text-sm ${error ? 'border-red-500' : ''}`}
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={loading} className="btn-secondary text-sm">
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`btn text-sm px-4 py-2 rounded-lg font-medium ${confirmClass}`}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ImprovementReview() {
  const { versionId } = useParams<{ versionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [diffData, setDiffData] = useState<VersionDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAction, setModalAction] = useState<'validate' | 'request_correction' | 'reject' | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  const loadDiff = useCallback(async () => {
    if (!versionId) return
    setLoading(true)
    setError('')
    try {
      const data = await fichesApi.getImprovementDiff(Number(versionId))
      setDiffData(data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Impossible de charger la comparaison de l’amélioration.')
    } finally {
      setLoading(false)
    }
  }, [versionId])

  useEffect(() => {
    loadDiff()
  }, [loadDiff])

  const handleReviewAction = async (comment: string) => {
    if (!diffData || !modalAction) return
    try {
      const updatedDiff = await fichesApi.reviewImprovementProposal(diffData.version_id, {
        action: modalAction,
        comment,
      })
      setDiffData(updatedDiff)
      const msg =
        modalAction === 'validate'
          ? 'Amélioration validée avec succès ! La nouvelle version est maintenant active.'
          : modalAction === 'request_correction'
          ? 'Demande de correction transmise à l’auteur.'
          : 'Proposition d’amélioration rejetée.'
      setSuccessMessage(msg)
      setModalAction(null)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Une erreur est survenue lors de l’opération.')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
        <p className="text-sm text-gray-500">Chargement de la comparaison côte-à-côte...</p>
      </div>
    )
  }

  if (error || !diffData) {
    return (
      <div className="card text-center py-16 space-y-3">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Erreur</h2>
        <p className="text-sm text-gray-600">{error || 'Proposition introuvable.'}</p>
        <button onClick={() => navigate(-1)} className="btn-secondary text-sm inline-flex items-center gap-1.5 mt-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
      </div>
    )
  }

  const isAuthor = user?.id === diffData.proposer_id
  const isExpertOrAdmin = user?.role === 'expert' || user?.role === 'admin'
  const isPending = diffData.status === 'pending_review'
  const canDecide = isExpertOrAdmin && !isAuthor && isPending

  const oldSteps = diffData.old_content?.steps || []
  const newSteps = diffData.new_content?.steps || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Toast de succès */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
          <Link
            to={`/fiches/${diffData.fiche_id}`}
            className="text-xs font-bold text-green-900 underline hover:text-green-700"
          >
            Voir la fiche à jour →
          </Link>
        </div>
      )}

      {/* Navigation retour */}
      <div className="flex items-center justify-between">
        <Link
          to={`/fiches/${diffData.fiche_id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la fiche : {diffData.fiche_title}
        </Link>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            diffData.status === 'pending_review'
              ? 'bg-amber-100 text-amber-800'
              : diffData.status === 'active'
              ? 'bg-green-100 text-green-800'
              : diffData.status === 'to_correct'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {diffData.status === 'pending_review' && 'En attente de validation'}
          {diffData.status === 'active' && 'Validée & Active'}
          {diffData.status === 'to_correct' && 'Correction demandée'}
          {diffData.status === 'rejected' && 'Rejetée'}
          {diffData.status === 'draft' && 'Brouillon'}
        </span>
      </div>

      {/* En-tête de la proposition */}
      <div className="card border-l-4 border-l-blue-600 bg-white shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                Proposition d'amélioration
              </span>
              <span className="text-xs text-gray-400">
                {format(new Date(diffData.created_at), 'dd MMM yyyy à HH:mm')}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {diffData.proposed_title || diffData.fiche_title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-gray-400" />
                Proposé par <strong className="text-gray-800">{diffData.proposer_name}</strong> ({diffData.proposer_role})
              </span>
            </div>
          </div>

          {/* Boutons d'action pour le valideur */}
          {canDecide && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setModalAction('reject')}
                className="btn-danger text-xs px-3 py-2 flex items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Rejeter
              </button>
              <button
                onClick={() => setModalAction('request_correction')}
                className="btn-amber text-xs px-3 py-2 flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                Demander correction
              </button>
              <button
                onClick={() => setModalAction('validate')}
                className="btn-primary text-xs px-4 py-2 bg-green-600 hover:bg-green-700 flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Valider l'amélioration
              </button>
            </div>
          )}

          {/* Règle anti-auto-validation */}
          {isAuthor && isPending && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-xs text-blue-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Note :</strong> Vous êtes l’auteur de cette proposition. Pour garantir la qualité, seul un autre expert ou administrateur peut la valider.
              </span>
            </div>
          )}
        </div>

        {/* Bloc Motif obligatoire mis en valeur */}
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            Motif de l’amélioration (justification métier) :
          </div>
          <p className="text-sm font-medium text-blue-950 whitespace-pre-wrap leading-relaxed">
            {diffData.improvement_reason || 'Aucun motif renseigné.'}
          </p>
        </div>
      </div>

      {/* Tableau de comparaison côte-à-côte */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-600" />
            Comparaison détaillée des versions (Diff)
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> Version actuelle
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Version proposée (modifiée)
            </span>
          </div>
        </div>

        {/* 1. Titre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-gray-50/70 border border-gray-200">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
              Titre actuel
            </span>
            <p className="text-sm font-medium text-gray-800">{diffData.fiche_title}</p>
          </div>
          <div
            className={`card border ${
              diffData.diff_summary.title_changed
                ? 'bg-green-50/70 border-green-300 ring-1 ring-green-400'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Titre proposé
              </span>
              {diffData.diff_summary.title_changed && (
                <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                  Modifié
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-900">{diffData.proposed_title}</p>
          </div>
        </div>

        {/* 2. Diagnostic & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-gray-50/70 border border-gray-200 space-y-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Diagnostic & Cause actuels
            </span>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
              {diffData.old_content?.description || <span className="text-gray-400 italic">Vide</span>}
            </p>
          </div>
          <div
            className={`card border space-y-2 ${
              diffData.diff_summary.description_changed
                ? 'bg-green-50/60 border-green-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Diagnostic & Cause proposés
              </span>
              {diffData.diff_summary.description_changed && (
                <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                  Amélioré
                </span>
              )}
            </div>
            <p className="text-xs text-gray-900 whitespace-pre-wrap leading-relaxed">
              {diffData.new_content?.description || <span className="text-gray-400 italic">Vide</span>}
            </p>
          </div>
        </div>

        {/* 3. Étapes de la solution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Étapes actuelles */}
          <div className="card bg-gray-50/70 border border-gray-200 space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Étapes actuelles ({oldSteps.length})
              </span>
            </div>
            {oldSteps.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucune étape enregistrée.</p>
            ) : (
              <ol className="space-y-2">
                {oldSteps.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-white p-2 rounded border border-gray-100">
                    <span className="font-bold text-gray-400 shrink-0">{s.order || idx + 1}.</span>
                    <span>{s.content}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Étapes proposées */}
          <div
            className={`card border space-y-2.5 ${
              diffData.diff_summary.steps_changed
                ? 'bg-green-50/50 border-green-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Nouvelles étapes proposées ({newSteps.length})
              </span>
              {diffData.diff_summary.steps_changed && (
                <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                  Étapes modifiées
                </span>
              )}
            </div>
            {newSteps.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucune étape proposée.</p>
            ) : (
              <ol className="space-y-2">
                {newSteps.map((s, idx) => {
                  const isNewOrModified =
                    idx >= oldSteps.length || oldSteps[idx]?.content !== s.content
                  return (
                    <li
                      key={idx}
                      className={`flex items-start gap-2 text-xs p-2 rounded border ${
                        isNewOrModified
                          ? 'bg-green-100/70 border-green-300 text-green-950 font-medium'
                          : 'bg-white border-gray-200 text-gray-800'
                      }`}
                    >
                      <span
                        className={`font-bold shrink-0 ${
                          isNewOrModified ? 'text-green-700' : 'text-gray-400'
                        }`}
                      >
                        {s.order || idx + 1}.
                      </span>
                      <span className="flex-1">{s.content}</span>
                      {isNewOrModified && (
                        <Check className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>

        {/* 4. Équipements & Consignes de sécurité */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-gray-50/70 border border-gray-200 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Équipement actuel
              </span>
              <p className="text-xs text-gray-700">{diffData.old_content?.equipment || '—'}</p>
            </div>
            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Sécurité actuelle
              </span>
              <p className="text-xs text-gray-700">{diffData.old_content?.safety_notes || '—'}</p>
            </div>
          </div>

          <div
            className={`card border space-y-3 ${
              diffData.diff_summary.equipment_changed || diffData.diff_summary.safety_notes_changed
                ? 'bg-green-50/50 border-green-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Équipement proposé
                </span>
                {diffData.diff_summary.equipment_changed && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                    Mis à jour
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-900 font-medium">
                {diffData.new_content?.equipment || '—'}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                  Sécurité proposée
                </span>
                {diffData.diff_summary.safety_notes_changed && (
                  <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                    Mis à jour
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-900 bg-amber-50/80 p-2 rounded border border-amber-200">
                {diffData.new_content?.safety_notes || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Mots-clés / Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-gray-50/70 border border-gray-200">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Tags actuels
            </span>
            <div className="flex flex-wrap gap-1">
              {(diffData.old_content?.tags || []).map((t: string) => (
                <span key={t} className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <div
            className={`card border ${
              diffData.diff_summary.tags_changed
                ? 'bg-green-50/50 border-green-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
              Tags proposés
            </span>
            <div className="flex flex-wrap gap-1">
              {(diffData.new_content?.tags || []).map((t: string) => (
                <span key={t} className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Historique des avis d'experts sur cette proposition */}
      {diffData.reviews && diffData.reviews.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Historique des avis et décisions sur cette proposition
          </h3>
          <div className="space-y-2">
            {diffData.reviews.map((rev) => (
              <div key={rev.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-bold ${
                      rev.decision === 'validate'
                        ? 'text-green-700'
                        : rev.decision === 'request_correction'
                        ? 'text-orange-700'
                        : 'text-red-700'
                    }`}
                  >
                    {rev.decision === 'validate' && 'Validée'}
                    {rev.decision === 'request_correction' && 'Correction demandée'}
                    {rev.decision === 'reject' && 'Rejetée'}
                  </span>
                  <span className="text-gray-400">
                    {format(new Date(rev.created_at), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
                <p className="text-gray-700 italic">« {rev.comment} »</p>
                <p className="text-[10px] text-gray-400 text-right">Par {rev.reviewer_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modale d'action */}
      {modalAction && (
        <ReviewModal
          action={modalAction}
          isOpen={true}
          onClose={() => setModalAction(null)}
          onConfirm={handleReviewAction}
        />
      )}
    </div>
  )
}
