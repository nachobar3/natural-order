'use client'

import { useState, useEffect } from 'react'
import { usePushNotifications } from '@/lib/hooks/use-push-notifications'
import { X, Bell, BellOff, Loader2 } from 'lucide-react'

const DISMISS_KEY = 'push-prompt-dismissed'
const DISMISS_DURATION_DAYS = 30

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return true
  const dismissedAt = localStorage.getItem(DISMISS_KEY)
  if (!dismissedAt) return false
  const dismissedDate = new Date(dismissedAt)
  const now = new Date()
  const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff < DISMISS_DURATION_DAYS
}

function setDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISMISS_KEY, new Date().toISOString())
}

export function PushPrompt() {
  const { isSupported, permission, isSubscribed, isLoading, error, subscribe } = usePushNotifications()
  const [isDismissed, setIsDismissed] = useState(true)
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    setIsDismissed(isDismissedRecently())
  }, [])

  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSubscribe = async () => {
    const success = await subscribe()
    if (success) {
      handleDismiss()
    }
  }

  const handleDismiss = () => {
    setDismissed()
    setIsDismissed(true)
  }

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission denied (can't ask again)
  // - Recently dismissed
  // - Loading initial state
  if (!isSupported || isSubscribed || permission === 'denied' || isDismissed || isLoading) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom animate-fade-in">
      <div className="card bg-gray-900/95 backdrop-blur-md border-blue-600/50 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 mb-1">
              Activar notificaciones
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Recibí alertas cuando alguien quiera tradear con vos o te envíe un mensaje.
            </p>
            {showError && error && (
              <p className="text-sm text-red-400 mb-3 flex items-center gap-1">
                <BellOff className="w-4 h-4" />
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Activar
              </button>
              <button
                onClick={handleDismiss}
                className="btn-secondary text-sm py-2 px-4"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
