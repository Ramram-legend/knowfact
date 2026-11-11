import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, CheckCircle, XCircle, GripVertical } from 'lucide-react'
import { fichesApi } from '../api/fiches'
import type { FicheType } from '../types'

interface StepField {
  content: string
}

interface FicheFormData {
  title: string
  type: FicheType
  description: string
  steps: StepField[]
  equipment_input: string
  safety_notes: string
  tags_input: string
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
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 text-primary-800 px-2.5 py-0.5 text-xs font-medium"
          >
            {t}
            <button type="button" onClick={() => onRemove(t)} className="hover:text-red-600 transition-colors">
              ×
            </button>
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

export default function FicheCreate() {
  const navigate = useNavigate()
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
    formState: { errors, isSubmitting },
  } = useForm<FicheFormData>({
    defaultValues: {
      type: 'procedure',
      steps: [{ content: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' })

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

  const onSaveDraft = handleSubmit(async (data) => {
    try {
      const fiche = await fichesApi.create(buildPayload(data))
      showToast('Fiche saved as draft.', 'success')
      setTimeout(() => navigate(`/fiches/${fiche.id}`), 1000)
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Failed to save.', 'error')
    }
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const fiche = await fichesApi.create(buildPayload(data))
      await fichesApi.submit(fiche.id)
      showToast('Fiche created and submitted for review.', 'success')
      setTimeout(() => navigate(`/fiches/${fiche.id}`), 1000)
    } catch (err: any) {
      showToast(err?.response?.data?.detail ?? 'Failed to submit.', 'error')
    }
  })

  return (
    <div className="max-w-3xl space-y-5">
      {toast && <ToastBar {...toast} />}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Fiche</h1>
        <p className="text-sm text-gray-500 mt-0.5">Fill in the knowledge entry below.</p>
      </div>

      <form className="space-y-5">
        {/* Title & Type */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Basic Information</h2>

          <div>
            <label className="label">Title *</label>
            <input
              type="text"
              className={`input-field ${errors.title ? 'border-red-400' : ''}`}
              placeholder="Clear, descriptive title..."
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
              placeholder="Describe the context, problem, or objective..."
              {...register('description')}
            />
          </div>
        </div>

        {/* Steps */}
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
            <p className="text-sm text-gray-400 italic">No steps yet. Add at least one step.</p>
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
                  placeholder={`Step ${index + 1} description...`}
                  {...register(`steps.${index}.content`)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="mt-2 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment & Tags */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>

          <TagInput
            label="Equipment"
            placeholder="e.g. Pressure gauge, wrench..."
            value={equipmentInput}
            onChange={setEquipmentInput}
            tags={equipmentTags}
            onAdd={(t) => setEquipmentTags((prev) => prev.includes(t) ? prev : [...prev, t])}
            onRemove={(t) => setEquipmentTags((prev) => prev.filter((x) => x !== t))}
          />

          <div>
            <label className="label">Safety Notes</label>
            <textarea
              rows={3}
              className="input-field resize-none"
              placeholder="Important safety warnings or precautions..."
              {...register('safety_notes')}
            />
          </div>

          <TagInput
            label="Tags"
            placeholder="e.g. maintenance, safety..."
            value={tagsInput}
            onChange={setTagsInput}
            tags={tagsList}
            onAdd={(t) => setTagsList((prev) => prev.includes(t) ? prev : [...prev, t])}
            onRemove={(t) => setTagsList((prev) => prev.filter((x) => x !== t))}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => navigate('/fiches')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            Save & Submit
          </button>
        </div>
      </form>
    </div>
  )
}
