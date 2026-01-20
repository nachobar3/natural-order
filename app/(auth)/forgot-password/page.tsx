'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card animate-success-pop text-center">
            <div className="text-6xl mb-4">📧</div>
            <h2 className="text-2xl font-semibold text-mtg-green-400 mb-2">
              ¡Revisá tu email!
            </h2>
            <p className="text-gray-400 mb-6">
              Te enviamos un link para restablecer tu contraseña a{' '}
              <span className="text-white font-medium">{email}</span>
            </p>
            <Link href="/login" className="btn-secondary">
              Volver al login
            </Link>
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
            <p className="text-gray-400 mt-2">Recuperá tu contraseña</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Te enviaremos un link para restablecer tu contraseña
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Enviar link de recuperación'
              )}
            </button>
          </form>

          {/* Back to login */}
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  )
}
