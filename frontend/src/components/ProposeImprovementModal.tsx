import React, { useState } from 'react'
import { Plus, Trash2, GripVertical, AlertTriangle, Lightbulb, X, Sparkles } from 'lucide-react'
import type { Fiche, ImprovementProposalPayload } from '../types'

interface ProposeImprovementModalProps {
  fiche: Fiche
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: ImprovementProposalPayload) => Promise<void>
}

export default function ProposeImprovementModal({
  fiche,
  isOpen,
  onClose,
  onSubmit,
}: ProposeImprovementModalProps) {
  const currentContent = fiche.content || {}

  const [title, setTitle] = useState(fiche.title || '')
  const [description, setDescription] = useState(currentContent.description || '')
  const [steps, setSteps] = useState<{ order: number; content: string }[]>(
    currentContent.steps && currentContent.steps.length > 0
      ? currentContent.steps.map((s) => ({ ...s }))
      : [{ order: 1, content: '' }]
  )
  const [equipment, setEquipment] = useState(currentContent.equipment || '')
  const [safetyNotes, setSafetyNotes] = useState(currentContent.safety_notes || '')
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(currentContent.tags) ? currentContent.tags.join(', ') : ''
  )
  const [improvementReason, setImprovementReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { order: prev.length + 1, content: '' }])
  }

  const handleRemoveStep = (index: number) => {
    setSteps((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((step, idx) => ({ ...step, order: idx + 1 }))
    )
  }

  const handleStepChange = (index: number, text: string) => {
    setSteps((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], content: text }
      return copy
    })
  }

  const handleAction = async (submitForReview: boolean) => {
    setReasonError('')
    if (submitForReview && !improvementReason.trim()) {
      setReasonError('Le motif de l’amélioration est obligatoire pour soumettre la proposition.')
      return
    }

    setIsSubmitting(true)
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const payload: ImprovementProposalPayload = {
        title: title.trim(),
        content: {
          description: description.trim(),
          steps: steps.filter((s) => s.content.trim().length > 0),
          equipment: equipment.trim(),
          safety_notes: safetyNotes.trim(),
          tags: parsedTags,
        },
        improvement_reason: improvementReason.trim(),
        submit: submitForReview,
      }

      await onSubmit(payload)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Proposer une solution améliorée</h2>
              <p className="text-xs text-gray-500">
                Fiche v{fiche.version} : <span className="font-medium text-gray-700">{fiche.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps du formulaire */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Avertissement de sécurité */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-950">Avertissement de sécurité :</span> Une fiche de capitalisation est un retour d’expérience terrain validé, non une procédure officielle constructeur. Conservez les règles d’hygiène et sécurité d’atelier (EPI, consignation LOTO).
            </div>
          </div>

          {/* MOTIF DE L'AMÉLIORATION (Obligatoire) */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                Motif de l’amélioration <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-blue-700 font-medium bg-blue-100 px-2 py-0.5 rounded-full">
                Obligatoire à la soumission
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Précisez la raison : solution obsolète, nouvelle méthode plus rapide, correction d’erreur, meilleure sécurité, etc.
            </p>
            <textarea
              rows={3}
              value={improvementReason}
              onChange={(e) => {
                setImprovementReason(e.target.value)
                if (reasonError) setReasonError('')
              }}
              placeholder="Ex : La nouvelle méthode de purge automatique réduit l'arrêt machine de 45 à 15 minutes et élimine le risque de projection d'huile..."
              className={`input-field bg-white ${reasonError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
            />
            {reasonError && <p className="text-xs font-medium text-red-600">{reasonError}</p>}
          </div>

          {/* Titre & Diagnostic */}
          <div className="space-y-4">
            <div>
              <label className="label">Titre de la fiche</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Titre de la fiche..."
              />
            </div>

            <div>
              <label className="label">Diagnostic / Problème & Cause</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field resize-none"
                placeholder="Description du problème, diagnostic préliminaire, causes identifiées..."
              />
            </div>
          </div>

          {/* Étapes de la solution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Étapes de la solution</label>
              <button
                type="button"
                onClick={handleAddStep}
                className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une étape
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1 pt-2 shrink-0">
                    <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                      {step.order}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={step.content}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder={`Étape ${step.order}...`}
                    className="input-field flex-1"
                  />
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(index)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Supprimer cette étape"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Équipement & Sécurité */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Équipement / Outillage requis</label>
              <textarea
                rows={2}
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="input-field resize-none text-xs"
                placeholder="Clés, manomètre, kit de joints..."
              />
            </div>
            <div>
              <label className="label">Consignes de sécurité</label>
              <textarea
                rows={2}
                value={safetyNotes}
                onChange={(e) => setSafetyNotes(e.target.value)}
                className="input-field resize-none text-xs text-amber-900 bg-amber-50/30"
                placeholder="EPI requis, consignation..."
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="label">Mots-clés / Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input-field text-xs"
              placeholder="ex: maintenance, purge, pompe, sécurité"
            />
          </div>
        </div>

        {/* Pied de page avec actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 hidden sm:block">
            La version actuelle restera active et accessible jusqu'à validation par un expert.
          </p>
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-sm px-4 py-2"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => handleAction(false)}
              disabled={isSubmitting}
              className="btn-secondary text-sm px-4 py-2 bg-white"
            >
              Enregistrer en brouillon
            </button>
            <button
              type="button"
              onClick={() => handleAction(true)}
              disabled={isSubmitting}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Soumettre pour validation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
