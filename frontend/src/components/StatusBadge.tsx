import type { FicheStatus } from '../types'

const statusConfig: Record<FicheStatus, { label: string; classes: string }> = {
  draft:        { label: 'Brouillon',    classes: 'bg-slate-100 text-slate-700 ring-slate-300' },
  submitted:    { label: 'Soumise',      classes: 'bg-sky-50 text-sky-700 ring-sky-300' },
  under_review: { label: 'En révision',  classes: 'bg-amber-50 text-amber-700 ring-amber-300' },
  to_correct:   { label: 'À corriger',   classes: 'bg-orange-50 text-orange-700 ring-orange-300' },
  validated:    { label: 'Validée',      classes: 'bg-teal-50 text-teal-700 ring-teal-300' },
  published:    { label: 'Publiée',      classes: 'bg-emerald-50 text-emerald-700 ring-emerald-300' },
  rejected:     { label: 'Rejetée',      classes: 'bg-red-50 text-red-700 ring-red-300' },
  archived:     { label: 'Archivée',     classes: 'bg-slate-100 text-slate-500 ring-slate-300' },
}

interface StatusBadgeProps {
  status: FicheStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-slate-100 text-slate-700 ring-slate-300' }
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClass} ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}
