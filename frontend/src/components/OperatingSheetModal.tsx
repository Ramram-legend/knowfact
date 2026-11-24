import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Printer,
  Download,
  Edit3,
  RotateCw,
  Save,
  Maximize2,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tablet,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { OperatingSheet } from '../types'
import OperatingSheetView from './OperatingSheetView'

interface OperatingSheetModalProps {
  ficheId: number
  isOpen: boolean
  onClose: () => void
  initialSheet?: OperatingSheet | null
}

export default function OperatingSheetModal({
  ficheId,
  isOpen,
  onClose,
  initialSheet,
}: OperatingSheetModalProps) {
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<OperatingSheet | null>(initialSheet || null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [fieldMode, setFieldMode] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3500)
  }

  // Load sheet when opened if not passed
  useEffect(() => {
    if (!isOpen) return
    if (initialSheet) {
      setSheet(initialSheet)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await fichesApi.getOperatingSheet(ficheId)
        setSheet(data)
      } catch (err: any) {
        showMsg(err?.response?.data?.detail || 'Erreur lors du chargement de la fiche opératoire.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen, ficheId, initialSheet])

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const data = await fichesApi.generateOperatingSheet(ficheId, true)
      setSheet(data)
      setIsEditing(false)
      showMsg('Fiche opératoire régénérée et simplifiée avec succès !', 'success')
    } catch (err: any) {
      showMsg(err?.response?.data?.detail || 'Erreur lors de la régénération.', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async () => {
    if (!sheet) return
    setSaving(true)
    try {
      const saved = await fichesApi.saveOperatingSheet(ficheId, sheet)
      setSheet(saved)
      setIsEditing(false)
      showMsg('Modifications enregistrées avec succès.', 'success')
    } catch (err: any) {
      showMsg(err?.response?.data?.detail || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleOpenFullPage = () => {
    onClose()
    navigate(`/fiches/${ficheId}/operating-sheet`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-300 print:border-none print:shadow-none print:max-h-none print:h-auto print:rounded-none">
        {/* Modal Top Action Toolbar — Hidden in print */}
        <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Fiche Opératoire Simplifiée (SOP)
              </h2>
              <p className="text-[11px] text-slate-500">
                Générée automatiquement pour les opérateurs de terrain
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Terrain Toggle */}
            <button
              onClick={() => setFieldMode(!fieldMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                fieldMode
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Tablet className="h-3.5 w-3.5 text-emerald-600" />
              <span>{fieldMode ? 'Mode Terrain Actif' : 'Mode Terrain'}</span>
            </button>

            {/* Mode Édition Toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isEditing
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-600" />
              <span>{isEditing ? 'Mode Lecture' : 'Personnaliser'}</span>
            </button>

            {/* Sauvegarder si édition */}
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Enregistrer</span>
              </button>
            )}

            {/* Régénérer */}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Régénérer automatiquement à partir de la procédure"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${regenerating ? 'animate-spin' : ''}`} />
              <span>Régénérer</span>
            </button>

            {/* Imprimer / Exporter PDF */}
            <button
              onClick={handlePrint}
              className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimer / PDF</span>
            </button>

            {/* Plein écran / Page dédiée */}
            <button
              onClick={handleOpenFullPage}
              title="Ouvrir dans une page dédiée"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Fermer */}
            <button
              onClick={onClose}
              title="Fermer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {message && (
          <div
            className={`mx-4 mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-lg ${
              message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              <p className="text-sm font-medium text-slate-600">
                Génération de la fiche opératoire simplifiée en cours...
              </p>
            </div>
          ) : sheet ? (
            <OperatingSheetView
              sheet={sheet}
              isEditing={isEditing}
              onChange={setSheet}
              fieldMode={fieldMode}
            />
          ) : (
            <div className="text-center py-20 text-slate-500">
              <p>Impossible d'afficher la fiche opératoire.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
