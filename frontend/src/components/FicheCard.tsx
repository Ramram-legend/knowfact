import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { FileText, User, Calendar, FileSpreadsheet } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { useDepartments } from '../contexts/DepartmentContext'
import type { Fiche, FicheType } from '../types'

const typeLabels: Record<FicheType, string> = {
  problem_solution: 'Problème / Solution',
  task_post:        'Poste / Tâche',
  procedure:        'Procédure',
}

const typeColors: Record<FicheType, string> = {
  problem_solution: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200',
  task_post:        'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200',
  procedure:        'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200',
}

interface FicheCardProps {
  fiche: Fiche
}

export default function FicheCard({ fiche }: FicheCardProps) {
  const { departments } = useDepartments()
  const dept = fiche.department_id ? departments.find((d) => d.id === fiche.department_id) : null
  const content = fiche.content ?? {}
  const description = content.description ?? ''
  const tags: string[] = content.tags ?? []

  return (
    <Link
      to={`/fiches/${fiche.id}`}
      className="card group flex flex-col justify-between gap-3 hover:shadow-md hover:border-primary-300/80 active:scale-[0.99] transition-all duration-200"
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeColors[fiche.type]}`}
            >
              {typeLabels[fiche.type]}
            </span>
            {dept && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: dept.color + '18', color: dept.color }}
              >
                {dept.name}
              </span>
            )}
            <StatusBadge status={fiche.status} size="sm" />
            {fiche.type === 'procedure' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
                <FileSpreadsheet className="h-3 w-3" /> Opératoire
              </span>
            )}
          </div>
          <FileText className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 group-hover:text-primary-600 transition-colors" />
        </div>

        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-primary-700 transition-colors leading-snug">
          {fiche.title}
        </h3>

        {description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{description}</p>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-mono bg-slate-100 text-slate-600"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-mono text-slate-400">
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
          <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{fiche.author_name || fiche.author?.full_name}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0 tabular-nums">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(fiche.updated_at), { addSuffix: true, locale: fr })}
          </span>
        </div>
      </div>
    </Link>
  )
}
