import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Printer,
  Download,
  Edit3,
  RotateCw,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tablet,
  FileCheck,
} from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { OperatingSheet } from '../types'
import OperatingSheetView from '../components/OperatingSheetView'

export default function OperatingSheetPage() {
  const { id } = useParams<{ id: string }>()
  const ficheId = Number(id)

  const [sheet, setSheet] = useState<OperatingSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [fieldMode, setFieldMode] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    if (!ficheId) return
    setLoading(true)
    try {
      const data = await fichesApi.getOperatingSheet(ficheId)
      setSheet(data)
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur lors du chargement de la fiche opératoire.', 'error')
    } finally {
      setLoading(false)
    }
  }, [ficheId])

  useEffect(() => {
    load()
  }, [load])

  const handleRegenerate = async () => {
    if (!ficheId) return
    setRegenerating(true)
    try {
      const data = await fichesApi.generateOperatingSheet(ficheId, true)
      setSheet(data)
      setIsEditing(false)
      showToast('Fiche opératoire réinitialisée et optimisée.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur de régénération.', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = async () => {
    if (!ficheId || !sheet) return
    setSaving(true)
    try {
      const saved = await fichesApi.saveOperatingSheet(ficheId, sheet)
      setSheet(saved)
      setIsEditing(false)
      showToast('Fiche opératoire enregistrée.', 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur lors de la sauvegarde.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 pb-12 print:space-y-0 print:pb-0">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl print:hidden ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header & Action Toolbar (Screen Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            to={`/fiches/${ficheId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à la procédure détaillée
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Fiche Opératoire Simplifiée
              </h1>
              <p className="text-xs text-slate-500">
                Mode d'exécution direct destiné aux ouvriers et opérateurs sur le terrain
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Terrain Tablette */}
          <button
            onClick={() => setFieldMode(!fieldMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              fieldMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Tablet className="h-3.5 w-3.5 text-emerald-600" />
            <span>{fieldMode ? 'Mode Terrain Actif' : 'Mode Tablette Atelier'}</span>
          </button>

          {/* Personnaliser / Éditer */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              isEditing
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-600" />
            <span>{isEditing ? 'Mode Lecture' : 'Personnaliser'}</span>
          </button>

          {/* Sauvegarder */}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
            >
              {saving ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Sauvegarder</span>
            </button>
          )}

          {/* Régénérer */}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Régénérer</span>
          </button>

          {/* Imprimer / PDF */}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimer / Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* Main Operating Sheet Card */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-28 gap-3 bg-white rounded-2xl border border-slate-200">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">
            Extraction et simplification des consignes de terrain...
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
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p>Impossible de charger la fiche opératoire pour cette procédure.</p>
        </div>
      )}
    </div>
  )
}
