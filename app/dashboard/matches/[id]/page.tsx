'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Loader2,
  MapPin,
  ArrowRightLeft,
  ShoppingCart,
  Tag,
  AlertTriangle,
  MessageCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { LocationMap } from '@/components/ui/location-map'
import type { MatchDetail, MatchCard, MatchType } from '@/types/database'

const matchTypeLabels: Record<MatchType, { label: string; icon: typeof ArrowRightLeft; color: string }> = {
  two_way: { label: 'Intercambio mutuo', icon: ArrowRightLeft, color: 'text-green-400 bg-green-500/20' },
  one_way_buy: { label: 'Oportunidad de compra', icon: ShoppingCart, color: 'text-blue-400 bg-blue-500/20' },
  one_way_sell: { label: 'Oportunidad de venta', icon: Tag, color: 'text-purple-400 bg-purple-500/20' },
}

function CardItem({ card, isMyCard }: { card: MatchCard; isMyCard: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg bg-gray-900/30 ${
        card.priceExceedsMax ? 'border border-yellow-500/30' : ''
      }`}
    >
      {/* Card image */}
      {card.cardImageUri ? (
        <Image
          src={card.cardImageUri.replace('/normal/', '/small/')}
          alt={card.cardName}
          width={40}
          height={56}
          className="rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-[40px] h-[56px] bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
          ?
        </div>
      )}

      {/* Card info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-100 truncate">{card.cardName}</h4>
        <p className="text-xs text-gray-500">
          {card.cardSetCode.toUpperCase()} • {card.condition}
          {card.isFoil && <span className="text-purple-400 ml-1">✨</span>}
        </p>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        {card.askingPrice !== null ? (
          <p className={`text-sm font-medium ${card.priceExceedsMax ? 'text-yellow-400' : 'text-gray-200'}`}>
            ${card.askingPrice.toFixed(2)}
          </p>
        ) : (
          <p className="text-xs text-gray-500">-</p>
        )}
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
  const [updatingStatus, setUpdatingStatus] = useState(false)

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [id])

  const updateStatus = async (status: 'contacted' | 'dismissed') => {
    setUpdatingStatus(true)
    try {
      const res = await fetch('/api/matches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: id, status }),
      })
      if (res.ok) {
        if (status === 'dismissed') {
          router.push('/dashboard')
        } else {
          setMatch(prev => prev ? { ...prev, status } : null)
        }
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  useEffect(() => {
    loadMatch()
  }, [loadMatch])

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
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        <div className="card text-center py-12">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            {error || 'Trade no encontrado'}
          </h3>
        </div>
      </div>
    )
  }

  const typeInfo = matchTypeLabels[match.matchType]
  const TypeIcon = typeInfo.icon
  // Balance = valor de mis cartas - valor de sus cartas
  // Positivo = ellos me deben pagar, Negativo = yo debo pagar
  const balance = match.totalValueTheyWant - match.totalValueIWant

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-mtg-green-600/20 flex items-center justify-center flex-shrink-0">
            {match.otherUser.avatarUrl ? (
              <img
                src={match.otherUser.avatarUrl}
                alt={match.otherUser.displayName}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-mtg-green-400">
                {match.otherUser.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-100">
                {match.otherUser.displayName}
              </h1>
              <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${typeInfo.color}`}>
                <TypeIcon className="w-3 h-3" />
                {typeInfo.label}
              </span>
              {match.status === 'contacted' && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Contactado
                </span>
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
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {match.status !== 'contacted' && (
              <button
                onClick={() => updateStatus('contacted')}
                disabled={updatingStatus}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Contactado
              </button>
            )}
            <button
              onClick={() => updateStatus('dismissed')}
              disabled={updatingStatus}
              className="btn-secondary text-red-400 hover:text-red-300 text-sm"
            >
              Descartar
            </button>
          </div>
        </div>
      </div>

      {/* Cards comparison - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cards I want (they have) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wide">
              Cartas que querés
            </h2>
            <span className="text-xs text-gray-500">
              {match.cardsIWant.length} carta{match.cardsIWant.length !== 1 ? 's' : ''}
            </span>
          </div>

          {match.cardsIWant.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No tiene cartas de tu wishlist
            </p>
          ) : (
            <div className="space-y-2">
              {match.cardsIWant.map((card) => (
                <CardItem key={card.id} card={card} isMyCard={false} />
              ))}
            </div>
          )}

          {/* Subtotal */}
          <div className="mt-4 pt-3 border-t border-mtg-green-900/30 flex items-center justify-between">
            <span className="text-sm text-gray-400">Subtotal</span>
            <span className="text-lg font-semibold text-green-400">
              ${match.totalValueIWant.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Cards they want (I have) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
              Cartas que buscan
            </h2>
            <span className="text-xs text-gray-500">
              {match.cardsTheyWant.length} carta{match.cardsTheyWant.length !== 1 ? 's' : ''}
            </span>
          </div>

          {match.cardsTheyWant.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No buscan cartas de tu colección
            </p>
          ) : (
            <div className="space-y-2">
              {match.cardsTheyWant.map((card) => (
                <CardItem key={card.id} card={card} isMyCard={true} />
              ))}
            </div>
          )}

          {/* Subtotal */}
          <div className="mt-4 pt-3 border-t border-mtg-green-900/30 flex items-center justify-between">
            <span className="text-sm text-gray-400">Subtotal</span>
            <span className="text-lg font-semibold text-blue-400">
              ${match.totalValueTheyWant.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Trade balance */}
      {match.matchType === 'two_way' && (
        <div className={`card border-2 ${
          Math.abs(balance) < 1
            ? 'border-green-500/50 bg-green-500/5'
            : balance > 0
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Math.abs(balance) < 1 ? (
                <div className="p-2 rounded-full bg-green-500/20">
                  <Minus className="w-5 h-5 text-green-400" />
                </div>
              ) : balance > 0 ? (
                <div className="p-2 rounded-full bg-green-500/20">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-red-500/20">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-100">Balance del trade</h3>
                <p className="text-sm text-gray-400">
                  {Math.abs(balance) < 1
                    ? 'Trade equilibrado'
                    : balance > 0
                      ? 'Tus cartas valen más, deberías recibir la diferencia'
                      : 'Sus cartas valen más, deberías pagar la diferencia'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${
                Math.abs(balance) < 1
                  ? 'text-green-400'
                  : balance > 0
                    ? 'text-green-400'
                    : 'text-red-400'
              }`}>
                ${Math.abs(balance).toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {Math.abs(balance) < 1
                  ? 'sin diferencia'
                  : balance > 0
                    ? 'a recibir'
                    : 'a pagar'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location map */}
      {match.otherUser.location && (
        <div className="card">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Ubicación aproximada
          </h2>
          <LocationMap
            latitude={match.otherUser.location.latitude}
            longitude={match.otherUser.location.longitude}
            radiusKm={0.5}
            userName={match.otherUser.displayName}
          />
        </div>
      )}
    </div>
  )
}
