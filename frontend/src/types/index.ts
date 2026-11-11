// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'operator' | 'technician' | 'engineer' | 'expert' | 'admin'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

// ─── Fiche ───────────────────────────────────────────────────────────────────
export type FicheType = 'problem_solution' | 'task_post' | 'procedure'

export type FicheStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'to_correct'
  | 'validated'
  | 'published'
  | 'rejected'
  | 'archived'

export interface Step {
  order: number
  content: string
}

export interface Attachment {
  id: number
  fiche_id: number
  filename: string
  file_path: string
  file_type: string
  uploaded_by: number
  created_at: string
}

export type VersionStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'superseded'
  | 'to_correct'
  | 'rejected'

export interface VersionReview {
  id: number
  version_id: number
  reviewer_id: number
  decision: 'validate' | 'request_correction' | 'reject'
  comment: string
  created_at: string
  reviewer_name?: string
}

export interface FicheVersion {
  id: number
  fiche_id: number
  version_number: number
  title?: string | null
  content: any
  changed_by: number
  status: VersionStatus
  improvement_reason?: string | null
  change_reason?: string | null
  parent_version_id?: number | null
  created_at: string
  updated_at?: string | null
  author_name?: string
  reviews?: VersionReview[]
}

export interface Fiche {
  id: number
  title: string
  type: FicheType
  status: FicheStatus
  // content is a parsed JSON object from the backend
  content: {
    description: string
    steps: Step[]
    equipment: string
    safety_notes: string
    tags: string[]
  }
  author_id: number
  author_name: string
  author?: User
  reviewer?: User | null
  reviewed_by: number | null
  reviewer_name?: string | null
  review_comment?: string | null
  created_at: string
  updated_at: string
  validated_at: string | null
  published_at: string | null
  review_due_date: string | null
  version: number
  versions?: FicheVersion[]
  attachments?: Attachment[]
  has_pending_improvement?: boolean
  pending_improvement_id?: number | null
}

// ─── Improvement Proposals ───────────────────────────────────────────────────
export interface ImprovementProposalPayload {
  title?: string
  content: {
    description: string
    steps: { order: number; content: string }[]
    tags: string[]
    equipment: string
    safety_notes: string
  }
  improvement_reason: string
  submit?: boolean
}

export interface ImprovementReviewPayload {
  action: 'validate' | 'request_correction' | 'reject'
  comment?: string
}

export interface ImprovementProposal {
  id: number
  fiche_id: number
  fiche_title: string
  version_number: number
  title?: string | null
  status: VersionStatus
  improvement_reason?: string | null
  changed_by: number
  author_name: string
  created_at: string
  updated_at: string
  latest_review_comment?: string | null
  reviews: VersionReview[]
}

export interface VersionDiff {
  version_id: number
  parent_version_id?: number | null
  fiche_id: number
  fiche_title: string
  proposed_title: string
  proposer_id: number
  proposer_name: string
  proposer_role: string
  improvement_reason: string
  status: VersionStatus
  created_at: string
  updated_at: string
  old_content: {
    description?: string
    steps?: { order: number; content: string }[]
    equipment?: string
    safety_notes?: string
    tags?: string[]
  }
  new_content: {
    description?: string
    steps?: { order: number; content: string }[]
    equipment?: string
    safety_notes?: string
    tags?: string[]
  }
  diff_summary: {
    title_changed: boolean
    description_changed: boolean
    equipment_changed: boolean
    safety_notes_changed: boolean
    tags_changed: boolean
    steps_changed: boolean
  }
  reviews: VersionReview[]
}

// ─── API helpers ─────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface LoginResponse {
  access_token: string
  access?: string
  refresh?: string
  token_type: string
  user: User
}

export interface TokenRefreshResponse {
  access: string
}

export interface DashboardStats {
  total_fiches: number
  published_fiches: number
  pending_review: number
  my_drafts: number
  recent_fiches: Fiche[]
}
