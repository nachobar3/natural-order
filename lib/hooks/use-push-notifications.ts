'use client'

import { useState, useEffect, useCallback } from 'react'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'

type PushPermission = 'default' | 'granted' | 'denied'

interface UsePushNotificationsResult {
  isSupported: boolean
  permission: PushPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if push is supported and get current state
  useEffect(() => {
    async function checkPushSupport() {
      if (typeof window === 'undefined') {
        setIsLoading(false)
        return
      }

      // Check if service workers and push are supported
      const supported = 'serviceWorker' in navigator &&
                       'PushManager' in window &&
                       'Notification' in window &&
                       VAPID_PUBLIC_KEY !== ''

      setIsSupported(supported)

      if (!supported) {
        setIsLoading(false)
        return
      }

      // Get current permission
      setPermission(Notification.permission as PushPermission)

      // Check if already subscribed
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(subscription !== null)
      } catch (e) {
        console.error('Error checking push subscription:', e)
      }

      setIsLoading(false)
    }

    checkPushSupport()
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Las notificaciones push no están soportadas en este navegador')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult as PushPermission)

      if (permissionResult !== 'granted') {
        setError('Permiso de notificaciones denegado')
        setIsLoading(false)
        return false
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!response.ok) {
        throw new Error('Error al registrar la suscripción en el servidor')
      }

      trackEvent(AnalyticsEvents.PUSH_SUBSCRIBED)
      setIsSubscribed(true)
      setIsLoading(false)
      return true
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al suscribirse a notificaciones'
      setError(errorMessage)
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe()

        // Remove from server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      trackEvent(AnalyticsEvents.PUSH_UNSUBSCRIBED)
      setIsSubscribed(false)
      setIsLoading(false)
      return true
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al desuscribirse de notificaciones'
      setError(errorMessage)
      setIsLoading(false)
      return false
    }
  }, [])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  }
}
