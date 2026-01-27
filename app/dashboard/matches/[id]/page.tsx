'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
  Package,
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

// Desktop card view - larger cards with image, details below, and action button overlay on hover
function CardItemDesktop({ card, isExcluded, onToggleExclude, onDeleteCustom, disabled, canDelete, currentUserId }: CardItemProps) {
  const isMyCustomCard = card.isCustom && card.addedByUserId === currentUserId

  return (
    <div
      className={`relative group rounded-lg overflow-hidden transition-all ${
        isExcluded
          ? 'opacity-50'
          : card.priceExceedsMax
            ? 'ring-2 ring-yellow-500/50'
            : card.isCustom
              ? 'ring-2 ring-purple-500/30'
              : ''
      }`}
    >
      {/* Card image */}
      <div className="relative aspect-[5/7] bg-gray-800">
        {card.cardImageUri ? (
          <Image
            src={card.cardImageUri}
            alt={card.cardName}
            fill
            className={`object-cover ${isExcluded ? 'grayscale' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
            ?
          </div>
        )}

        {/* Hover overlay with actions */}
        <div className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-2 transition-opacity ${
          disabled ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!disabled) {
                onToggleExclude(card.id)
              }
            }}
            className={`p-3 rounded-full transition-colors ${
              isExcluded
                ? 'bg-green-500 hover:bg-green-400 text-white'
                : 'bg-red-500 hover:bg-red-400 text-white'
            }`}
            title={isExcluded ? 'Incluir en trade' : 'Excluir de trade'}
          >
            {isExcluded ? (
              <Check className="w-6 h-6" />
            ) : (
              <X className="w-6 h-6" />
            )}
          </button>

          {canDelete && isMyCustomCard && onDeleteCustom && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!disabled) {
                  onDeleteCustom(card.id)
                }
              }}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
              title="Eliminar carta"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Custom badge */}
        {card.isCustom && (
          <div className="absolute top-1 right-1 bg-purple-500/90 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        )}

        {/* Price warning badge */}
        {card.priceExceedsMax && (
          <div className="absolute top-1 left-1 bg-yellow-500/90 text-black text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <AlertTriangle className="w-2.5 h-2.5" />
          </div>
        )}

        {/* Excluded indicator - shown when not hovering */}
        {isExcluded && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
            <X className="w-10 h-10 text-red-400/80" />
          </div>
        )}
      </div>

      {/* Card details */}
      <div className="p-2 bg-gray-900/80">
        <h4 className={`text-xs font-medium truncate ${isExcluded ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
          {card.cardName}
        </h4>
        <p className="text-[10px] text-gray-500 truncate">
          {card.cardSetCode.toUpperCase()} • {card.condition}
          {card.isFoil && <span className="text-purple-400 ml-1">✨</span>}
        </p>
        {card.askingPrice !== null && (
          <p className={`text-xs font-medium mt-0.5 ${
            isExcluded ? 'text-gray-500' : card.priceExceedsMax ? 'text-yellow-400' : 'text-green-400'
          }`}>
            ${card.askingPrice.toFixed(2)}
          </p>
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
      {/* Comment bubble */}
      <div className={`flex-1 max-w-[85%] ${comment.isMine ? 'text-right' : ''}`}>
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

  // Edit confirmation modal state
  const [editConfirmModal, setEditConfirmModal] = useState<{
    isOpen: boolean
    pendingAction: (() => void) | null
  }>({ isOpen: false, pendingAction: null })

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

  // Check if editing requires confirmation (will change match status)
  const needsEditConfirmation = match?.status && ['requested', 'confirmed'].includes(match.status)

  // Revert match status to 'active' when editing in protected states
  const revertMatchStatus = async () => {
    if (!match) return false
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        setMatch(prev => prev ? { ...prev, status: 'active' } : null)
        return true
      }
      return false
    } catch (err) {
      console.error('Error reverting match status:', err)
      return false
    }
  }

  // Execute card exclusion toggle
  const executeToggleExclusion = (cardId: string) => {
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

  // Handle edit attempt - may require confirmation
  const toggleCardExclusion = (cardId: string) => {
    if (needsEditConfirmation) {
      setEditConfirmModal({
        isOpen: true,
        pendingAction: async () => {
          const success = await revertMatchStatus()
          if (success) {
            executeToggleExclusion(cardId)
          }
          setEditConfirmModal({ isOpen: false, pendingAction: null })
        },
      })
    } else {
      executeToggleExclusion(cardId)
    }
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
  // canEdit: allow editing in all states except completed/cancelled
  // (for requested/confirmed, a confirmation modal will be shown first)
  const canEdit = match?.status && !['completed', 'cancelled'].includes(match.status)
  const canRequest = canEdit && activeCardsIWant.length + activeCardsTheyWant.length > 0 && !hasLocalChanges && !needsEditConfirmation
  const canComment = myCommentCount < maxComments

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-mtg-green-500" />
      </div>
    )
  }

  if (error || !match) {
    const isNotFound = error === 'Trade no encontrado'
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        <div className="card text-center py-12">
          {isNotFound ? (
            <>
              <RefreshCw className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">Trade desactualizado</h3>
              <p className="text-sm text-gray-500 mb-4">Este trade fue recalculado. Volvé al inicio para ver la lista actualizada.</p>
              <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </Link>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">{error || 'Trade no encontrado'}</h3>
            </>
          )}
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
              <button
                onClick={() => setDrawerOpen(true)}
                className="text-xs px-2 py-1 rounded-full bg-mtg-green-600/20 text-mtg-green-400 hover:bg-mtg-green-600/30 flex items-center gap-1 transition-colors"
                title="Ver colección completa del otro usuario"
              >
                <Eye className="w-3 h-3" />
                Ver colección
              </button>
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

      {/* Trade actions bar */}
      {canEdit && (hasLocalChanges || canRequest) && (
        <div className="flex justify-center gap-3">
          {hasLocalChanges && (
            <>
              <button onClick={discardChanges} disabled={actionLoading !== null} className="btn-secondary text-gray-400">
                Descartar cambios
              </button>
              <button onClick={saveChanges} disabled={actionLoading !== null} className="btn-primary flex items-center gap-2">
                <Save className={`w-4 h-4 ${actionLoading === 'save' ? 'animate-pulse' : ''}`} />
                Guardar cambios
              </button>
            </>
          )}
          {!hasLocalChanges && canRequest && (
            <button
              onClick={requestTrade}
              disabled={actionLoading !== null}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              {actionLoading === 'request' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Solicitar trade
            </button>
          )}
        </div>
      )}

      {/* Trade Metrics */}
      <div className="bg-gradient-to-r from-mtg-green-900/40 via-gray-900 to-mtg-green-900/40 rounded-2xl p-4 border border-mtg-green-600/30">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Distance */}
          <div className="text-center p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
            <MapPin className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-400">
              {match.distanceKm !== null ? (match.distanceKm < 1 ? '<1' : Math.round(match.distanceKm)) : '—'}
              <span className="text-sm font-normal text-gray-500 ml-1">km</span>
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Distancia</p>
          </div>

          {/* Cards I want */}
          <div className="text-center p-3 rounded-xl bg-green-900/30 border border-green-600/30">
            <Package className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-400">{activeCardsIWant.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cartas quiero</p>
            <p className="text-xs text-green-400/70">${totalValueIWant.toFixed(2)}</p>
          </div>

          {/* Cards they want */}
          <div className="text-center p-3 rounded-xl bg-purple-900/30 border border-purple-600/30">
            <Package className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-400">{activeCardsTheyWant.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Cartas doy</p>
            <p className="text-xs text-purple-400/70">${totalValueTheyWant.toFixed(2)}</p>
          </div>

          {/* Balance */}
          <div className={`text-center p-3 rounded-xl border ${
            Math.abs(balance) < 1 ? 'bg-gray-800/60 border-gray-600/50' :
            balance > 0 ? 'bg-green-900/40 border-green-500/50' : 'bg-red-900/40 border-red-500/50'
          }`}>
            {balance >= 0 ? (
              <TrendingUp className={`w-5 h-5 mx-auto mb-1 ${Math.abs(balance) < 1 ? 'text-gray-400' : 'text-green-400'}`} />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-1" />
            )}
            <p className={`text-2xl font-bold ${Math.abs(balance) < 1 ? 'text-gray-400' : balance > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {balance > 0 ? '+' : ''}{Math.abs(balance) < 1 ? '±' : ''}${Math.abs(balance).toFixed(0)}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Balance</p>
            <p className={`text-xs ${Math.abs(balance) < 1 ? 'text-gray-500' : balance > 0 ? 'text-green-400/70' : 'text-red-400/70'}`}>
              {Math.abs(balance) < 1 ? 'equilibrado' : balance > 0 ? 'a tu favor' : 'en contra'}
            </p>
          </div>
        </div>
      </div>

      {/* Cards I want (they have) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">Querés</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-400">${totalValueIWant.toFixed(2)}</span>
            <span className="text-xs text-gray-500">
              ({activeCardsIWant.length} carta{activeCardsIWant.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

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
          <>
            {/* Mobile: List view */}
            <div className="space-y-2 lg:hidden">
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
            {/* Desktop: Grid view with larger cards */}
            <div className="hidden lg:grid lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {match.cardsIWant.map((card) => (
                <CardItemDesktop
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
          </>
        )}
      </div>

      {/* Cards they want (I have) */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Buscan</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-400">${totalValueTheyWant.toFixed(2)}</span>
            <span className="text-xs text-gray-500">
              ({activeCardsTheyWant.length} carta{activeCardsTheyWant.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>

        {match.cardsTheyWant.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No buscan cartas de tu colección</p>
        ) : (
          <>
            {/* Mobile: List view */}
            <div className="space-y-2 lg:hidden">
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
            {/* Desktop: Grid view with larger cards */}
            <div className="hidden lg:grid lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {match.cardsTheyWant.map((card) => (
                <CardItemDesktop
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
          </>
        )}
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
          <div className="flex gap-2 pt-4 mt-2 items-center">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribí un mensaje..."
              maxLength={300}
              className="flex-1 h-10 bg-gray-900/80 border border-gray-700/50 rounded-lg px-3 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-mtg-green-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  sendComment()
                }
              }}
            />
            <button
              onClick={sendComment}
              disabled={sendingComment || newComment.trim().length === 0}
              className="btn-primary w-10 h-10 p-0 flex items-center justify-center disabled:opacity-50"
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

      {/* Edit Confirmation Modal */}
      {editConfirmModal.isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[70]"
            onClick={() => setEditConfirmModal({ isOpen: false, pendingAction: null })}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[75] w-[90vw] max-w-md bg-gray-900 rounded-xl border border-gray-700 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-3">
              ¿Modificar este trade?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {match.status === 'requested' && match.iRequested && (
                <>Se cancelará la solicitud que enviaste. Deberás volver a enviar la solicitud de trade después de guardar los cambios.</>
              )}
              {match.status === 'requested' && !match.iRequested && (
                <>Se rechazará la solicitud de <span className="text-gray-200">{match.otherUser.displayName}</span>. Deberás volver a enviar la solicitud de trade después de guardar los cambios.</>
              )}
              {match.status === 'confirmed' && (
                <>Se cancelará el trade confirmado. Deberás volver a enviar la solicitud de trade después de guardar los cambios.</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditConfirmModal({ isOpen: false, pendingAction: null })}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => editConfirmModal.pendingAction?.()}
                className="btn-primary text-sm"
              >
                Sí, modificar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
