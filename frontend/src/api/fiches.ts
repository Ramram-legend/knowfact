import client from './client'
import type {
  Fiche,
  FicheStatus,
  FicheType,
  PaginatedResponse,
  DashboardStats,
  FicheVersion,
  ImprovementProposalPayload,
  ImprovementProposal,
  ImprovementReviewPayload,
  VersionDiff,
} from '../types'

/** The shape of `content` as sent to the backend. */
export interface FicheContentPayload {
  description: string
  steps: { order: number; content: string }[]
  tags: string[]
  equipment: string
  safety_notes: string
}

/** Full create payload wrapping content in the `content` key. */
export interface FicheCreatePayload {
  title: string
  type: FicheType
  content: FicheContentPayload
  review_due_date?: string | null
  department_id?: number | null
  workstation_id?: number | null
}

/** Partial update payload. */
export interface FicheUpdatePayload {
  title?: string
  type?: FicheType
  content?: FicheContentPayload
  review_due_date?: string | null
  change_reason?: string
  department_id?: number | null
  workstation_id?: number | null
}

export interface FicheListParams {
  status?: FicheStatus
  type?: FicheType
  search?: string
  department_id?: number
  page?: number
}

export interface TransitionPayload {
  comment?: string
}

export const fichesApi = {
  list: async (params?: FicheListParams): Promise<PaginatedResponse<Fiche>> => {
    const { data } = await client.get<PaginatedResponse<Fiche>>('/fiches/', { params })
    return data
  },

  get: async (id: number): Promise<Fiche> => {
    const { data } = await client.get<Fiche>(`/fiches/${id}`)
    return data
  },

  create: async (payload: FicheCreatePayload): Promise<Fiche> => {
    const { data } = await client.post<Fiche>('/fiches/', payload)
    return data
  },

  update: async (id: number, payload: FicheUpdatePayload): Promise<Fiche> => {
    const { data } = await client.patch<Fiche>(`/fiches/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/fiches/${id}`)
  },

  // ── Status transitions ───────────────────────────────────────────────────

  submit: async (id: number): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/submit`)
    return data
  },

  startReview: async (id: number): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/start_review`)
    return data
  },

  validate: async (id: number, payload?: TransitionPayload): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/validate`, {
      action: 'validate',
      comment: payload?.comment ?? '',
    })
    return data
  },

  reject: async (id: number, payload?: TransitionPayload): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/reject`, {
      action: 'reject',
      comment: payload?.comment ?? '',
    })
    return data
  },

  requestCorrection: async (id: number, payload?: TransitionPayload): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/request_correction`, {
      action: 'request_correction',
      comment: payload?.comment ?? '',
    })
    return data
  },

  publish: async (id: number): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/publish`)
    return data
  },

  archive: async (id: number): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/archive`)
    return data
  },

  newVersion: async (id: number, change_reason?: string): Promise<Fiche> => {
    const { data } = await client.post<Fiche>(`/fiches/${id}/new_version`, {
      change_reason: change_reason ?? 'New version',
    })
    return data
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data } = await client.get<DashboardStats>('/fiches/dashboard/')
    return data
  },

  // ── Amélioration de solution existante ───────────────────────────────────

  proposeImprovement: async (ficheId: number, payload: ImprovementProposalPayload): Promise<FicheVersion> => {
    const { data } = await client.post<FicheVersion>(`/fiches/${ficheId}/propose-improvement`, payload)
    return data
  },

  getMyImprovements: async (): Promise<ImprovementProposal[]> => {
    const { data } = await client.get<ImprovementProposal[]>('/fiches/improvements/mine')
    return data
  },

  getPendingImprovements: async (): Promise<ImprovementProposal[]> => {
    const { data } = await client.get<ImprovementProposal[]>('/fiches/improvements/pending')
    return data
  },

  getImprovementDiff: async (versionId: number): Promise<VersionDiff> => {
    const { data } = await client.get<VersionDiff>(`/fiches/improvements/${versionId}/diff`)
    return data
  },

  updateImprovementProposal: async (
    versionId: number,
    payload: Partial<ImprovementProposalPayload>
  ): Promise<FicheVersion> => {
    const { data } = await client.put<FicheVersion>(`/fiches/improvements/${versionId}`, payload)
    return data
  },

  submitImprovementProposal: async (versionId: number): Promise<FicheVersion> => {
    const { data } = await client.post<FicheVersion>(`/fiches/improvements/${versionId}/submit`)
    return data
  },

  reviewImprovementProposal: async (
    versionId: number,
    payload: ImprovementReviewPayload
  ): Promise<VersionDiff> => {
    const { data } = await client.post<VersionDiff>(`/fiches/improvements/${versionId}/review`, payload)
    return data
  },
}

