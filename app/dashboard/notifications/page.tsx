'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  Loader2,
  ArrowRightLeft,
  MessageCircle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Handshake,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'
import type { NotificationType } from '@/types/database'

interface Notification {
  id: string
  type: NotificationType
  matchId: string | null
  content: string
  isRead: boolean
  createdAt: string
  fromUser: {
    id: string
    displayName: string
    avatarUrl: string | null
  } | null
  match: {
    id: string
  } | null
}

const notificationIcons: Record<NotificationType, typeof Bell> = {
  new_match: ArrowRightLeft,
  trade_requested: Send,
  trade_confirmed: Handshake,
  trade_completed: CheckCircle,
  trade_cancelled: XCircle,
  trade_rejected: ThumbsDown,
  match_modified: ArrowRightLeft,
  new_comment: MessageCircle,
  request_invalidated: XCircle,
  escrow_reminder: Clock,
}

const notificationColors: Record<NotificationType, string> = {
  new_match: 'text-green-400 bg-green-500/20',
  trade_requested: 'text-yellow-400 bg-yellow-500/20',
  trade_confirmed: 'text-purple-400 bg-purple-500/20',
  trade_completed: 'text-green-400 bg-green-500/20',
  trade_cancelled: 'text-red-400 bg-red-500/20',
  trade_rejected: 'text-red-400 bg-red-500/20',
  match_modified: 'text-blue-400 bg-blue-500/20',
  new_comment: 'text-blue-400 bg-blue-500/20',
  request_invalidated: 'text-orange-400 bg-orange-500/20',
  escrow_reminder: 'text-orange-400 bg-orange-500/20',
}

function formatNotificationDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins}m`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays < 7) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function NotificationItem({ notification }: { notification: Notification }) {
  const Icon = notificationIcons[notification.type] || Bell
  const colorClass = notificationColors[notification.type] || 'text-gray-400 bg-gray-500/20'

  const content = (
    <div className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
      notification.isRead ? 'bg-gray-900/30' : 'bg-gray-800/50 border-l-2 border-mtg-green-500'
    } hover:bg-gray-800/70`}>
      {/* Icon */}
      <div className={`p-2 rounded-full flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
          {notification.content}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {notification.fromUser && (
            <span className="text-xs text-gray-500">
              de {notification.fromUser.displayName}
            </span>
          )}
          <span className="text-xs text-gray-600">•</span>
          <span className="text-xs text-gray-500">
            {formatNotificationDate(notification.createdAt)}
          </span>
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="w-2 h-2 rounded-full bg-mtg-green-500 flex-shrink-0 mt-2" />
      )}
    </div>
  )

  if (notification.matchId) {
    return (
      <Link href={`/dashboard/matches/${notification.matchId}`}>
        {content}
      </Link>
    )
  }

  return content
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })

      if (res.ok) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }, [unreadCount])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Mark all as read when entering the page (after loading)
  useEffect(() => {
    if (!loading && unreadCount > 0) {
      // Small delay to ensure user sees the unread state briefly
      const timeout = setTimeout(() => {
        markAllAsRead()
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [loading, unreadCount, markAllAsRead])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-mtg-green-400" />
          <h1 className="text-xl font-bold text-gray-100">Notificaciones</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-mtg-green-500/20 text-mtg-green-400 rounded-full">
              {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="card text-center py-12">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Sin notificaciones</h3>
          <p className="text-sm text-gray-500">
            Cuando haya actividad en tus matches, aparecerá acá
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  )
}
