import { track } from '@vercel/analytics'

/**
 * Analytics event names - centralized for consistency
 */
export const AnalyticsEvents = {
  // Auth & Onboarding
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',
  PROFILE_COMPLETED: 'profile_completed',
  LOCATION_SET: 'location_set',

  // Collection & Wishlist
  COLLECTION_IMPORT: 'collection_import',
  WISHLIST_IMPORT: 'wishlist_import',
  CARD_ADDED: 'card_added',
  CARD_REMOVED: 'card_removed',

  // Matching & Trading
  MATCHES_COMPUTED: 'matches_computed',
  MATCH_VIEWED: 'match_viewed',
  MATCH_DISMISSED: 'match_dismissed',
  MATCH_RESTORED: 'match_restored',
  TRADE_REQUESTED: 'trade_requested',
  TRADE_CONFIRMED: 'trade_confirmed',
  TRADE_COMPLETED: 'trade_completed',
  TRADE_CANCELLED: 'trade_cancelled',

  // Communication
  COMMENT_SENT: 'comment_sent',

  // Engagement
  PWA_INSTALL_PROMPTED: 'pwa_install_prompted',
  PWA_INSTALLED: 'pwa_installed',
  PUSH_SUBSCRIBED: 'push_subscribed',
  PUSH_UNSUBSCRIBED: 'push_unsubscribed',
} as const

type EventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents]

/**
 * Track a custom event
 * @param name - Event name from AnalyticsEvents
 * @param properties - Optional properties to include with the event
 */
export function trackEvent(
  name: EventName | string,
  properties?: Record<string, string | number | boolean | null>
): void {
  try {
    track(name, properties)
  } catch (error) {
    // Silently fail - analytics should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.warn('Analytics tracking failed:', error)
    }
  }
}

/**
 * Track page view (automatically handled by Vercel Analytics for Next.js pages)
 * Use this for custom "virtual" page views in SPAs
 */
export function trackPageView(path: string): void {
  trackEvent('page_view', { path })
}
