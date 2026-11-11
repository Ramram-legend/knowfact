import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User } from '../types'
import { authApi } from '../api/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  demoLogin: (role?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const demoLogin = useCallback(async (role: string = 'admin') => {
    try {
      const response = await authApi.demoLogin(role)
      // Backend returns access_token and access (both set to the JWT)
      const tokenVal = response.access_token || response.access
      if (tokenVal) {
        localStorage.setItem('access_token', tokenVal)
        setToken(tokenVal)
      }
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user))
        setUser(response.user)
      }
    } catch (err) {
      console.error('Demo login error:', err)
    }
  }, [])

  // Initialize from localStorage or auto-login directly as Admin!
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        try {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
          setIsLoading(false)
          return
        } catch {
          localStorage.clear()
        }
      }

      // No token found: automatically auto-connect as Admin for direct access!
      try {
        await demoLogin('admin')
      } catch (err) {
        console.error('Direct access auto-login error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [demoLogin])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password })
    // Backend returns both access_token and access (alias)
    const tokenVal = response.access_token || response.access
    if (tokenVal) {
      localStorage.setItem('access_token', tokenVal)
      setToken(tokenVal)
    }
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user))
      setUser(response.user)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
