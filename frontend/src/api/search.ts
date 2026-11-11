import client from './client'
import type { Fiche, PaginatedResponse } from '../types'

export interface SearchParams {
  q: string
  type?: string
  status?: string
  page?: number
}

export const searchApi = {
  search: async (params: SearchParams): Promise<PaginatedResponse<Fiche>> => {
    const { data } = await client.get<PaginatedResponse<Fiche>>('/search/', { params })
    return data
  },
}
