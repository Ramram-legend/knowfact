// ─── Département / Poste ─────────────────────────────────────────────────────
export interface Workstation {
  id: number
  department_id: number
  name: string
  code?: string | null
  description?: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  description?: string | null
  color: string
  icon: string
  manager_id?: number | null
  is_active: boolean
  display_order: number
  created_at: string
  manager?: User | null
  workstations: Workstation[]
  member_count?: number
}

export interface DepartmentDetail extends Department {
  members: DepartmentMember[]
  fiche_count: number
}

export interface DepartmentMember {
  user_id: number
  user?: User | null
  workstation?: Workstation | null
  is_primary: boolean
  full_name: string
  role: string
}

export interface UserDepartment {
  id: number
  user_id: number
  department_id: number
  workstation_id?: number | null
  is_primary: boolean
  created_at: string
  department?: Department | null
  workstation?: Workstation | null
}

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'operator' | 'technician' | 'engineer' | 'expert' | 'admin'

export interface User {
  id: number
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  primary_department_id?: number | null
  primary_workstation_id?: number | null
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
  department_id?: number | null
  workstation_id?: number | null
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

// ─── Gamification ────────────────────────────────────────────────────────────
export interface BadgeItem {
  badge_id: string
  name: string
  description: string
  icon: string
  color: string
  earned_at?: string
  criteria?: string
  is_earned?: boolean
}

export interface GamificationTransaction {
  id: number
  action: string
  points: number
  reason?: string | null
  reference_id?: number | null
  reference_type?: string | null
  created_at: string
}

export interface UserGamificationProfile {
  user_id: number
  total_points: number
  level: number
  level_name: string
  level_icon: string
  progress_pct: number
  points_to_next: number
  next_level_name: string | null
  solutions_shared: number
  procedures_created: number
  tasks_contributed: number
  helpful_contributions: number
  total_contributions: number
  badges: BadgeItem[]
  recent_transactions: GamificationTransaction[]
  full_name?: string
  role?: string
  initials?: string
  leaderboard_rank?: number | null
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  full_name: string
  role: string
  level: number
  level_name: string
  level_icon: string
  total_points: number
  badges_count: number
  initials: string
}

export interface LeaderboardResponse {
  period: string
  role?: string
  current_user_rank: number | null
  leaderboard: LeaderboardEntry[]
}

export interface GamificationNotification {
  id: number
  type: string
  message: string
  reference_id?: number | null
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  unread_count: number
  notifications: GamificationNotification[]
}

export interface PointConfig {
  id: number
  action_key: string
  points: number
  label: string
  description: string | null
  is_active: boolean
  updated_at?: string
}

export interface AdminStats {
  total_users_with_points: number
  total_points_awarded: number
  total_transactions: number
  avg_points_per_user: number
  top_earners: {
    user_id: number
    full_name: string
    total_points: number
    level: number
  }[]
  recent_transactions: GamificationTransaction[]
  suspicious_users: {
    user_id: number
    full_name: string
    flagged_actions: { action: string; count: number }[]
  }[]
}

// ─── Fiche Opératoire Simplifiée (Operating Sheet / SOP) ────────────────────
export interface PPEItem {
  code: 'glasses' | 'gloves' | 'safety_shoes' | 'ear_protection' | 'helmet' | 'mask' | 'hi_vis' | string
  name: string
  required: boolean
  description?: string | null
}

export interface OperatingStep {
  order: number
  title: string
  instruction: string
  control_point: string
  warning?: string | null
  image_url?: string | null
}

export interface SafetySection {
  hazards: string[]
  precautions: string[]
  prohibitions: string[]
  emergency_actions: string[]
}

export interface ValidationChecklist {
  items: string[]
  completion_text: string
  operator_signature_title: string
  supervisor_signature_title: string
}

export interface OperatingSheet {
  company_name: string
  title: string
  reference: string
  fiche_id: number
  procedure_version: number
  sheet_version: string
  department_name: string
  department_code: string
  workstation_name?: string | null
  created_at: string
  generated_at: string
  author_name: string
  validator_name?: string | null
  objective: string
  tools_and_equipment: string[]
  required_ppe: PPEItem[]
  prerequisites: string[]
  estimated_duration?: string | null
  difficulty_level?: string | null
  steps: OperatingStep[]
  safety: SafetySection
  validation: ValidationChecklist
}

// ─── Assistant IA (Recherche intelligente Solutions & Tâches) ───────────────
export type AssistantMode = 'all' | 'solutions' | 'tasks' | 'procedures'

export interface ChatHistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIAssistantFicheSummary {
  id: number
  title: string
  type: FicheType | string
  status: FicheStatus | string
  version: number
  author_name: string
  department_id?: number | null
  department_name?: string | null
  workstation_name?: string | null
  equipment: string
  tags: string[]
  useful_count: number
  security_note?: string | null
}

export interface AIAssistantRecommendation {
  fiche: AIAssistantFicheSummary
  relevance_score: number
  match_reasons: string[]
  excerpt: string
  key_steps: string[]
  safety_warning?: string | null
}

export interface AIAssistantResponse {
  answer: string
  intent_detected: 'solution' | 'task' | 'procedure' | 'general' | string
  mode_used: AssistantMode
  detected_department?: string | null
  keywords_used: string[]
  recommendations: AIAssistantRecommendation[]
  suggested_followups: string[]
  total_candidates_scanned: number
}

export interface AISuggestionPrompt {
  label: string
  prompt: string
  mode: AssistantMode
}
