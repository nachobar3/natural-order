'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CardSearch } from '@/components/cards/card-search'
import { AddCardModal } from '@/components/cards/add-card-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Package, Loader2, Trash2, Edit2, Plus, LayoutGrid, List, Upload } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { CollectionWithCard, CardCondition } from '@/types/database'

type ViewMode = 'list' | 'binder'

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

export default function CollectionPage() {
  const [collection, setCollection] = useState<CollectionWithCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CollectionWithCard | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('binder')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<CollectionWithCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  const loadCollection = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('collections')
      .select('*, cards(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading collection:', error)
      return
    }

    setCollection(data as CollectionWithCard[] || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadCollection()
  }, [loadCollection])

  const handleCardSelect = (card: CardSearchResult) => {
    setSelectedCard(card)
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEditItem = (item: CollectionWithCard) => {
    setEditingItem(item)
    setSelectedCard(null)
    setIsModalOpen(true)
  }

  const handleDeleteItem = (item: CollectionWithCard) => {
    setItemToDelete(item)
    setDeleteModalOpen(true)
  }

  // Trigger match recalculation in background
  const triggerMatchRecalculation = async () => {
    try {
      await fetch('/api/matches/compute', { method: 'POST' })
    } catch (err) {
      console.error('Error recalculating matches:', err)
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    setDeleting(true)
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', itemToDelete.id)

    if (error) {
      console.error('Error deleting item:', error)
      setDeleting(false)
      return
    }

    setCollection((prev) => prev.filter((item) => item.id !== itemToDelete.id))
    setDeleting(false)
    setDeleteModalOpen(false)
    setItemToDelete(null)

    // Recalculate matches after deletion
    triggerMatchRecalculation()
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedCard(null)
    setEditingItem(null)
  }

  const handleSaveSuccess = () => {
    loadCollection()
    handleModalClose()

    // Recalculate matches after save
    triggerMatchRecalculation()
  }

  const calculatePrice = (item: CollectionWithCard) => {
    const basePrice = item.foil
      ? item.cards.prices_usd_foil
      : item.cards.prices_usd

    if (!basePrice) return null

    if (item.price_mode === 'fixed' && item.price_fixed) {
      return item.price_fixed
    }

    return (basePrice * item.price_percentage) / 100
  }

  const totalValue = collection.reduce((sum, item) => {
    const price = calculatePrice(item)
    return sum + (price ? price * item.quantity : 0)
  }, 0)

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
          <h1 className="text-2xl font-bold text-gray-100">Mi Colección</h1>
          <p className="text-gray-400 mt-1">
            {collection.length} carta{collection.length !== 1 ? 's' : ''} • Valor total: ${totalValue.toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Import button */}
          <Link
            href="/dashboard/collection/import"
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Importar CSV</span>
          </Link>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('binder')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'binder'
                  ? 'bg-mtg-green-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Vista binder"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-mtg-green-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Vista lista"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
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
            <p className="text-sm text-gray-400">Buscá una carta para agregarla a tu colección</p>
          </div>
        </div>
        <CardSearch onSelect={handleCardSelect} placeholder="Buscar carta para agregar..." />
      </div>

      {/* Collection display */}
      {collection.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            Tu colección está vacía
          </h3>
          <p className="text-gray-500">
            Usá el buscador de arriba para agregar cartas
          </p>
        </div>
      ) : viewMode === 'binder' ? (
        /* Binder View - Grid of cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 relative z-10">
          {collection.map((item) => {
            const price = calculatePrice(item)
            return (
              <div
                key={item.id}
                className="group relative bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800 hover:border-mtg-green-500/50 transition-all hover:shadow-lg hover:shadow-mtg-green-500/10"
              >
                {/* Card image */}
                <div className="relative aspect-[5/7]">
                  {item.cards.image_uri ? (
                    <Image
                      src={item.cards.image_uri}
                      alt={item.cards.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                      ?
                    </div>
                  )}
                  {/* Quantity badge */}
                  {item.quantity > 1 && (
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                      x{item.quantity}
                    </div>
                  )}
                  {/* Foil indicator */}
                  {item.foil && (
                    <div className="absolute top-2 left-2 bg-purple-500/90 text-white text-xs font-bold px-2 py-1 rounded">
                      Foil
                    </div>
                  )}
                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-2 bg-mtg-green-600 text-white rounded-lg hover:bg-mtg-green-500 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {/* Card details */}
                <div className="p-2">
                  <h3 className="text-sm font-medium text-gray-100 truncate">
                    {item.cards.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">
                    {item.cards.set_code.toUpperCase()} • {conditionLabels[item.condition]}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {price ? (
                      <span className="text-sm font-medium text-mtg-green-400">
                        ${(price * item.quantity).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">-</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="grid gap-4 relative z-10">
          {collection.map((item) => {
            const price = calculatePrice(item)
            return (
              <div
                key={item.id}
                className="card flex items-center gap-4 hover:border-mtg-green-500/30 transition-colors"
              >
                {/* Card image */}
                {item.cards.image_uri_small ? (
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
                    {item.cards.name}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">
                    {item.cards.set_name} ({item.cards.set_code.toUpperCase()})
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                      x{item.quantity}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-300">
                      {conditionLabels[item.condition]}
                    </span>
                    {item.foil && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 rounded text-purple-300">
                        Foil
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  {price ? (
                    <>
                      <p className="font-medium text-mtg-green-400">
                        ${(price * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${price.toFixed(2)} c/u
                      </p>
                      {item.price_mode === 'percentage' && (
                        <p className="text-xs text-gray-500">
                          {item.price_percentage}% CK
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Sin precio</p>
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
                    onClick={() => handleDeleteItem(item)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddCardModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSaveSuccess}
        card={selectedCard}
        editItem={editingItem}
        mode="collection"
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setItemToDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar carta"
        message={`¿Estás seguro de eliminar "${itemToDelete?.cards?.name || 'esta carta'}" de tu colección?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
