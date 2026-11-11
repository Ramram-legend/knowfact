import type { FicheStatus } from '../types'

const statusConfig: Record<FicheStatus, { label: string; classes: string }> = {
  draft:        { label: 'Draft',          classes: 'bg-gray-100 text-gray-700 ring-gray-300' },
  submitted:    { label: 'Submitted',      classes: 'bg-blue-100 text-blue-700 ring-blue-300' },
  under_review: { label: 'Under Review',   classes: 'bg-amber-100 text-amber-700 ring-amber-300' },
  to_correct:   { label: 'To Correct',     classes: 'bg-orange-100 text-orange-700 ring-orange-300' },
  validated:    { label: 'Validated',      classes: 'bg-teal-100 text-teal-700 ring-teal-300' },
  published:    { label: 'Published',      classes: 'bg-green-100 text-green-700 ring-green-300' },
  rejected:     { label: 'Rejected',       classes: 'bg-red-100 text-red-700 ring-red-300' },
  archived:     { label: 'Archived',       classes: 'bg-slate-100 text-slate-600 ring-slate-300' },
}

interface StatusBadgeProps {
  status: FicheStatus
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700 ring-gray-300' }
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${sizeClass} ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  )
}
