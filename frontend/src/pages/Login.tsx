import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const { login, demoLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleDirectAccess = async (role: string = 'admin') => {
    setApiError('')
    try {
      await demoLogin(role)
      navigate('/dashboard')
    } catch {
      setApiError('Impossible de se connecter directement.')
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setApiError('')
    try {
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Identifiants invalides.'
      setApiError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg mb-4">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KnowFact</h1>
          <p className="text-sm text-gray-500 mt-1">Industrial Knowledge Management</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6 pb-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Accès direct à la plateforme</h2>
            <p className="text-xs text-gray-500 mb-4">Entrez directement sans saisir d'identifiants :</p>
            
            <button
              type="button"
              onClick={() => handleDirectAccess('admin')}
              className="w-full mb-3 flex items-center justify-between px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-sm transition-all"
            >
              <div className="text-left">
                <span className="block text-sm font-semibold">Accéder en tant qu'Admin</span>
                <span className="block text-[11px] text-primary-100">Accès complet à toutes les fonctionnalités</span>
              </div>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDirectAccess('expert')}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium rounded-lg text-left transition-colors"
              >
                <span className="block font-semibold">Mode Expert</span>
                <span className="text-[10px] text-amber-600">Revue & validation</span>
              </button>
              <button
                type="button"
                onClick={() => handleDirectAccess('engineer')}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-medium rounded-lg text-left transition-colors"
              >
                <span className="block font-semibold">Mode Ingénieur</span>
                <span className="text-[10px] text-blue-600">Création de fiches</span>
              </button>
            </div>
          </div>

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Ou se connecter par email</h3>

          {apiError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mb-5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input-field ${errors.email ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input-field pr-10 ${errors.password ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="••••••••"
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
