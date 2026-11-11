import client from './client'
import type { LoginResponse, User } from '../types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await client.post<LoginResponse>('/auth/login', payload)
    return data
  },

  demoLogin: async (role: string = 'admin'): Promise<LoginResponse> => {
    const { data } = await client.post<LoginResponse>(`/auth/demo-login/${role}`)
    return data
  },

  register: async (payload: RegisterPayload): Promise<User> => {
    const { data } = await client.post<User>('/auth/register/', payload)
    return data
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const { data } = await client.post<{ access: string }>('/auth/token/refresh/', { refresh })
    return data
  },

  getMe: async (): Promise<User> => {
    const { data } = await client.get<User>('/auth/me/')
    return data
  },

  listUsers: async (): Promise<User[]> => {
    const { data } = await client.get<User[]>('/auth/users/')
    return data
  },

  updateUserRole: async (userId: number, role: string): Promise<User> => {
    const { data } = await client.patch<User>(`/auth/users/${userId}/`, { role })
    return data
  },

  toggleUserActive: async (userId: number, is_active: boolean): Promise<User> => {
    const { data } = await client.patch<User>(`/auth/users/${userId}/`, { is_active })
    return data
  },
}
