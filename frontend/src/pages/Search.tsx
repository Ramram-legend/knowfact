import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search as SearchIcon, Filter, FileText, AlertCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { searchApi } from '../api/search'
import { useDepartments } from '../contexts/DepartmentContext'
import type { Fiche, FicheType, FicheStatus } from '../types'
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

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { departments } = useDepartments()
  const [results, setResults] = useState<Fiche[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const q = searchParams.get('q') || ''
  const typeFilter = searchParams.get('type') || ''
  const statusFilter = searchParams.get('status') || ''
  const departmentFilter = searchParams.get('department_id') || ''
  const page = Number(searchParams.get('page') || '1')

  const PAGE_SIZE = 12

  const doSearch = useCallback(async (
    query: string,
    type: string,
    status: string,
    deptId: string,
    p: number,
  ) => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await searchApi.search({
        q: query,
        type: type || undefined,
        status: status || undefined,
        department_id: deptId ? Number(deptId) : undefined,
        page: p,
      })
      setResults(res.results)
      setTotal(res.count)
      setSearched(true)
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (q.trim()) {
      doSearch(q, typeFilter, statusFilter, departmentFilter, page)
    }
  }, [q, typeFilter, statusFilter, departmentFilter, page, doSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams(searchParams)
    p.set('page', '1')
    setSearchParams(p)
    doSearch(q, typeFilter, statusFilter, departmentFilter, 1)
  }

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-500 mt-0.5">Find knowledge entries across all fiches.</p>
      </div>

      {/* Search bar */}
      <div className="card">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              className="input-field pl-9"
              placeholder="Search by title, description, tags..."
              autoFocus
            />
          </div>
          <button type="submit" className="btn-primary px-6">
            Search
          </button>
        </form>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Filters sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="card sticky top-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h2>

            <div>
              <label className="label text-xs">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => updateParam('status', e.target.value)}
                className="input-field text-sm"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => updateParam('type', e.target.value)}
                className="input-field text-sm"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Département</label>
              <select
                value={departmentFilter}
                onChange={(e) => updateParam('department_id', e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Tous les départements</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {(statusFilter || typeFilter || departmentFilter) && (
              <button
                onClick={() => {
                  const p = new URLSearchParams()
                  if (q) p.set('q', q)
                  setSearchParams(p)
                }}
                className="text-xs text-primary-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 py-10">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : !searched ? (
            <div className="card text-center py-16">
              <SearchIcon className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Enter a query above and press Search.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="card text-center py-16">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm font-medium">No results found</p>
              <p className="text-gray-400 text-xs mt-1">Try different keywords or adjust filters.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{total} result{total !== 1 ? 's' : ''} for <strong>"{q}"</strong></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((f) => (
                  <FicheCard key={f.id} fiche={f} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams)
                      p.set('page', String(page - 1))
                      setSearchParams(p)
                      doSearch(q, typeFilter, statusFilter, departmentFilter, page - 1)
                    }}
                    disabled={page <= 1}
                    className="btn-secondary px-2.5 py-2 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => {
                      const p = new URLSearchParams(searchParams)
                      p.set('page', String(page + 1))
                      setSearchParams(p)
                      doSearch(q, typeFilter, statusFilter, departmentFilter, page + 1)
                    }}
                    disabled={page >= totalPages}
                    className="btn-secondary px-2.5 py-2 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
