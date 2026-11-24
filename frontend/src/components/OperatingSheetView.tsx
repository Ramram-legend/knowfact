import React, { useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Square,
  CheckSquare,
  Wrench,
  Clock,
  Layers,
  Building2,
  Calendar,
  Tag,
  Factory,
  Check,
  FileCheck,
  Info,
  ChevronRight,
  Flame,
  Zap,
} from 'lucide-react'
import type { OperatingSheet, OperatingStep } from '../types'
import PPEBadges from './PPEBadges'

interface OperatingSheetViewProps {
  sheet: OperatingSheet
  isEditing?: boolean
  onChange?: (updated: OperatingSheet) => void
  fieldMode?: boolean
}

export default function OperatingSheetView({
  sheet,
  isEditing = false,
  onChange,
  fieldMode = false,
}: OperatingSheetViewProps) {
  // Track checked steps in interactive field mode
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({})
  const [completedChecks, setCompletedChecks] = useState<Record<number, boolean>>({})
  const [operatorSigned, setOperatorSigned] = useState(false)
  const [supervisorSigned, setSupervisorSigned] = useState(false)

  const toggleStep = (order: number) => {
    setCompletedSteps((prev) => ({ ...prev, [order]: !prev[order] }))
  }

  const toggleCheck = (index: number) => {
    setCompletedChecks((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const handleFieldChange = (field: keyof OperatingSheet, value: any) => {
    if (!onChange) return
    onChange({
      ...sheet,
      [field]: value,
    })
  }

  const handleStepChange = (index: number, stepField: keyof OperatingStep, value: any) => {
    if (!onChange) return
    const updatedSteps = [...sheet.steps]
    updatedSteps[index] = {
      ...updatedSteps[index],
      [stepField]: value,
    }
    onChange({
      ...sheet,
      steps: updatedSteps,
    })
  }

  // Calculate progress for field operators
  const totalSteps = sheet.steps.length
  const finishedCount = sheet.steps.filter((s) => completedSteps[s.order]).length
  const progressPercent = totalSteps > 0 ? Math.round((finishedCount / totalSteps) * 100) : 0

  return (
    <div className="operating-sheet-container bg-white text-gray-900 border border-gray-300 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none max-w-5xl mx-auto">
      {/* ── Progress bar in field mode ── */}
      {fieldMode && (
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
              Mode Terrain Atelier — Suivi en direct
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-400">
              {finishedCount}/{totalSteps} étapes ({progressPercent}%)
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          A. EN-TÊTE DE LA FICHE OPÉRATOIRE
      ═══════════════════════════════════════════════════════════════════════ */}
      <header className="border-b-2 border-slate-900 p-6 bg-slate-50 print:bg-white print:p-4 print:border-b-2">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Logo & Corporate Branding */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-wider shadow-sm print:border print:border-black print:bg-white print:text-black">
              KF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-widest text-slate-900 uppercase">
                  {sheet.company_name}
                </span>
                <span className="rounded bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 print:border">
                  SOP / ISO 9001
                </span>
              </div>
              <h2 className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Fiche Opératoire Standardisée — Atelier & Terrain
              </h2>
            </div>
          </div>

          {/* Reference & Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs print:border print:p-2">
            <div className="border-r border-slate-200 pr-2 print:border-gray-300">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">RÉFÉRENCE</span>
              <span className="font-mono font-bold text-slate-900">{sheet.reference}</span>
            </div>
            <div className="border-r border-slate-200 pr-2 print:border-gray-300">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">DÉPARTEMENT</span>
              <span className="font-bold text-slate-800">{sheet.department_code}</span>
            </div>
            <div className="border-r border-slate-200 pr-2 print:border-gray-300">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">VERSION</span>
              <span className="font-bold text-slate-800">v{sheet.sheet_version}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block font-bold">DATE ÉDITION</span>
              <span className="font-bold text-slate-800">{sheet.generated_at}</span>
            </div>
          </div>
        </div>

        {/* Titre principal de l'opération */}
        <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
              <Factory className="h-3.5 w-3.5 text-slate-600" />
              <span>{sheet.department_name}</span>
              {sheet.workstation_name && (
                <>
                  <ChevronRight className="h-3 w-3 text-slate-400" />
                  <span className="font-semibold text-slate-700">{sheet.workstation_name}</span>
                </>
              )}
            </div>
            {isEditing ? (
              <input
                type="text"
                value={sheet.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="input-field text-xl font-black text-slate-900 w-full"
                placeholder="Titre de l'opération"
              />
            ) : (
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {sheet.title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {sheet.estimated_duration && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold border border-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                {sheet.estimated_duration}
              </span>
            )}
            {sheet.difficulty_level && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 px-3 py-1 text-xs font-semibold border border-slate-200">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                {sheet.difficulty_level}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="p-6 md:p-8 space-y-8 print:p-4 print:space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════════
            B. INFORMATIONS ESSENTIELLES
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">
              B
            </span>
            <span>Informations Essentielles & Pré-requis</span>
          </div>

          {/* Objectif opérationnel */}
          <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 print:border-gray-400 print:bg-white print:p-3">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 print:text-black" />
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900 block mb-0.5 print:text-black">
                  Objectif de l'opération
                </span>
                {isEditing ? (
                  <textarea
                    value={sheet.objective}
                    onChange={(e) => handleFieldChange('objective', e.target.value)}
                    className="input-field text-sm w-full h-16 resize-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-blue-950 leading-relaxed print:text-gray-900">
                    {sheet.objective}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2 colonnes : Équipements/Outils + Conditions préalables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Outillage requis */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:border-gray-300 print:bg-white">
              <div className="flex items-center gap-2 mb-2.5">
                <Wrench className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Équipements & Outils nécessaires
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {sheet.tools_and_equipment.map((tool, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                    <span className="leading-snug">{tool}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conditions préalables */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 print:border-gray-300 print:bg-white">
              <div className="flex items-center gap-2 mb-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 print:text-black" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Conditions préalables à l'intervention
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {sheet.prerequisites.map((req, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5 print:text-black" />
                    <span className="leading-snug">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* EPI Obligatoires */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
              Équipements de Protection Individuelle (EPI) Obligatoires
            </span>
            <PPEBadges items={sheet.required_ppe} />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            C. ÉTAPES DE RÉALISATION
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">
                C
              </span>
              <span>Étapes de Réalisation Chronologiques</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {sheet.steps.length} étapes séquentielles
            </span>
          </div>

          <div className="space-y-4">
            {sheet.steps.map((step, idx) => {
              const isDone = !!completedSteps[step.order]

              return (
                <div
                  key={step.order}
                  className={`step-card rounded-xl border transition-all duration-200 p-4 md:p-5 print:border-gray-400 print:p-3 print:break-inside-avoid ${
                    isDone
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Grand numéro d'étape avec toggle terrain */}
                    <button
                      type="button"
                      onClick={() => toggleStep(step.order)}
                      title={isDone ? 'Marquer comme non fait' : 'Valider cette étape'}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-sm transition-all shadow-xs print:border print:border-black ${
                        isDone
                          ? 'bg-emerald-600 text-white scale-105'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isDone ? <Check className="h-5 w-5 stroke-[3]" /> : step.order}
                    </button>

                    {/* Contenu principal de l'étape */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                            className="input-field text-sm font-bold text-slate-900 flex-1"
                            placeholder="Titre court de l'étape"
                          />
                        ) : (
                          <h3
                            className={`text-sm md:text-base font-bold text-slate-900 ${
                              isDone ? 'line-through text-slate-500' : ''
                            }`}
                          >
                            {step.title}
                          </h3>
                        )}

                        {/* Interactive toggle badge in Field Mode */}
                        <button
                          type="button"
                          onClick={() => toggleStep(step.order)}
                          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors print:hidden ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Étape réalisée</span>
                            </>
                          ) : (
                            <>
                              <Square className="h-3.5 w-3.5 text-slate-400" />
                              <span>À réaliser</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Instruction simple et directe */}
                      {isEditing ? (
                        <textarea
                          value={step.instruction}
                          onChange={(e) => handleStepChange(idx, 'instruction', e.target.value)}
                          className="input-field text-sm w-full h-20 resize-none"
                          placeholder="Instruction simple à l'impératif"
                        />
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed font-normal">
                          {step.instruction}
                        </p>
                      )}

                      {/* Alerte spécifique sur cette étape */}
                      {step.warning && (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 print:border-gray-400 print:bg-white">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 print:text-black" />
                          <span>{step.warning}</span>
                        </div>
                      )}

                      {/* Point de contrôle qualité / sécurité */}
                      <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-xs text-emerald-950 print:border-gray-300 print:bg-white print:p-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 print:text-black" />
                        <div className="flex-1">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-800 block print:text-black">
                            Point de Contrôle & Conformité
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={step.control_point}
                              onChange={(e) => handleStepChange(idx, 'control_point', e.target.value)}
                              className="input-field text-xs text-emerald-950 mt-1 w-full"
                            />
                          ) : (
                            <span className="font-medium">{step.control_point}</span>
                          )}
                        </div>
                      </div>

                      {/* Image / Illustration technique si disponible */}
                      {step.image_url && (
                        <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden max-w-sm">
                          <img
                            src={step.image_url}
                            alt={`Illustration étape ${step.order}`}
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            D. SÉCURITÉ & VIGILANCE
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/80 to-red-50/30 p-5 md:p-6 shadow-xs print:border-2 print:border-black print:bg-white print:p-4 print:break-inside-avoid">
          {/* En-tête Sécurité avec chevrons industriels */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-amber-200 print:border-black">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-red-600 text-white flex items-center justify-center print:border print:border-black print:bg-white print:text-black">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black tracking-tight text-red-950 uppercase print:text-black">
                  Section Sécurité — Consignes Vitales & Risques
                </h3>
                <p className="text-[11px] text-amber-800 font-medium print:text-gray-600">
                  Respect strict obligatoire sous peine d'interruption immédiate des travaux
                </p>
              </div>
            </div>
            <span className="rounded-md bg-red-100 text-red-800 text-[10px] font-black uppercase px-2.5 py-1 border border-red-200 print:border-black">
              Sécurité 0 Accident
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risques Principaux */}
            <div className="bg-white/80 rounded-xl p-3.5 border border-amber-200/80 print:border-gray-300">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-900 mb-2">
                <Flame className="h-4 w-4 text-red-600" />
                <span>Risques Principaux Identifiés</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {sheet.safety.hazards.map((hazard, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span>{hazard}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Précautions impératives */}
            <div className="bg-white/80 rounded-xl p-3.5 border border-amber-200/80 print:border-gray-300">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                <Zap className="h-4 w-4 text-amber-600" />
                <span>Précautions Obligatoires</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {sheet.safety.precautions.map((prec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <span>{prec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interdictions formelles 🚫 */}
          <div className="mt-4 bg-red-100/70 rounded-xl p-3.5 border border-red-300 print:border-gray-300 print:bg-white">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-red-950 mb-2">
              <Ban className="h-4 w-4 text-red-700" />
              <span>Interdictions Strictes & Formelles (Règles d'or)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-red-950 font-medium">
              {sheet.safety.prohibitions.map((prohib, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-red-200">
                  <span className="text-red-600 font-bold shrink-0">✕</span>
                  <span>{prohib}</span>
                </div>
              ))}
            </div>
          </div>

          {/* En cas d'anomalie 🚨 */}
          <div className="mt-4 bg-white/90 rounded-xl p-3.5 border border-amber-300 print:border-gray-300">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block mb-1.5">
              🚨 Conduite à tenir en cas d'anomalie ou d'urgence
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {sheet.safety.emergency_actions.map((act, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-bold text-slate-900">{i + 1}.</span>
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            E. VALIDATION FINALE & ÉMARGEMENT
        ═══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4 print:break-inside-avoid">
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">
              E
            </span>
            <span>Validation Finale, Checklist & Émargement</span>
          </div>

          {/* Checklist de fin d'opération */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 print:bg-white print:border-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block mb-2.5">
              Checklist de Clôture d'Intervention
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {sheet.validation.items.map((item, idx) => {
                const isChecked = !!completedChecks[idx]
                return (
                  <label
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer select-none bg-white p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <span className="shrink-0 mt-0.5 text-slate-600 print:hidden">
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </span>
                    {/* Printable checkbox square */}
                    <span className="hidden print:inline-block h-3.5 w-3.5 border border-black rounded-xs shrink-0 mr-1 mt-0.5" />
                    <span className={isChecked ? 'font-medium text-emerald-900' : ''}>{item}</span>
                  </label>
                )
              })}
            </div>

            <p className="mt-3 text-[11px] text-slate-500 italic border-t border-slate-200 pt-2">
              {sheet.validation.completion_text}
            </p>
          </div>

          {/* Zones de Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Opérateur terrain */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3 print:border print:border-black">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-slate-900">
                  {sheet.validation.operator_signature_title}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Visa Opérateur</span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nom & Prénom :</span>
                  <span className="font-semibold text-slate-800">{sheet.author_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date d'exécution :</span>
                  <span className="font-semibold text-slate-800">{sheet.generated_at}</span>
                </div>
              </div>
              {/* Box signature */}
              <div
                onClick={() => setOperatorSigned(!operatorSigned)}
                className="h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors print:bg-white print:border-solid print:border-gray-400"
              >
                {operatorSigned ? (
                  <span className="font-serif italic text-base text-slate-800 font-bold">
                    ✓ Signé électroniquement ({sheet.author_name})
                  </span>
                ) : (
                  <span>Cadre Signature / Visa terrain</span>
                )}
              </div>
            </div>

            {/* Superviseur / Responsable */}
            <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3 print:border print:border-black">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-slate-900">
                  {sheet.validation.supervisor_signature_title}
                </span>
                <span className="text-[10px] rounded bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5">
                  Bon pour service
                </span>
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nom & Prénom :</span>
                  <span className="font-semibold text-slate-800">{sheet.validator_name || 'Chef d’équipe'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Contrôle final :</span>
                  <span className="font-semibold text-emerald-700">Conforme aux règles de l'art</span>
                </div>
              </div>
              {/* Box signature */}
              <div
                onClick={() => setSupervisorSigned(!supervisorSigned)}
                className="h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors print:bg-white print:border-solid print:border-gray-400"
              >
                {supervisorSigned ? (
                  <span className="font-serif italic text-base text-emerald-800 font-bold">
                    ✓ Validé & Bon pour service ({sheet.validator_name || 'Superviseur'})
                  </span>
                ) : (
                  <span>Cadre Signature / Visa Superviseur</span>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer minimaliste imprimable */}
      <footer className="border-t border-slate-200 p-4 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50 print:bg-white print:p-2">
        <span>KnowFact Industrial Systems — Document Opérationnel de Terrain — Réf. {sheet.reference}</span>
        <span>Page 1 / 1 — Ne pas jeter sur la voie publique — Document contrôlé</span>
      </footer>
    </div>
  )
}
