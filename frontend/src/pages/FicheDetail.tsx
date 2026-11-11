import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ArrowLeft, Edit3, Send, CheckCircle, XCircle, RotateCcw,
  Eye, Archive, Plus, ChevronDown, ChevronUp, Paperclip,
  Clock, User, AlertCircle, FileText, Sparkles, ExternalLink,
  ShieldAlert, Lightbulb, Check,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import { useAuth } from '../contexts/AuthContext'
import type { Fiche, ImprovementProposalPayload } from '../types'
import StatusBadge from '../components/StatusBadge'
import ProposeImprovementModal from '../components/ProposeImprovementModal'

const TYPE_LABELS: Record<string, string> = {
  problem_solution: 'Problem / Solution',
  task_post: 'Task Post',
  procedure: 'Procedure',
}

interface ToastProps { message: string; type: 'success' | 'error' }

function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {message}
    </div>
  )
}

interface CommentModalProps {
  title: string
  confirmLabel: string
  confirmClass?: string
  onConfirm: (comment: string) => Promise<void>
  onCancel: () => void
}

function CommentModal({ title, confirmLabel, confirmClass = 'btn-primary', onConfirm, onCancel }: CommentModalProps) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(comment)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="input-field h-24 resize-none"
          placeholder="Add an optional comment..."
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className={confirmClass}>
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FicheDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<ToastProps | null>(null)
  const [modal, setModal] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await fichesApi.get(Number(id))
      setFiche(data)
    } catch {
      setError('Fiche not found or access denied.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const doAction = async (action: () => Promise<Fiche>, successMsg: string) => {
    try {
      const updated = await action()
      setFiche(updated)
      showToast(successMsg, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Action failed.', 'error')
    }
  }

  const handleProposeImprovement = async (payload: ImprovementProposalPayload) => {
    if (!fiche) return
    try {
      await fichesApi.proposeImprovement(fiche.id, payload)
      showToast(
        payload.submit
          ? 'Proposition d’amélioration soumise avec succès pour validation.'
          : 'Brouillon d’amélioration enregistré.',
        'success'
      )
      load()
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur lors de la proposition.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !fiche) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p>{error || 'Fiche not found.'}</p>
        <Link to="/fiches" className="btn-secondary mt-2">← Back to list</Link>
      </div>
    )
  }

  // content is a parsed JSON object from backend
  const content = (fiche.content as any) ?? {}
  const description: string = content.description ?? ''
  const steps: Array<{ order: number; content: string }> = content.steps ?? []
  const tags: string[] = content.tags ?? []
  const equipment: string = content.equipment ?? ''
  const safetyNotes: string = content.safety_notes ?? ''

  const isAuthor = user?.id === fiche.author_id
  const isExpertOrAdmin = user?.role === 'expert' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  const canEdit = isAuthor && (fiche.status === 'draft' || fiche.status === 'to_correct')
  const canSubmit = isAuthor && (fiche.status === 'draft' || fiche.status === 'to_correct')
  const canStartReview = isExpertOrAdmin && fiche.status === 'submitted'
  const canValidate = isExpertOrAdmin && fiche.status === 'under_review'
  const canReject = isExpertOrAdmin && fiche.status === 'under_review'
  const canRequestCorrection = isExpertOrAdmin && fiche.status === 'under_review'
  const canPublish = isExpertOrAdmin && fiche.status === 'validated'
  const canArchive = isAdmin && (fiche.status === 'published' || fiche.status === 'validated')
  const canNewVersion = isExpertOrAdmin && fiche.status === 'published'

  // Amélioration de solution existante
  const isEngineerOrTechnician = user?.role === 'engineer' || user?.role === 'technician'
  const isFicheValidatedOrPublished = fiche.status === 'published' || fiche.status === 'validated'
  const hasMyPendingProposal = fiche.versions?.some(
    (v) => v.changed_by === user?.id && (v.status === 'pending_review' || v.status === 'to_correct')
  )
  const canProposeImprovement = isEngineerOrTechnician && isFicheValidatedOrPublished && !hasMyPendingProposal

  return (
    <div className="space-y-5 max-w-4xl">
      {toast && <Toast {...toast} />}

      {/* Propose improvement modal */}
      <ProposeImprovementModal
        fiche={fiche}
        isOpen={isImproveModalOpen}
        onClose={() => setIsImproveModalOpen(false)}
        onSubmit={handleProposeImprovement}
      />

      {/* Comment modals */}
      {modal === 'submit' && (
        <CommentModal
          title="Submit Fiche for Review"
          confirmLabel="Submit"
          onConfirm={async () => {
            await doAction(() => fichesApi.submit(fiche.id), 'Fiche submitted for review.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'validate' && (
        <CommentModal
          title="Validate Fiche"
          confirmLabel="Validate"
          onConfirm={async (comment) => {
            await doAction(() => fichesApi.validate(fiche.id, { comment }), 'Fiche validated.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'reject' && (
        <CommentModal
          title="Reject Fiche"
          confirmLabel="Reject"
          confirmClass="bg-red-600 text-white hover:bg-red-700 btn"
          onConfirm={async (comment) => {
            await doAction(() => fichesApi.reject(fiche.id, { comment }), 'Fiche rejected.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'correct' && (
        <CommentModal
          title="Request Correction"
          confirmLabel="Request Correction"
          confirmClass="btn-amber"
          onConfirm={async (comment) => {
            await doAction(() => fichesApi.requestCorrection(fiche.id, { comment }), 'Correction requested.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'publish' && (
        <CommentModal
          title="Publish Fiche"
          confirmLabel="Publish"
          onConfirm={async () => {
            await doAction(() => fichesApi.publish(fiche.id), 'Fiche published.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === 'archive' && (
        <CommentModal
          title="Archive Fiche"
          confirmLabel="Archive"
          confirmClass="btn-secondary"
          onConfirm={async () => {
            await doAction(() => fichesApi.archive(fiche.id), 'Fiche archived.')
            setModal(null)
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Back + header */}
      <div>
        <Link
          to="/fiches"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Fiches
        </Link>

        {/* Bandeau discret si une amélioration est en cours de validation */}
        {fiche.has_pending_improvement && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/70 p-3.5 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                <strong>Une amélioration est en cours de validation par un expert.</strong> La version actuelle reste active et utilisable.
              </span>
            </div>
            {fiche.pending_improvement_id && (
              <Link
                to={`/fiches/improvements/${fiche.pending_improvement_id}/review`}
                className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-950 underline shrink-0"
              >
                Consulter la proposition <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-purple-100 text-purple-700 px-2.5 py-0.5 text-xs font-medium">
                {TYPE_LABELS[fiche.type] ?? fiche.type}
              </span>
              <StatusBadge status={fiche.status} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{fiche.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {fiche.author_name || fiche.author?.full_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(fiche.updated_at), 'MMM d, yyyy')}
              </span>
              <span className="text-xs">v{fiche.version}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {/* Bouton Proposer une amélioration */}
            {canProposeImprovement && (
              <button
                onClick={() => setIsImproveModalOpen(true)}
                className="btn-primary flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                <Sparkles className="h-4 w-4" />
                Proposer une amélioration
              </button>
            )}

            {canEdit && (
              <Link to={`/fiches/${fiche.id}/edit`} className="btn-secondary">
                <Edit3 className="h-4 w-4" />
                Edit
              </Link>
            )}
            {canSubmit && (
              <button onClick={() => setModal('submit')} className="btn-primary">
                <Send className="h-4 w-4" />
                Submit
              </button>
            )}
            {canStartReview && (
              <button
                onClick={() => doAction(() => fichesApi.startReview(fiche.id), 'Review started.')}
                className="btn-amber"
              >
                <Eye className="h-4 w-4" />
                Start Review
              </button>
            )}
            {canValidate && (
              <button onClick={() => setModal('validate')} className="btn-primary">
                <CheckCircle className="h-4 w-4" />
                Validate
              </button>
            )}
            {canRequestCorrection && (
              <button onClick={() => setModal('correct')} className="btn-amber">
                <RotateCcw className="h-4 w-4" />
                Request Correction
              </button>
            )}
            {canReject && (
              <button onClick={() => setModal('reject')} className="bg-red-600 text-white hover:bg-red-700 btn flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            )}
            {canPublish && (
              <button onClick={() => setModal('publish')} className="btn-primary">
                <CheckCircle className="h-4 w-4" />
                Publish
              </button>
            )}
            {canArchive && (
              <button onClick={() => setModal('archive')} className="btn-secondary">
                <Archive className="h-4 w-4" />
                Archive
              </button>
            )}
            {canNewVersion && (
              <button
                onClick={async () => {
                  try {
                    const newFiche = await fichesApi.newVersion(fiche.id)
                    showToast('New version created.', 'success')
                    navigate(`/fiches/${newFiche.id}/edit`)
                  } catch (err: any) {
                    showToast(err?.response?.data?.detail ?? 'Failed.', 'error')
                  }
                }}
                className="btn-secondary"
              >
                <Plus className="h-4 w-4" />
                New Version
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Avertissement de sécurité */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-center gap-2.5 shadow-sm">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
        <span>
          <strong>Rappel de sécurité :</strong> Cette fiche validée est un retour d’expérience terrain et une capitalisation des connaissances industrielles. Elle ne remplace pas les manuels constructeurs officiels. Respectez toujours les consignes d’atelier, le port des EPI et les procédures de consignation.
        </span>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {description || <span className="text-gray-400 italic">No description provided.</span>}
            </p>
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Steps</h2>
              <ol className="space-y-3">
                {steps
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold shrink-0 mt-0.5">
                        {step.order}
                      </span>
                      <p className="text-sm text-gray-700 leading-relaxed">{step.content}</p>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {/* Safety notes */}
          {safetyNotes && (
            <div className="card border-amber-200 bg-amber-50">
              <h2 className="text-base font-semibold text-amber-800 mb-2">⚠ Safety Notes</h2>
              <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                {safetyNotes}
              </p>
            </div>
          )}

          {/* Review comment */}
          {fiche.review_comment && (
            <div className="card border-blue-200 bg-blue-50">
              <h2 className="text-base font-semibold text-blue-800 mb-2">Review Comment</h2>
              <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                {fiche.review_comment}
              </p>
            </div>
          )}

          {/* Attachments */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-gray-500" />
              Attachments
            </h2>
            {fiche.attachments && fiche.attachments.length > 0 ? (
              <ul className="space-y-2">
                {fiche.attachments.map((att) => (
                  <li key={att.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <a
                      href={`http://localhost:8000/uploads/${fiche.id}/${att.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {att.filename}
                    </a>
                    <span className="text-gray-400 text-xs">
                      — {format(new Date(att.created_at), 'MMM d, yyyy')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">No attachments.</p>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          <div className="card space-y-4">
            {equipment && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Equipment</h3>
                <p className="text-sm text-gray-700">{equipment}</p>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary-50 text-primary-700 px-2.5 py-0.5 text-xs font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fiche.reviewer_name && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Reviewer</h3>
                <p className="text-sm text-gray-700">{fiche.reviewer_name}</p>
              </div>
            )}
            {fiche.published_at && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Published</h3>
                <p className="text-sm text-gray-700">{format(new Date(fiche.published_at), 'MMM d, yyyy')}</p>
              </div>
            )}
            {fiche.validated_at && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Validated</h3>
                <p className="text-sm text-gray-700">{format(new Date(fiche.validated_at), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Version history */}
          {fiche.versions && fiche.versions.length > 0 && (
            <div className="card space-y-3">
              <button
                onClick={() => setShowVersions(!showVersions)}
                className="flex w-full items-center justify-between text-base font-semibold text-gray-900"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Historique des versions ({fiche.versions.length})
                </span>
                {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showVersions && (
                <ul className="space-y-3 pt-2">
                  {fiche.versions.map((v) => {
                    const isPending = v.status === 'pending_review'
                    const isActive = v.status === 'active'
                    const isSuperseded = v.status === 'superseded'
                    const isToCorrect = v.status === 'to_correct'
                    const isRejected = v.status === 'rejected'

                    return (
                      <li
                        key={v.id}
                        className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 text-sm">v{v.version_number}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isActive
                                  ? 'bg-green-100 text-green-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : isSuperseded
                                  ? 'bg-gray-200 text-gray-700'
                                  : isToCorrect
                                  ? 'bg-orange-100 text-orange-800'
                                  : isRejected
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {isActive && 'Version active'}
                              {isPending && 'En attente de validation'}
                              {isSuperseded && 'Remplacée / archivée'}
                              {isToCorrect && 'À corriger'}
                              {isRejected && 'Rejetée'}
                              {v.status === 'draft' && 'Brouillon'}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-400">
                            {format(new Date(v.created_at), 'dd MMM yyyy')}
                          </span>
                        </div>

                        {v.title && v.title !== fiche.title && (
                          <p className="font-medium text-gray-800">{v.title}</p>
                        )}

                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span>Auteur : <strong>{v.author_name || 'Utilisateur'}</strong></span>
                        </div>

                        {(v.improvement_reason || v.change_reason) && (
                          <div className="bg-white rounded border border-gray-100 p-2 text-[11px] text-gray-700">
                            <span className="font-semibold text-gray-900">Motif : </span>
                            {v.improvement_reason || v.change_reason}
                          </div>
                        )}

                        {/* Reviews associés */}
                        {v.reviews && v.reviews.length > 0 && (
                          <div className="border-t border-gray-200 pt-1.5 space-y-1">
                            <p className="font-semibold text-[10px] text-gray-500 uppercase tracking-wider">
                              Avis de validation :
                            </p>
                            {v.reviews.map((r) => (
                              <div key={r.id} className="text-[10px] text-gray-600 bg-white/70 p-1 rounded">
                                <strong
                                  className={
                                    r.decision === 'validate'
                                      ? 'text-green-700'
                                      : r.decision === 'request_correction'
                                      ? 'text-orange-700'
                                      : 'text-red-700'
                                  }
                                >
                                  {r.decision === 'validate' && 'Validé : '}
                                  {r.decision === 'request_correction' && 'Correction demandée : '}
                                  {r.decision === 'reject' && 'Rejeté : '}
                                </strong>
                                <span>{r.comment}</span>
                                <span className="text-gray-400 ml-1">({r.reviewer_name})</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bouton pour comparer si proposition */}
                        <div className="pt-1">
                          <Link
                            to={`/fiches/improvements/${v.id}/review`}
                            className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
                          >
                            Comparer cette version <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
