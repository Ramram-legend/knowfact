import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PlusCircle, Filter, FileText, AlertCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { fichesApi } from '../api/fiches'
import { useDepartments } from '../contexts/DepartmentContext'
import type { Fiche, FicheStatus, FicheType } from '../types'
import FicheCard from '../components/FicheCard'

const STATUS_OPTIONS: { value: FicheStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'to_correct', label: 'To Correct' },
  { value: 'validated', label: 'Validated' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
]

const TYPE_OPTIONS: { value: FicheType | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'problem_solution', label: 'Problem / Solution' },
  { value: 'task_post', label: 'Task Post' },
  { value: 'procedure', label: 'Procedure' },
]

export default function FicheList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { departments } = useDepartments()
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const statusFilter = (searchParams.get('status') as FicheStatus) || ''
  const typeFilter = (searchParams.get('type') as FicheType) || ''
  const searchFilter = searchParams.get('search') || ''
  const departmentFilter = searchParams.get('department_id') || ''
  const page = Number(searchParams.get('page') || '1')

  const PAGE_SIZE = 12

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fichesApi.list({
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        search: searchFilter || undefined,
        department_id: departmentFilter ? Number(departmentFilter) : undefined,
        page,
      })
      setFiches(res.results)
      setTotal(res.count)
    } catch {
      setError('Failed to load fiches.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, searchFilter, departmentFilter, page])

  useEffect(() => { load() }, [load])

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} fiche{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link to="/fiches/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" />
          New Fiche
        </Link>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-col sm:flex-row gap-3 py-3 px-4">
        <div className="flex items-center gap-2 text-gray-500 shrink-0">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filter:</span>
        </div>

        <input
          type="text"
          placeholder="Search fiches..."
          value={searchFilter}
          onChange={(e) => updateParam('search', e.target.value)}
          className="input-field flex-1 min-w-0"
        />

        <select
          value={statusFilter}
          onChange={(e) => updateParam('status', e.target.value)}
          className="input-field sm:w-44"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => updateParam('type', e.target.value)}
          className="input-field sm:w-44"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => updateParam('department_id', e.target.value)}
          className="input-field sm:w-48"
        >
          <option value="">Tous les départements</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 py-10">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      ) : fiches.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm font-medium">No fiches found</p>
          <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or create a new fiche.</p>
          <Link to="/fiches/new" className="btn-primary mt-4 inline-flex mx-auto">
            <PlusCircle className="h-4 w-4" />
            Create Fiche
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fiches.map((f) => <FicheCard key={f.id} fiche={f} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => updateParam('page', String(page - 1))}
            disabled={page <= 1}
            className="btn-secondary px-2.5 py-2 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => updateParam('page', String(page + 1))}
            disabled={page >= totalPages}
            className="btn-secondary px-2.5 py-2 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
