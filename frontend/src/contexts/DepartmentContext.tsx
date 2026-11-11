/**
 * contexts/DepartmentContext.tsx
 * Fournit la liste des départements et le département actif à toute l'application.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Department } from '../types'
import { departmentsApi } from '../api/departments'
import { useAuth } from './AuthContext'

interface DepartmentContextValue {
  departments: Department[]
  activeDeptId: number | null
  setActiveDeptId: (id: number | null) => void
  loading: boolean
  reload: () => Promise<void>
}

const DepartmentContext = createContext<DepartmentContextValue | null>(null)

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [activeDeptId, setActiveDeptId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const data = await departmentsApi.list()
      setDepartments(data)
    } catch {
      // Silencieux : les depts sont optionnels pour le fonctionnement de base
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <DepartmentContext.Provider value={{ departments, activeDeptId, setActiveDeptId, loading, reload }}>
      {children}
    </DepartmentContext.Provider>
  )
}

export function useDepartments(): DepartmentContextValue {
  const ctx = useContext(DepartmentContext)
  if (!ctx) throw new Error('useDepartments doit être utilisé dans DepartmentProvider')
  return ctx
}
