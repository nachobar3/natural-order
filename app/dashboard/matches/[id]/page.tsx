'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  ArrowRightLeft,
  ShoppingCart,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  RefreshCw,
  Save,
  X,
  Check,
  Send,
  Clock,
  Ban,
  Handshake,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Edit2,
  Eye,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Star,
} from 'lucide-react'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import type { MatchDetail, MatchCard, MatchType, MatchStatus } from '@/types/database'

// Lazy load CounterpartCollectionDrawer - only loaded when user opens the drawer
// This saves ~10KB from initial page load
const CounterpartCollectionDrawer = dynamic(
  () => import('@/components/matches/counterpart-collection-drawer').then(mod => mod.CounterpartCollectionDrawer),
  {
    ssr: false,
    loading: () => null, // Drawer is hidden by default, no loading skeleton needed
  }
)

// Lazy load LocationMap - only loaded when match has location data
// This saves ~150KB of Google Maps Geometry API from being loaded on matches without location
const LocationMap = dynamic(
  () => import('@/components/ui/location-map').then(mod => mod.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-32 bg-gray-700/50 rounded-lg animate-pulse flex items-center justify-center">
        <MapPin className="w-6 h-6 text-gray-500" />
      </div>
    ),
  }
)

const matchTypeLabels: Record<MatchType, { label: string; icon: typeof ArrowRightLeft; color: string }> = {
  two_way: { label: 'Intercambio mutuo', icon: ArrowRightLeft, color: 'text-green-400 bg-green-500/20' },
  one_way_buy: { label: 'Oportunidad de compra', icon: ShoppingCart, color: 'text-blue-400 bg-blue-500/20' },
  one_way_sell: { label: 'Oportunidad de venta', icon: Tag, color: 'text-purple-400 bg-purple-500/20' },
}

const statusLabels: Record<MatchStatus, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-gray-500/20 text-gray-400' },
  dismissed: { label: 'Descartado', color: 'bg-gray-500/20 text-gray-400' },
  contacted: { label: 'Contactado', color: 'bg-blue-500/20 text-blue-400' },
  requested: { label: 'Solicitado', color: 'bg-yellow-500/20 text-yellow-400' },
  confirmed: { label: 'Confirmado', color: 'bg-purple-500/20 text-purple-400' },
  completed: { label: 'Completado', color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
}

interface Comment {
  id: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isMine: boolean
  user: {
    id: string
    displayName: string
    avatarUrl: string | null
  }
}

interface CardItemProps {
  card: MatchCard
  isExcluded: boolean
  onToggleExclude: (cardId: string) => void
  onDeleteCustom?: (cardId: string) => void
  disabled?: boolean
  canDelete?: boolean
  currentUserId?: string
}

function CardItem({ card, isExcluded, onToggleExclude, onDeleteCustom, disabled, canDelete, currentUserId }: CardItemProps) {
  const isMyCustomCard = card.isCustom && card.addedByUserId === currentUserId

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
        isExcluded
          ? 'bg-gray-900/20 opacity-50'
          : card.priceExceedsMax
            ? 'bg-gray-900/30 border border-yellow-500/30'
            : card.isCustom
              ? 'bg-purple-900/10 border border-purple-500/20'
              : 'bg-gray-900/30'
      }`}
    >
      {/* Action buttons */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        {/* Exclude/Include button */}
        <button
          onClick={() => onToggleExclude(card.id)}
          disabled={disabled}
          className={`p-1.5 rounded-full transition-colors ${
            isExcluded
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-400'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isExcluded ? 'Incluir en trade' : 'Excluir de trade'}
        >
          {isExcluded ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Delete button for custom cards */}
        {canDelete && isMyCustomCard && onDeleteCustom && (
          <button
            onClick={() => onDeleteCustom(card.id)}
            disabled={disabled}
            className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50"
            title="Eliminar carta agregada manualmente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card image */}
      {card.cardImageUri ? (
        <Image
          src={card.cardImageUri.replace('/normal/', '/small/')}
          alt={card.cardName}
          width={40}
          height={56}
          className={`rounded object-cover flex-shrink-0 ${isExcluded ? 'grayscale' : ''}`}
        />
      ) : (
        <div className="w-[40px] h-[56px] bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
          ?
        </div>
      )}

      {/* Card info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className={`text-sm font-medium truncate ${isExcluded ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
            {card.cardName}
          </h4>
          {card.isCustom && (
            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0" title="Agregado manualmente">
              <Sparkles className="w-2.5 h-2.5" />
              Manual
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          {card.cardSetCode.toUpperCase()} • {card.condition}
          {card.isFoil && <span className="text-purple-400 ml-1">✨</span>}
        </p>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        {card.askingPrice !== null ? (
          <p className={`text-sm font-medium ${
            isExcluded
              ? 'text-gray-500 line-through'
              : card.priceExceedsMax
                ? 'text-yellow-400'
                : 'text-gray-200'
          }`}>
            ${card.askingPrice.toFixed(2)}
          </p>
        ) : (
          <p className="text-xs text-gray-500">-</p>
        )}
      </div>
    </div>
  )
}

function EscrowCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const expires = new Date(expiresAt)
      const diff = expires.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Expirado')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        setTimeLeft(`${days} día${days !== 1 ? 's' : ''} ${hours}h`)
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${minutes}m`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span className="flex items-center gap-1 text-sm text-purple-400">
      <Clock className="w-4 h-4" />
      {timeLeft}
    </span>
  )
}

function formatCommentDate(dateStr: string): string {
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

interface CommentItemProps {
  comment: Comment
  onEdit: (id: string, content: string) => void
}

function CommentItem({ comment, onEdit }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)

  const handleSaveEdit = async () => {
    if (editContent.trim() === comment.content) {
      setIsEditing(false)
      return
    }
    setSaving(true)
    await onEdit(comment.id, editContent.trim())
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <div className={`flex gap-3 ${comment.isMine ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
        {comment.user.avatarUrl ? (
          <img src={comment.user.avatarUrl} alt={comment.user.displayName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-mtg-green-400">
            {comment.user.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Comment bubble */}
      <div className={`flex-1 max-w-[80%] ${comment.isMine ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-lg px-3 py-2 ${
            comment.isMine
              ? 'bg-mtg-green-600/20 text-gray-100'
              : 'bg-gray-800 text-gray-200'
          }`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={300}
                className="w-full bg-gray-900 rounded px-2 py-1 text-sm text-gray-200 resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsEditing(false); setEditContent(comment.content) }}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || editContent.trim().length === 0}
                  className="text-xs text-mtg-green-400 hover:text-mtg-green-300 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 text-xs text-gray-500 ${comment.isMine ? 'justify-end' : ''}`}>
          <span>{formatCommentDate(comment.createdAt)}</span>
          {comment.isEdited && <span>(editado)</span>}
          {comment.isMine && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="hover:text-gray-300 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Track local exclusions (card IDs that are excluded)
  const [localExclusions, setLocalExclusions] = useState<Set<string>>(new Set())
  const [hasLocalChanges, setHasLocalChanges] = useState(false)

  // Comments state
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [myCommentCount, setMyCommentCount] = useState(0)
  const [maxComments, setMaxComments] = useState(10)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Collapsible card lists state (start collapsed)
  const [cardsIWantExpanded, setCardsIWantExpanded] = useState(false)
  const [cardsTheyWantExpanded, setCardsTheyWantExpanded] = useState(false)

  // Get current user ID
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user')
      if (res.ok) {
        const data = await res.json()
        setCurrentUserId(data.id)
      }
    } catch (err) {
      console.error('Error fetching current user:', err)
    }
  }, [])

  const loadMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Trade no encontrado')
        }
        const data = await res.json()
        throw new Error(data.error || 'Error al cargar trade')
      }
      const data = await res.json()
      setMatch(data)
      setError(null)

      // Initialize local exclusions from server state
      const excludedIds = new Set<string>()
      data.cardsIWant?.forEach((c: MatchCard) => {
        if (c.isExcluded) excludedIds.add(c.id)
      })
      data.cardsTheyWant?.forEach((c: MatchCard) => {
        if (c.isExcluded) excludedIds.add(c.id)
      })
      setLocalExclusions(excludedIds)
      setHasLocalChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/matches/${id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
        setMyCommentCount(data.myCommentCountThisMonth || 0)
        setMaxComments(data.maxCommentsPerMonth || 10)
      }
    } catch (err) {
      console.error('Error loading comments:', err)
    } finally {
      setCommentsLoading(false)
    }
  }, [id])

  const toggleCardExclusion = (cardId: string) => {
    setLocalExclusions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
    setHasLocalChanges(true)
  }

  const saveChanges = async () => {
    setActionLoading('save')
    try {
      const res = await fetch(`/api/matches/${id}/cards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedCardIds: Array.from(localExclusions) }),
      })
      if (res.ok) {
        setHasLocalChanges(false)
        await loadMatch()
      }
    } catch (err) {
      console.error('Error saving changes:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const restoreMatch = async () => {
    setActionLoading('restore')
    try {
      const res = await fetch(`/api/matches/${id}/restore`, { method: 'POST' })
      if (res.ok) await loadMatch()
    } catch (err) {
      console.error('Error restoring match:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const recalculateMatch = async () => {
    setActionLoading('recalculate')
    try {
      const res = await fetch(`/api/matches/${id}/recalculate`, { method: 'POST' })
      if (res.ok) await loadMatch()
    } catch (err) {
      console.error('Error recalculating match:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const discardChanges = () => {
    const excludedIds = new Set<string>()
    match?.cardsIWant?.forEach(c => { if (c.isExcluded) excludedIds.add(c.id) })
    match?.cardsTheyWant?.forEach(c => { if (c.isExcluded) excludedIds.add(c.id) })
    setLocalExclusions(excludedIds)
    setHasLocalChanges(false)
  }

  // Trade flow actions
  const requestTrade = async () => {
    setActionLoading('request')
    try {
      const res = await fetch(`/api/matches/${id}/request`, { method: 'POST' })
      if (res.ok) {
        trackEvent(AnalyticsEvents.TRADE_REQUESTED, { match_id: id })
        await loadMatch()
      }
    } catch (err) {
      console.error('Error requesting trade:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const cancelRequest = async () => {
    setActionLoading('cancel')
    try {
      const res = await fetch(`/api/matches/${id}/request`, { method: 'DELETE' })
      if (res.ok) {
        trackEvent(AnalyticsEvents.TRADE_CANCELLED, { match_id: id, stage: 'request' })
        await loadMatch()
      }
    } catch (err) {
      console.error('Error canceling request:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const confirmTrade = async () => {
    setActionLoading('confirm')
    try {
      const res = await fetch(`/api/matches/${id}/confirm`, { method: 'POST' })
      if (res.ok) {
        trackEvent(AnalyticsEvents.TRADE_CONFIRMED, { match_id: id })
        await loadMatch()
      }
    } catch (err) {
      console.error('Error confirming trade:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const markCompleted = async (completed: boolean) => {
    setActionLoading(completed ? 'complete-yes' : 'complete-no')
    try {
      const res = await fetch(`/api/matches/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      })
      if (res.ok) {
        if (completed) {
          trackEvent(AnalyticsEvents.TRADE_COMPLETED, { match_id: id })
        } else {
          trackEvent(AnalyticsEvents.TRADE_CANCELLED, { match_id: id, stage: 'completion' })
        }
        await loadMatch()
      }
    } catch (err) {
      console.error('Error marking trade:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const dismissMatch = async () => {
    setActionLoading('dismiss')
    trackEvent(AnalyticsEvents.MATCH_DISMISSED, { match_id: id })
    try {
      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: id, status: 'dismissed' }),
      })
      if (res.ok) router.push('/dashboard')
    } catch (err) {
      console.error('Error dismissing match:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteCustomCard = async (cardId: string) => {
    setActionLoading(`delete-${cardId}`)
    try {
      const res = await fetch(`/api/matches/${id}/cards/${cardId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadMatch()
      } else {
        const data = await res.json()
        console.error('Error deleting card:', data.error)
      }
    } catch (err) {
      console.error('Error deleting custom card:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Comment actions
  const sendComment = async () => {
    if (!newComment.trim() || sendingComment) return
    setSendingComment(true)
    try {
      const res = await fetch(`/api/matches/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (res.ok) {
        trackEvent(AnalyticsEvents.COMMENT_SENT, { match_id: id })
        setNewComment('')
        await loadComments()
        // Scroll to bottom
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    } catch (err) {
      console.error('Error sending comment:', err)
    } finally {
      setSendingComment(false)
    }
  }

  const editComment = async (commentId: string, content: string) => {
    try {
      const res = await fetch(`/api/matches/${id}/comments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, content }),
      })
      if (res.ok) {
        await loadComments()
      }
    } catch (err) {
      console.error('Error editing comment:', err)
    }
  }

  useEffect(() => {
    trackEvent(AnalyticsEvents.MATCH_VIEWED, { match_id: id })
    loadMatch()
    loadComments()
    fetchCurrentUser()
  }, [loadMatch, loadComments, fetchCurrentUser, id])

  // Calculate totals based on local exclusions
  const { activeCardsIWant, activeCardsTheyWant, totalValueIWant, totalValueTheyWant } = useMemo(() => {
    if (!match) return { activeCardsIWant: [], activeCardsTheyWant: [], totalValueIWant: 0, totalValueTheyWant: 0 }

    const activeIWant = match.cardsIWant.filter(c => !localExclusions.has(c.id))
    const activeTheyWant = match.cardsTheyWant.filter(c => !localExclusions.has(c.id))

    return {
      activeCardsIWant: activeIWant,
      activeCardsTheyWant: activeTheyWant,
      totalValueIWant: activeIWant.reduce((sum, c) => sum + (c.askingPrice || 0), 0),
      totalValueTheyWant: activeTheyWant.reduce((sum, c) => sum + (c.askingPrice || 0), 0),
    }
  }, [match, localExclusions])

  const balance = totalValueTheyWant - totalValueIWant
  const canEdit = match?.status && ['active', 'contacted', 'dismissed'].includes(match.status)
  const canRequest = canEdit && activeCardsIWant.length + activeCardsTheyWant.length > 0 && !hasLocalChanges
  const canComment = myCommentCount < maxComments

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        <div className="card text-center py-12">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">{error || 'Trade no encontrado'}</h3>
        </div>
      </div>
    )
  }

  const typeInfo = matchTypeLabels[match.matchType]
  const TypeIcon = typeInfo.icon
  const statusInfo = statusLabels[match.status]

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
            {match.otherUser.avatarUrl ? (
              <img src={match.otherUser.avatarUrl} alt={match.otherUser.displayName} className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-mtg-green-400">{match.otherUser.displayName.charAt(0).toUpperCase()}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-100">{match.otherUser.displayName}</h1>
              <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${typeInfo.color}`}>
                <TypeIcon className="w-3 h-3" />
                {typeInfo.label}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {match.isUserModified && (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Modificado</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-400">
              {match.distanceKm !== null && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {match.distanceKm < 1 ? '<1' : Math.round(match.distanceKm)} km
                </span>
              )}
              {match.hasPriceWarnings && (
                <span className="flex items-center gap-1 text-yellow-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  Precio excedido
                </span>
              )}
              {match.status === 'confirmed' && match.escrowExpiresAt && (
                <EscrowCountdown expiresAt={match.escrowExpiresAt} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trade Status Banner */}
      {match.status === 'requested' && (
        <div className={`rounded-2xl p-6 ${match.iRequested ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {match.iRequested ? (
                <>
                  <Clock className="w-6 h-6 text-yellow-400" />
                  <div>
                    <h3 className="font-semibold text-yellow-400">Esperando confirmación</h3>
                    <p className="text-sm text-gray-400">Solicitaste este trade, esperando respuesta de {match.otherUser.displayName}</p>
                  </div>
                </>
              ) : (
                <>
                  <Handshake className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="font-semibold text-green-400">{match.otherUser.displayName} solicita un trade</h3>
                    <p className="text-sm text-gray-400">Revisá las cartas y confirmá si estás de acuerdo</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {match.iRequested ? (
                <button
                  onClick={cancelRequest}
                  disabled={actionLoading !== null}
                  className="btn-secondary text-red-400 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar solicitud
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelRequest}
                    disabled={actionLoading !== null}
                    className="btn-secondary text-red-400 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Rechazar
                  </button>
                  <button
                    onClick={confirmTrade}
                    disabled={actionLoading !== null}
                    className="btn-primary flex items-center gap-2"
                  >
                    {actionLoading === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Confirmar trade
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {match.status === 'confirmed' && (
        <div className="rounded-2xl p-6 bg-purple-500/10 border border-purple-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Handshake className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="font-semibold text-purple-400">Trade confirmado - En escrow</h3>
                <p className="text-sm text-gray-400">
                  Realizá el intercambio físicamente y luego marcá como completado.
                  {match.iCompleted !== null && (
                    <span className="ml-2">
                      {match.iCompleted ? '(Vos marcaste: Realizado)' : '(Vos marcaste: No realizado)'}
                    </span>
                  )}
                  {match.theyCompleted !== null && (
                    <span className="ml-2">
                      ({match.otherUser.displayName} marcó: {match.theyCompleted ? 'Realizado' : 'No realizado'})
                    </span>
                  )}
                </p>
              </div>
            </div>
            {match.iCompleted === null && (
              <div className="flex gap-2">
                <button
                  onClick={() => markCompleted(false)}
                  disabled={actionLoading !== null}
                  className="btn-secondary text-red-400 flex items-center gap-2"
                >
                  {actionLoading === 'complete-no' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  No se realizó
                </button>
                <button
                  onClick={() => markCompleted(true)}
                  disabled={actionLoading !== null}
                  className="btn-primary flex items-center gap-2"
                >
                  {actionLoading === 'complete-yes' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                  Trade realizado
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {match.status === 'completed' && (
        <div className="rounded-2xl p-6 bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <h3 className="font-semibold text-green-400">Trade completado</h3>
              <p className="text-sm text-gray-400">Las cartas fueron intercambiadas exitosamente</p>
            </div>
          </div>
        </div>
      )}

      {match.status === 'cancelled' && (
        <div className="rounded-2xl p-6 bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="font-semibold text-red-400">Trade cancelado{match.hasConflict ? ' (Conflicto)' : ''}</h3>
              <p className="text-sm text-gray-400">
                {match.hasConflict
                  ? 'Hubo un conflicto: una parte marcó como realizado y la otra como no realizado'
                  : 'El trade fue cancelado'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit actions bar */}
      {canEdit && (
        <div className="rounded-xl p-4 bg-gray-900/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Podés excluir cartas del trade haciendo click en la</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400">
                <X className="w-3 h-3" />
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={recalculateMatch}
                disabled={actionLoading !== null}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Recalcular match con las colecciones actuales"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading === 'recalculate' ? 'animate-spin' : ''}`} />
                Recalcular
              </button>
              <button
                onClick={restoreMatch}
                disabled={actionLoading !== null}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Restaurar todas las cartas"
              >
                <RotateCcw className={`w-4 h-4 ${actionLoading === 'restore' ? 'animate-spin' : ''}`} />
                Restaurar
              </button>
              {hasLocalChanges && (
                <>
                  <button onClick={discardChanges} disabled={actionLoading !== null} className="btn-secondary text-gray-400 text-sm">
                    Descartar
                  </button>
                  <button onClick={saveChanges} disabled={actionLoading !== null} className="btn-primary flex items-center gap-2 text-sm">
                    <Save className={`w-4 h-4 ${actionLoading === 'save' ? 'animate-pulse' : ''}`} />
                    Guardar
                  </button>
                </>
              )}
              {!hasLocalChanges && canRequest && (
                <button
                  onClick={requestTrade}
                  disabled={actionLoading !== null}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  {actionLoading === 'request' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Solicitar trade
                </button>
              )}
              <button
                onClick={dismissMatch}
                disabled={actionLoading !== null}
                className="btn-secondary text-red-400 hover:text-red-300 text-sm"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Metrics - Prominent display */}
      <div className="card bg-gradient-to-br from-gray-900 to-gray-900/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Distance */}
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Distancia</span>
            </div>
            <p className="text-xl font-bold text-blue-400">
              {match.distanceKm !== null ? (match.distanceKm < 1 ? '<1' : Math.round(match.distanceKm)) : '—'}
              <span className="text-sm font-normal text-gray-400 ml-1">km</span>
            </p>
          </div>

          {/* Total Value */}
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <DollarSign className="w-4 h-4 text-mtg-gold-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Valor Total</span>
            </div>
            <p className="text-xl font-bold text-mtg-gold-400">
              ${(totalValueIWant + totalValueTheyWant).toFixed(2)}
            </p>
          </div>

          {/* Balance / Difference */}
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {balance >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-gray-400 uppercase tracking-wide">Balance</span>
            </div>
            <p className={`text-xl font-bold ${Math.abs(balance) < 1 ? 'text-gray-400' : balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {balance > 0 ? '+' : ''}{balance < 0 ? '' : ''}{Math.abs(balance) < 1 ? '±' : ''}${Math.abs(balance).toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-500">
              {Math.abs(balance) < 1 ? 'equilibrado' : balance > 0 ? 'a favor' : 'en contra'}
            </p>
          </div>

          {/* Trade Score */}
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">Score</span>
            </div>
            <p className="text-xl font-bold text-yellow-400">
              {match.matchScore?.toFixed(1) || '—'}
              <span className="text-sm font-normal text-gray-400">/10</span>
            </p>
            <p className="text-[10px] text-gray-500">
              {match.matchScore && match.matchScore >= 8 ? 'Excelente' : match.matchScore && match.matchScore >= 6 ? 'Bueno' : match.matchScore && match.matchScore >= 4 ? 'Regular' : 'Bajo'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards comparison - Two columns with collapsible lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cards I want (they have) */}
        <div className="card">
          {/* Collapsible header */}
          <button
            onClick={() => setCardsIWantExpanded(!cardsIWantExpanded)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">Cartas que querés</h2>
              {canEdit && (
                <span
                  onClick={(e) => { e.stopPropagation(); setDrawerOpen(true) }}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ver colección completa del otro usuario"
                >
                  <Eye className="w-3 h-3" />
                  Ver colección
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-400">${totalValueIWant.toFixed(2)}</span>
              <span className="text-xs text-gray-500">
                ({activeCardsIWant.length} carta{activeCardsIWant.length !== 1 ? 's' : ''})
              </span>
              {cardsIWantExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {/* Collapsed summary */}
          {!cardsIWantExpanded && match.cardsIWant.length > 0 && (
            <div className="py-2 px-3 bg-gray-800/30 rounded-lg text-sm text-gray-400">
              {activeCardsIWant.slice(0, 3).map(c => c.cardName).join(', ')}
              {activeCardsIWant.length > 3 && ` y ${activeCardsIWant.length - 3} más...`}
            </div>
          )}

          {/* Expanded list */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${cardsIWantExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {match.cardsIWant.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No tiene cartas de tu wishlist</p>
                {canEdit && (
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="text-xs px-3 py-1.5 rounded bg-mtg-green-600 hover:bg-mtg-green-500 text-white flex items-center gap-1 mx-auto transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Explorar su colección
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                {match.cardsIWant.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    isExcluded={localExclusions.has(card.id)}
                    onToggleExclude={toggleCardExclusion}
                    onDeleteCustom={deleteCustomCard}
                    disabled={!canEdit}
                    canDelete={canEdit}
                    currentUserId={currentUserId || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cards they want (I have) */}
        <div className="card">
          {/* Collapsible header */}
          <button
            onClick={() => setCardsTheyWantExpanded(!cardsTheyWantExpanded)}
            className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
          >
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Cartas que buscan</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-400">${totalValueTheyWant.toFixed(2)}</span>
              <span className="text-xs text-gray-500">
                ({activeCardsTheyWant.length} carta{activeCardsTheyWant.length !== 1 ? 's' : ''})
              </span>
              {cardsTheyWantExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {/* Collapsed summary */}
          {!cardsTheyWantExpanded && match.cardsTheyWant.length > 0 && (
            <div className="py-2 px-3 bg-gray-800/30 rounded-lg text-sm text-gray-400">
              {activeCardsTheyWant.slice(0, 3).map(c => c.cardName).join(', ')}
              {activeCardsTheyWant.length > 3 && ` y ${activeCardsTheyWant.length - 3} más...`}
            </div>
          )}

          {/* Expanded list */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${cardsTheyWantExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {match.cardsTheyWant.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No buscan cartas de tu colección</p>
            ) : (
              <div className="space-y-2 mt-3">
                {match.cardsTheyWant.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    isExcluded={localExclusions.has(card.id)}
                    onToggleExclude={toggleCardExclusion}
                    onDeleteCustom={deleteCustomCard}
                    disabled={!canEdit}
                    canDelete={canEdit}
                    currentUserId={currentUserId || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Comentarios
          </h2>
          <span className="text-xs text-gray-500">
            {myCommentCount}/{maxComments} mensajes este mes
          </span>
        </div>

        {/* Comments list */}
        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
          {commentsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay comentarios aún. Iniciá la conversación.
            </p>
          ) : (
            comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} onEdit={editComment} />
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* New comment input */}
        {canComment ? (
          <div className="flex gap-2 pt-4 mt-2">
            <div className="flex-1 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribí un mensaje..."
                maxLength={300}
                rows={2}
                className="w-full bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-mtg-green-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendComment()
                  }
                }}
              />
              <span className={`absolute bottom-2 right-2 text-xs ${newComment.length > 280 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {newComment.length}/300
              </span>
            </div>
            <button
              onClick={sendComment}
              disabled={sendingComment || newComment.trim().length === 0}
              className="btn-primary px-3 self-end disabled:opacity-50"
            >
              {sendingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="pt-4 mt-2 text-center">
            <p className="text-sm text-yellow-400">
              Alcanzaste el límite de {maxComments} mensajes por mes en este trade
            </p>
          </div>
        )}
      </div>

      {/* Location map */}
      {match.otherUser.location && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Ubicación aproximada</h2>
          <LocationMap
            latitude={match.otherUser.location.latitude}
            longitude={match.otherUser.location.longitude}
            radiusKm={0.5}
            userName={match.otherUser.displayName}
          />
        </div>
      )}

      {/* Counterpart Collection Drawer */}
      <CounterpartCollectionDrawer
        matchId={id}
        otherUserName={match.otherUser.displayName}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCardAdded={loadMatch}
      />
    </div>
  )
}
