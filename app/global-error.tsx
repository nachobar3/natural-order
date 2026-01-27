'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body className="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
          <p className="text-gray-400 mb-6">
            Ocurrió un error inesperado. Nuestro equipo ya fue notificado.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
