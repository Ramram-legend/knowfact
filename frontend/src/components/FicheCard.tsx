import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { FileText, User, Calendar } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { Fiche, FicheType } from '../types'

const typeLabels: Record<FicheType, string> = {
  problem_solution: 'Problem / Solution',
  task_post:        'Task Post',
  procedure:        'Procedure',
}

const typeColors: Record<FicheType, string> = {
  problem_solution: 'bg-purple-100 text-purple-700',
  task_post:        'bg-sky-100 text-sky-700',
  procedure:        'bg-indigo-100 text-indigo-700',
}

interface FicheCardProps {
  fiche: Fiche
}

export default function FicheCard({ fiche }: FicheCardProps) {
  const content = fiche.content ?? {}
  const description = content.description ?? ''
  const tags: string[] = content.tags ?? []

  return (
    <Link
      to={`/fiches/${fiche.id}`}
      className="card group flex flex-col gap-3 hover:shadow-md hover:border-primary-200 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeColors[fiche.type]}`}
          >
            {typeLabels[fiche.type]}
          </span>
          <StatusBadge status={fiche.status} size="sm" />
        </div>
        <FileText className="h-4 w-4 text-gray-400 shrink-0 mt-0.5 group-hover:text-primary-600 transition-colors" />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-700 transition-colors">
        {fiche.title}
      </h3>

      {description && (
        <p className="text-xs text-gray-500 line-clamp-2">{description}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-gray-400">
              +{tags.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <User className="h-3 w-3" />
          <span>{fiche.author_name || fiche.author?.full_name}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(fiche.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  )
}
