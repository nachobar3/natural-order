'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, RefreshCw, LogOut } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function handleResendEmail() {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      setError('No se pudo obtener el email del usuario')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setResent(true)
    }

    setLoading(false)
  }

  async function handleRefresh() {
    // Force refresh the session to check if email was verified
    const { data: { user } } = await supabase.auth.getUser()

    if (user?.email_confirmed_at) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('El email aún no ha sido verificado')
      setTimeout(() => setError(null), 3000)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card animate-fade-in text-center">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo-removebg-preview.png"
              alt="Natural Order"
              width={80}
              height={80}
              className="object-contain mb-3"
            />
            <h1 className="logo-text text-3xl">Natural Order</h1>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Mail className="w-10 h-10 text-amber-400" />
          </div>

          {/* Message */}
          <h2 className="text-2xl font-semibold text-gray-100 mb-2">
            Verificá tu email
          </h2>
          <p className="text-gray-400 mb-6">
            Para acceder a Natural Order necesitás confirmar tu dirección de email.
            Revisá tu bandeja de entrada (y spam) y hacé click en el link de verificación.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {resent && (
            <div className="mb-4 p-3 rounded-lg bg-mtg-green-500/20 border border-mtg-green-500/50 text-mtg-green-400 text-sm">
              Email reenviado. Revisá tu bandeja de entrada.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleRefresh}
              className="btn-primary w-full"
            >
              <RefreshCw className="w-4 h-4" />
              Ya verifiqué mi email
            </button>

            <button
              onClick={handleResendEmail}
              disabled={loading || resent}
              className="btn-secondary w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {resent ? 'Email reenviado' : 'Reenviar email de verificación'}
                </>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>

          {/* Help text */}
          <p className="mt-6 text-xs text-gray-500">
            ¿Problemas con la verificación?{' '}
            <Link href="/login" className="text-mtg-green-400 hover:text-mtg-green-300">
              Intentá iniciar sesión de nuevo
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
