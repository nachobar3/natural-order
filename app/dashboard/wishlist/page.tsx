'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CardSearch } from '@/components/cards/card-search'
import { AddCardModal } from '@/components/cards/add-card-modal'
import { Heart, Loader2, Trash2, Edit2, Plus } from 'lucide-react'
import Image from 'next/image'
import type { WishlistWithCard, CardCondition } from '@/types/database'

interface CardSearchResult {
  scryfall_id: string
  oracle_id: string
  name: string
  set_code: string
  set_name: string
  collector_number: string | null
  image_uri: string | null
  image_uri_small: string | null
  prices_usd: number | null
  prices_usd_foil: number | null
  rarity: string | null
  type_line: string | null
  mana_cost: string | null
  colors: string[] | null
  color_identity: string[] | null
  cmc: number | null
  legalities: Record<string, string> | null
  released_at: string | null
}

const conditionLabels: Record<CardCondition, string> = {
  NM: 'Near Mint',
  LP: 'Lightly Played',
  MP: 'Moderately Played',
  HP: 'Heavily Played',
  DMG: 'Damaged',
}

const foilLabels = {
  any: 'Cualquiera',
  foil_only: 'Solo foil',
  non_foil: 'Solo no-foil',
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistWithCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistWithCard | null>(null)

  const supabase = createClient()

  const loadWishlist = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('wishlist')
      .select('*, cards(*)')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })

    if (error) {
      console.error('Error loading wishlist:', error)
      return
    }

    setWishlist(data as WishlistWithCard[] || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  const handleCardSelect = (card: CardSearchResult) => {
    setSelectedCard(card)
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEditItem = (item: WishlistWithCard) => {
    setEditingItem(item)
    setSelectedCard(null)
    setIsModalOpen(true)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta carta de tu wishlist?')) return

    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting item:', error)
      return
    }

    setWishlist((prev) => prev.filter((item) => item.id !== id))
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedCard(null)
    setEditingItem(null)
  }

  const handleSaveSuccess = () => {
    loadWishlist()
    handleModalClose()
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Mi Wishlist</h1>
          <p className="text-gray-400 mt-1">
            {wishlist.length} carta{wishlist.length !== 1 ? 's' : ''} que estás buscando
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card overflow-visible relative z-20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-mtg-green-600/20">
            <Plus className="w-5 h-5 text-mtg-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Agregar carta</h2>
            <p className="text-sm text-gray-400">Buscá una carta para agregarla a tu wishlist</p>
          </div>
        </div>
        <CardSearch onSelect={handleCardSelect} placeholder="Buscar carta para agregar..." />
      </div>

      {/* Wishlist list */}
      {wishlist.length === 0 ? (
        <div className="card text-center py-12">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Tu wishlist está vacía
          </h3>
          <p className="text-gray-500">
            Usá el buscador de arriba para agregar las cartas que buscás
          </p>
        </div>
      ) : (
        <div className="grid gap-4 relative z-10">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="card flex items-center gap-4 hover:border-mtg-green-500/30 transition-colors"
            >
              {/* Card image */}
              {item.cards?.image_uri_small ? (
                <Image
                  src={item.cards.image_uri_small}
                  alt={item.cards.name}
                  width={60}
                  height={84}
                  className="rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-[60px] h-[84px] bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                  ?
                </div>
              )}

              {/* Card info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-100 truncate">
                  {item.cards?.name || 'Carta desconocida'}
                </h3>
                {item.cards && (
                  <p className="text-sm text-gray-400 truncate">
                    {item.edition_preference === 'any'
                      ? 'Cualquier edición'
                      : item.specific_editions?.length === 1
                        ? `${item.cards.set_name} (${item.cards.set_code.toUpperCase()})`
                        : `${item.specific_editions?.length || 0} ediciones específicas`
                    }
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                    x{item.quantity}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                    Min: {conditionLabels[item.min_condition]}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                    {foilLabels[item.foil_preference]}
                  </span>
                  {item.edition_preference === 'specific' && item.specific_editions && item.specific_editions.length > 0 && (
                    <span className="text-xs px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">
                      {item.specific_editions.length} ed.
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.priority >= 8 ? 'bg-red-500/20 text-red-300' :
                    item.priority >= 5 ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    Prioridad: {item.priority}
                  </span>
                </div>
              </div>

              {/* Price info */}
              <div className="text-right flex-shrink-0">
                {item.max_price ? (
                  <p className="text-sm text-gray-400">
                    Máx: <span className="text-mtg-green-400">${item.max_price.toFixed(2)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Sin límite de precio</p>
                )}
                {item.cards?.prices_usd && (
                  <p className="text-xs text-gray-500">
                    CK: ${item.cards.prices_usd.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditItem(item)}
                  className="p-2 text-gray-400 hover:text-mtg-green-400 hover:bg-mtg-green-900/20 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddCardModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSaveSuccess}
        card={selectedCard}
        editItem={editingItem}
        mode="wishlist"
      />
    </div>
  )
}
