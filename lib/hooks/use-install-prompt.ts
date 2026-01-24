'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown'

interface UseInstallPromptResult {
  canInstall: boolean
  platform: Platform
  isStandalone: boolean
  isDismissed: boolean
  promptInstall: () => Promise<void>
  dismiss: () => void
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_DAYS = 10

function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent.toLowerCase()

  // iOS detection
  if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }

  // Android detection
  if (/android/.test(ua)) {
    return 'android'
  }

  // Desktop (could still be Chrome which supports install)
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) {
    return 'desktop'
  }

  return 'unknown'
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

function isDismissedRecently(): boolean {
  if (typeof window === 'undefined') return false

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

export function useInstallPrompt(): UseInstallPromptResult {
  const [platform, setPlatform] = useState<Platform>('unknown')
  const [isStandalone, setIsStandalone] = useState(true) // Default to true to prevent flash
  const [isDismissed, setIsDismissed] = useState(true) // Default to true to prevent flash
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Initialize state on client
    setPlatform(getPlatform())
    setIsStandalone(isRunningStandalone())
    setIsDismissed(isDismissedRecently())

    // Listen for the beforeinstallprompt event (Chrome/Edge/Samsung)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Only show install prompt on mobile devices (not desktop)
  const isMobile = platform === 'ios' || platform === 'android'

  const canInstall = !isStandalone && !isDismissed && isMobile && (
    // Can show native prompt (Android Chrome)
    deferredPrompt !== null ||
    // iOS needs manual instructions
    platform === 'ios'
  )

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'dismissed') {
        setDismissed()
        setIsDismissed(true)
      }

      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setDismissed()
    setIsDismissed(true)
  }, [])

  return {
    canInstall,
    platform,
    isStandalone,
    isDismissed,
    promptInstall,
    dismiss,
  }
}
