'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, Check } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  // Process the recovery token from the URL and check session
  useEffect(() => {
    const handleRecovery = async () => {
      // Check URL hash for tokens (Supabase sends them in the hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      // Check URL search params for error
      const searchParams = new URLSearchParams(window.location.search)
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || 'Error al procesar el link de recuperación.')
        setInitializing(false)
        return
      }

      // If we have tokens in the hash, set the session
      if (accessToken && refreshToken && type === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          setError('El link de recuperación es inválido o expiró. Solicitá uno nuevo.')
          setInitializing(false)
          return
        }

        // Clear the hash from URL for security
        window.history.replaceState(null, '', window.location.pathname)
        setInitializing(false)
        return
      }

      // No tokens in URL, check if we already have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('El link de recuperación es inválido o expiró. Solicitá uno nuevo.')
      }
      setInitializing(false)
    }

    handleRecovery()
  }, [supabase.auth])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  // Show loading while processing the recovery link
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-mtg-green-400 mb-4" />
            <p className="text-gray-400">Verificando link de recuperación...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card animate-success-pop text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-mtg-green-500/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-mtg-green-400" />
            </div>
            <h2 className="text-2xl font-semibold text-mtg-green-400 mb-2">
              ¡Contraseña actualizada!
            </h2>
            <p className="text-gray-400 mb-4">
              Redirigiendo al dashboard...
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-mtg-green-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center mb-4">
              <Image
                src="/logo-removebg-preview.png"
                alt="Natural Order"
                width={80}
                height={80}
                className="object-contain mb-3"
              />
              <h1 className="logo-text text-3xl">Natural Order</h1>
            </div>
            <p className="text-gray-400 mt-2">Creá una nueva contraseña</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
              {error.includes('inválido') && (
                <Link
                  href="/forgot-password"
                  className="block mt-2 text-mtg-green-400 hover:text-mtg-green-300 underline"
                >
                  Solicitar nuevo link
                </Link>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="label">Nueva contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Repetí tu contraseña"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Actualizar contraseña'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
