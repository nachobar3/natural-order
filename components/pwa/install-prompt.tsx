'use client'

import { useInstallPrompt } from '@/lib/hooks/use-install-prompt'
import { X, Download, Share, PlusSquare } from 'lucide-react'

export function InstallPrompt() {
  const { canInstall, platform, promptInstall, dismiss } = useInstallPrompt()

  // Don't show if can't install
  if (!canInstall) return null

  // iOS instructions
  if (platform === 'ios') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom animate-fade-in">
        <div className="card bg-gray-900/95 backdrop-blur-md border-mtg-green-600/50 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-mtg-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-100 mb-1">
                Instalá Natural Order
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                Agregá la app a tu pantalla de inicio para acceder más rápido.
              </p>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <Share className="w-4 h-4 text-blue-400" />
                  <span>Tocá el botón <strong>Compartir</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <PlusSquare className="w-4 h-4 text-gray-400" />
                  <span>Seleccioná <strong>&quot;Agregar a inicio&quot;</strong></span>
                </div>
              </div>
            </div>
            <button
              onClick={dismiss}
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

  // Android/Chrome - native prompt
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-bottom animate-fade-in">
      <div className="card bg-gray-900/95 backdrop-blur-md border-mtg-green-600/50 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-mtg-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 mb-1">
              Instalá Natural Order
            </h3>
            <p className="text-sm text-gray-400 mb-3">
              Agregá la app a tu pantalla de inicio para acceder más rápido.
            </p>
            <div className="flex gap-2">
              <button
                onClick={promptInstall}
                className="btn-primary text-sm py-2 px-4"
              >
                <Download className="w-4 h-4" />
                Instalar
              </button>
              <button
                onClick={dismiss}
                className="btn-secondary text-sm py-2 px-4"
              >
                Ahora no
              </button>
            </div>
          </div>
          <button
            onClick={dismiss}
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
