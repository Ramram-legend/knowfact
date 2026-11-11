/**
 * api/departments.ts — Client API pour les départements et postes de travail.
 */
import client from './client'
import type { Department, DepartmentDetail, Workstation, UserDepartment } from '../types'

// ─── Types des payloads ───────────────────────────────────────────────────────

export interface DepartmentCreatePayload {
  name: string
  code: string
  description?: string
  color?: string
  icon?: string
  manager_id?: number | null
  display_order?: number
}

export interface DepartmentUpdatePayload {
  name?: string
  code?: string
  description?: string
  color?: string
  icon?: string
  manager_id?: number | null
  is_active?: boolean
  display_order?: number
}

export interface WorkstationPayload {
  name: string
  code?: string
  description?: string
  display_order?: number
}

export interface AssignMemberPayload {
  user_id: number
  workstation_id?: number | null
  is_primary?: boolean
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const departmentsApi = {
  /** Liste tous les départements actifs avec leurs postes et nombre de membres. */
  list: async (): Promise<Department[]> => {
    const { data } = await client.get<Department[]>('/departments/')
    return data
  },

  /** Mes départements (pour l'utilisateur connecté). */
  my: async (): Promise<UserDepartment[]> => {
    const { data } = await client.get<UserDepartment[]>('/departments/my')
    return data
  },

  /** Détail complet d'un département (membres, postes, nb fiches). */
  get: async (id: number): Promise<DepartmentDetail> => {
    const { data } = await client.get<DepartmentDetail>(`/departments/${id}`)
    return data
  },

  /** Créer un département (admin). */
  create: async (payload: DepartmentCreatePayload): Promise<Department> => {
    const { data } = await client.post<Department>('/departments/', payload)
    return data
  },

  /** Modifier un département (admin). */
  update: async (id: number, payload: DepartmentUpdatePayload): Promise<Department> => {
    const { data } = await client.put<Department>(`/departments/${id}`, payload)
    return data
  },

  /** Désactiver un département (admin, soft delete). */
  remove: async (id: number): Promise<void> => {
    await client.delete(`/departments/${id}`)
  },

  // ─── Postes ────────────────────────────────────────────────────────────────

  /** Liste les postes d'un département. */
  listWorkstations: async (deptId: number): Promise<Workstation[]> => {
    const { data } = await client.get<Workstation[]>(`/departments/${deptId}/workstations`)
    return data
  },

  /** Créer un poste dans un département (admin). */
  createWorkstation: async (deptId: number, payload: WorkstationPayload): Promise<Workstation> => {
    const { data } = await client.post<Workstation>(`/departments/${deptId}/workstations`, payload)
    return data
  },

  /** Modifier un poste (admin). */
  updateWorkstation: async (
    deptId: number,
    wsId: number,
    payload: Partial<WorkstationPayload> & { is_active?: boolean }
  ): Promise<Workstation> => {
    const { data } = await client.put<Workstation>(
      `/departments/${deptId}/workstations/${wsId}`,
      payload
    )
    return data
  },

  /** Désactiver un poste (admin). */
  removeWorkstation: async (deptId: number, wsId: number): Promise<void> => {
    await client.delete(`/departments/${deptId}/workstations/${wsId}`)
  },

  // ─── Membres ───────────────────────────────────────────────────────────────

  /** Affecter un utilisateur à un département (admin). */
  assignMember: async (deptId: number, payload: AssignMemberPayload): Promise<UserDepartment> => {
    const { data } = await client.post<UserDepartment>(`/departments/${deptId}/members`, payload)
    return data
  },

  /** Retirer l'affectation d'un utilisateur (admin). */
  removeMember: async (deptId: number, userId: number): Promise<void> => {
    await client.delete(`/departments/${deptId}/members/${userId}`)
  },
}
