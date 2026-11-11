import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { BookOpen, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'

interface RegisterForm {
  full_name: string
  email: string
  password: string
  confirmPassword: string
}

export default function Register() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard')
  }, [isAuthenticated, navigate])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    setApiError('')
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      })
      setSuccess(true)
    } catch (err: any) {
      const errData = err?.response?.data
      const msg =
        errData?.email?.[0] ||
        errData?.password?.[0] ||
        errData?.detail ||
        'Registration failed. Please try again.'
      setApiError(msg)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
            <BookOpen className="h-7 w-7 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Account created!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your account has been created. You can now sign in.
          </p>
          <Link to="/login" className="btn-primary justify-center w-full">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg mb-4">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KnowFact</h1>
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Register</h2>

          {apiError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 mb-5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                className={`input-field ${errors.full_name ? 'border-red-400' : ''}`}
                placeholder="Jane Doe"
                {...register('full_name', { required: 'Full name is required' })}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                })}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field pr-10 ${errors.password ? 'border-red-400' : ''}`}
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input
                type="password"
                className={`input-field ${errors.confirmPassword ? 'border-red-400' : ''}`}
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
