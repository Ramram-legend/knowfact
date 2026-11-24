import client from './client'
import type {
  AIAssistantResponse,
  AISuggestionPrompt,
  AssistantMode,
  ChatHistoryMessage,
} from '../types'

export interface AskAIParams {
  message: string
  mode?: AssistantMode
  department_id?: number | null
  history?: ChatHistoryMessage[]
  limit?: number
}

export const aiAssistantApi = {
  ask: async (params: AskAIParams): Promise<AIAssistantResponse> => {
    const { data } = await client.post<AIAssistantResponse>('/ai/ask', {
      message: params.message,
      mode: params.mode ?? 'all',
      department_id: params.department_id ?? null,
      history: params.history ?? [],
      limit: params.limit ?? 5,
    })
    return data
  },

  getSuggestions: async (): Promise<AISuggestionPrompt[]> => {
    const { data } = await client.get<{ suggestions: AISuggestionPrompt[] }>('/ai/suggestions')
    return data.suggestions
  },
}
