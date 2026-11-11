import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, GripVertical, ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { FicheType, Fiche } from '../types'

interface StepField { content: string }
interface FicheFormData {
  title: string
  type: FicheType
  description: string
  steps: StepField[]
  safety_notes: string
}

interface Toast { message: string; type: 'success' | 'error' }

function ToastBar({ message, type }: Toast) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {message}
    </div>
  )
}

interface TagInputProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  tags: string[]
  onRemove: (t: string) => void
  onAdd: (t: string) => void
}

function TagInput({ label, placeholder, value, onChange, tags, onRemove, onAdd }: TagInputProps) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault()
      onAdd(value.trim())
      onChange('')
    }
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-800 px-2.5 py-0.5 text-xs font-medium">
            {t}
            <button type="button" onClick={() => onRemove(t)} className="hover:text-red-600">×</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        className="input-field"
        placeholder={placeholder}
      />
      <p className="text-xs text-gray-400 mt-1">Press Enter or comma to add</p>
    </div>
  )
}

export default function FicheEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast | null>(null)
  const [equipmentTags, setEquipmentTags] = useState<string[]>([])
  const [tagsList, setTagsList] = useState<string[]>([])
  const [equipmentInput, setEquipmentInput] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FicheFormData>()

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' })

  useEffect(() => {
    if (!id) return
    fichesApi.get(Number(id)).then((data) => {
      setFiche(data)
      const content = data.content ?? {}
      reset({
        title: data.title,
        type: data.type,
        description: content.description ?? '',
        steps: (content.steps ?? [])
          .slice()
          .sort((a: any, b: any) => a.order - b.order)
          .map((s: any) => ({ content: s.content })),
        safety_notes: content.safety_notes ?? '',
      })
      // equipment is a string on the backend; split by comma for display
      const eq = content.equipment ?? ''
      setEquipmentTags(eq ? eq.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      setTagsList(content.tags ?? [])
      setLoading(false)
    }).catch(() => {
      showToast('Failed to load fiche.', 'error')
      setLoading(false)
    })
  }, [id, reset])

  const buildPayload = (data: FicheFormData) => ({
    title: data.title,
    type: data.type,
    content: {
      description: data.description,
      steps: fields.map((_, i) => ({
        order: i + 1,
        content: (data.steps[i]?.content ?? '').trim(),
      })).filter((s) => s.content),
      equipment: equipmentTags.join(', '),
      safety_notes: data.safety_notes,
      tags: tagsList,
    },
  })

  const onSave = handleSubmit(async (data) => {
    try {
      await fichesApi.update(Number(id), buildPayload(data))
      showToast('Fiche saved successfully.', 'success')
      setTimeout(() => navigate(`/fiches/${id}`), 1000)
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Failed to save.', 'error')
    }
  })

  const onSaveAndSubmit = handleSubmit(async (data) => {
    try {
      await fichesApi.update(Number(id), buildPayload(data))
      await fichesApi.submit(Number(id))
      showToast('Fiche saved and submitted for review.', 'success')
      setTimeout(() => navigate(`/fiches/${id}`), 1000)
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Failed.', 'error')
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!fiche) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p>Fiche not found.</p>
        <Link to="/fiches" className="btn-secondary mt-4 inline-flex">Back to list</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-5">
      {toast && <ToastBar {...toast} />}

      <div>
        <Link to={`/fiches/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Fiche
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Fiche</h1>
        <p className="text-sm text-gray-500 mt-0.5">Make changes to your knowledge entry.</p>
      </div>

      <form className="space-y-5">
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              className={`input-field ${errors.title ? 'border-red-400' : ''}`}
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Type *</label>
            <select className="input-field" {...register('type', { required: true })}>
              <option value="problem_solution">Problem / Solution</option>
              <option value="task_post">Task Post</option>
              <option value="procedure">Procedure</option>
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={4}
              className="input-field resize-none"
              {...register('description')}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Steps</h2>
            <button
              type="button"
              onClick={() => append({ content: '' })}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-gray-400 italic">No steps. Click "Add Step" to begin.</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-3">
                <div className="flex items-center gap-1 pt-2 shrink-0">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                    {index + 1}
                  </span>
                </div>
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder={`Step ${index + 1}...`}
                  {...register(`steps.${index}.content`)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-2 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>

          <TagInput
            label="Equipment"
            placeholder="e.g. Pressure gauge..."
            value={equipmentInput}
            onChange={setEquipmentInput}
            tags={equipmentTags}
            onAdd={(t) => setEquipmentTags((p) => p.includes(t) ? p : [...p, t])}
            onRemove={(t) => setEquipmentTags((p) => p.filter((x) => x !== t))}
          />

          <div>
            <label className="label">Safety Notes</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="Safety warnings or precautions..."
              {...register('safety_notes')}
            />
          </div>

          <TagInput
            label="Tags"
            placeholder="e.g. maintenance, safety..."
            value={tagsInput}
            onChange={setTagsInput}
            tags={tagsList}
            onAdd={(t) => setTagsList((p) => p.includes(t) ? p : [...p, t])}
            onRemove={(t) => setTagsList((p) => p.filter((x) => x !== t))}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(`/fiches/${id}`)} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={isSubmitting} className="btn-secondary">
            Save Draft
          </button>
          <button type="button" onClick={onSaveAndSubmit} disabled={isSubmitting} className="btn-primary">
            {isSubmitting && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Save & Submit
          </button>
        </div>
      </form>
    </div>
  )
}
