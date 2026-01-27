'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, ChevronDown, Edit2 } from 'lucide-react'
import Image from 'next/image'
import { EditionSelectorModal } from './edition-selector-modal'
import type { CollectionWithCard, WishlistWithCard, CardCondition } from '@/types/database'

interface CardData {
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

interface AddCardModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  card: CardData | null
  editItem?: CollectionWithCard | WishlistWithCard | null
  mode: 'collection' | 'wishlist'
}

const conditions: { value: CardCondition; label: string }[] = [
  { value: 'NM', label: 'Near Mint (NM)' },
  { value: 'LP', label: 'Lightly Played (LP)' },
  { value: 'MP', label: 'Moderately Played (MP)' },
  { value: 'HP', label: 'Heavily Played (HP)' },
  { value: 'DMG', label: 'Damaged (DMG)' },
]

export function AddCardModal({
  isOpen,
  onClose,
  onSuccess,
  card,
  editItem,
  mode,
}: AddCardModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edition selector state
  const [printings, setPrintings] = useState<CardData[]>([])
  const [loadingPrintings, setLoadingPrintings] = useState(false)
  const [selectedPrinting, setSelectedPrinting] = useState<CardData | null>(null)

  // Collection fields
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<CardCondition>('NM')
  const [foil, setFoil] = useState(false)
  const [priceMode, setPriceMode] = useState<'percentage' | 'fixed'>('percentage')
  const [pricePercentage, setPricePercentage] = useState(80)
  const [priceFixed, setPriceFixed] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState(80)
  // priceOverride is set when user explicitly changes the percentage from global default
  const [, setPriceOverride] = useState(false)

  // Wishlist fields
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minCondition, setMinCondition] = useState<CardCondition>('LP')
  const [foilPreference, setFoilPreference] = useState<'any' | 'foil_only' | 'non_foil'>('any')
  const [priority, setPriority] = useState(5)
  const [editionPreference, setEditionPreference] = useState<'any' | 'specific'>('any')
  const [specificEditions, setSpecificEditions] = useState<string[]>([])
  const [isEditionSelectorOpen, setIsEditionSelectorOpen] = useState(false)

  const supabase = createClient()

  // Load global discount when modal opens (for new cards)
  useEffect(() => {
    if (!isOpen || editItem) return

    const loadGlobalDiscount = async () => {
      try {
        const res = await fetch('/api/preferences/global-discount')
        if (res.ok) {
          const data = await res.json()
          setGlobalDiscount(data.percentage)
          setPricePercentage(data.percentage)
        }
      } catch (err) {
        console.error('Failed to load global discount:', err)
      }
    }

    loadGlobalDiscount()
  }, [isOpen, editItem])

  // Fetch printings when editing
  useEffect(() => {
    if (!isOpen) return

    const fetchPrintings = async () => {
      const sourceCard = card || (editItem && 'cards' in editItem ? editItem.cards : null)
      if (!sourceCard?.oracle_id) return

      setLoadingPrintings(true)
      try {
        const res = await fetch(`/api/cards/printings?oracle_id=${sourceCard.oracle_id}`)
        if (res.ok) {
          const data = await res.json()
          setPrintings(data.printings || [])

          // Set selected printing to current card
          const current = data.printings?.find(
            (p: CardData) => p.scryfall_id === sourceCard.scryfall_id
          )
          setSelectedPrinting(current || sourceCard)
        }
      } catch (err) {
        console.error('Failed to fetch printings:', err)
      } finally {
        setLoadingPrintings(false)
      }
    }

    fetchPrintings()
  }, [isOpen, card, editItem])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editItem && 'condition' in editItem) {
        // Editing collection item
        const item = editItem as CollectionWithCard
        setQuantity(item.quantity)
        setCondition(item.condition)
        setFoil(item.foil)
        setPriceMode(item.price_mode)
        setPricePercentage(item.price_percentage)
        setPriceFixed(item.price_fixed?.toString() || '')
        setNotes(item.notes || '')
      } else if (editItem && 'min_condition' in editItem) {
        // Editing wishlist item
        const item = editItem as WishlistWithCard
        setQuantity(item.quantity)
        setMaxPrice(item.max_price?.toString() || '')
        setMinCondition(item.min_condition)
        setFoilPreference(item.foil_preference)
        setPriority(item.priority)
        setEditionPreference(item.edition_preference || 'any')
        setSpecificEditions(item.specific_editions || [])
      } else {
        // New item - reset to defaults (use global discount)
        setQuantity(1)
        setCondition('NM')
        setFoil(false)
        setPriceMode('percentage')
        setPricePercentage(globalDiscount)
        setPriceFixed('')
        setNotes('')
        setPriceOverride(false)
        setMaxPrice('')
        setMinCondition('LP')
        setFoilPreference('any')
        setPriority(5)
        setEditionPreference('any')
        setSpecificEditions([])
      }
      setError(null)
    } else {
      // Reset printings when modal closes
      setPrintings([])
      setSelectedPrinting(null)
    }
  }, [isOpen, editItem, globalDiscount])

  const handlePrintingChange = (scryfallId: string) => {
    const printing = printings.find((p) => p.scryfall_id === scryfallId)
    if (printing) {
      setSelectedPrinting(printing)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Determine which card to use
      const cardToSave = selectedPrinting || card || (editItem && 'cards' in editItem ? editItem.cards : null)

      if (!cardToSave) {
        throw new Error('No hay carta seleccionada')
      }

      // First, upsert the card to our database
      const upsertRes = await fetch('/api/cards/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardToSave),
      })

      if (!upsertRes.ok) {
        throw new Error('Error al guardar la carta')
      }

      const { card: savedCard } = await upsertRes.json()
      const cardId = savedCard.id

      if (mode === 'collection') {
        // Mark as override if user changed the price from global or uses fixed price
        const hasOverride = editItem
          ? (editItem as CollectionWithCard).price_override || false
          : priceMode === 'fixed' || pricePercentage !== globalDiscount

        const collectionData = {
          user_id: user.id,
          card_id: cardId,
          quantity,
          condition,
          foil,
          price_mode: priceMode,
          price_percentage: pricePercentage,
          price_fixed: priceMode === 'fixed' && priceFixed ? parseFloat(priceFixed) : null,
          notes: notes || null,
          price_override: hasOverride,
        }

        if (editItem) {
          // Update existing
          const { error: updateError } = await supabase
            .from('collections')
            .update(collectionData)
            .eq('id', editItem.id)

          if (updateError) throw updateError
        } else {
          // Insert new
          const { error: insertError } = await supabase
            .from('collections')
            .insert(collectionData)

          if (insertError) {
            if (insertError.code === '23505') {
              throw new Error('Ya tenés esta carta con la misma condición y foil en tu colección')
            }
            throw insertError
          }
        }
      } else {
        // Wishlist
        const wishlistData = {
          user_id: user.id,
          card_id: cardId,
          oracle_id: cardToSave.oracle_id,
          quantity,
          max_price: maxPrice ? parseFloat(maxPrice) : null,
          min_condition: minCondition,
          foil_preference: foilPreference,
          priority,
          edition_preference: editionPreference,
          specific_editions: editionPreference === 'specific' ? specificEditions : [],
        }

        if (editItem) {
          const { error: updateError } = await supabase
            .from('wishlist')
            .update(wishlistData)
            .eq('id', editItem.id)

          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase
            .from('wishlist')
            .insert(wishlistData)

          if (insertError) {
            if (insertError.code === '23505') {
              throw new Error('Ya tenés esta carta en tu wishlist')
            }
            throw insertError
          }
        }
      }

      onSuccess()
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const displayCard = selectedPrinting || card || (editItem && 'cards' in editItem ? editItem.cards : null)
  const currentPrice = foil ? displayCard?.prices_usd_foil : displayCard?.prices_usd

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-20 md:pb-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal - wider layout */}
      <div className="relative bg-mtg-dark border border-mtg-green-900/20 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-mtg-dark/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-gray-100">
            {editItem ? 'Editar carta' : `Agregar a ${mode === 'collection' ? 'colección' : 'wishlist'}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - two column layout (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row">
          {/* Left side - Card image */}
          {displayCard && (
            <div className="md:w-1/3 p-6 flex flex-col items-center bg-gray-900/30">
              {displayCard.image_uri ? (
                <Image
                  src={displayCard.image_uri}
                  alt={displayCard.name}
                  width={250}
                  height={350}
                  className="rounded-lg shadow-xl"
                  priority
                />
              ) : (
                <div className="w-[250px] h-[350px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
                  Sin imagen
                </div>
              )}
              <div className="mt-4 text-center">
                <h3 className="font-semibold text-gray-100 text-lg">{displayCard.name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {displayCard.set_name}
                </p>
                <p className="text-xs text-gray-500">
                  ({displayCard.set_code.toUpperCase()}) #{displayCard.collector_number}
                </p>
                {currentPrice && (
                  <p className="text-mtg-green-400 font-medium mt-2">
                    ${currentPrice.toFixed(2)} USD
                  </p>
                )}
                {displayCard.rarity && (
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded capitalize ${
                    displayCard.rarity === 'mythic' ? 'bg-orange-500/20 text-orange-400' :
                    displayCard.rarity === 'rare' ? 'bg-yellow-500/20 text-yellow-400' :
                    displayCard.rarity === 'uncommon' ? 'bg-gray-500/20 text-gray-300' :
                    'bg-gray-700/50 text-gray-400'
                  }`}>
                    {displayCard.rarity}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Right side - Form */}
          <div className="md:w-2/3 p-6">
            <form id="add-card-form" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Edition selector - different for collection vs wishlist */}
              {printings.length > 1 && mode === 'collection' && (
                <div>
                  <label className="label">Edición</label>
                  <div className="relative">
                    <select
                      value={selectedPrinting?.scryfall_id || ''}
                      onChange={(e) => handlePrintingChange(e.target.value)}
                      className="input pr-10 appearance-none cursor-pointer"
                      disabled={loadingPrintings}
                    >
                      {printings.map((printing) => (
                        <option key={printing.scryfall_id} value={printing.scryfall_id}>
                          {printing.set_name} ({printing.set_code.toUpperCase()}) #{printing.collector_number}
                          {printing.prices_usd ? ` - $${printing.prices_usd.toFixed(2)}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                  </div>
                  {loadingPrintings && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cargando ediciones...
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {printings.length} ediciones disponibles
                  </p>
                </div>
              )}

              {/* Edition preference for wishlist */}
              {mode === 'wishlist' && (
                <div>
                  <label className="label">Ediciones aceptadas</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-mtg-green-500/50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="editionPref"
                        checked={editionPreference === 'any'}
                        onChange={() => {
                          setEditionPreference('any')
                          setSpecificEditions([])
                        }}
                        className="w-4 h-4 border-gray-600 bg-gray-800 text-mtg-green-500 focus:ring-mtg-green-500"
                      />
                      <div>
                        <span className="text-sm text-gray-200">Cualquier edición</span>
                        <p className="text-xs text-gray-500">Acepto cualquiera de las {printings.length} ediciones disponibles</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-mtg-green-500/50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="editionPref"
                        checked={editionPreference === 'specific'}
                        onChange={() => setEditionPreference('specific')}
                        className="w-4 h-4 border-gray-600 bg-gray-800 text-mtg-green-500 focus:ring-mtg-green-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-200">Ediciones específicas</span>
                        <p className="text-xs text-gray-500">
                          {specificEditions.length > 0
                            ? `${specificEditions.length} edición${specificEditions.length > 1 ? 'es' : ''} seleccionada${specificEditions.length > 1 ? 's' : ''}`
                            : 'Seleccionar las ediciones que buscás'}
                        </p>
                      </div>
                      {editionPreference === 'specific' && (
                        <button
                          type="button"
                          onClick={() => setIsEditionSelectorOpen(true)}
                          className="p-2 text-mtg-green-400 hover:bg-mtg-green-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </label>

                    {editionPreference === 'specific' && specificEditions.length > 0 && (
                      <div className="pl-7 flex flex-wrap gap-1">
                        {specificEditions.slice(0, 5).map((scryfallId) => {
                          const printing = printings.find(p => p.scryfall_id === scryfallId)
                          return printing ? (
                            <span key={scryfallId} className="text-xs px-2 py-1 bg-mtg-green-900/30 text-mtg-green-300 rounded">
                              {printing.set_code.toUpperCase()}
                            </span>
                          ) : null
                        })}
                        {specificEditions.length > 5 && (
                          <span className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                            +{specificEditions.length - 5} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {loadingPrintings && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cargando ediciones...
                    </p>
                  )}
                </div>
              )}

              {/* Two column grid for compact fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="label">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="input"
                  />
                </div>

                {mode === 'collection' ? (
                  <>
                    {/* Condition */}
                    <div>
                      <label className="label">Condición</label>
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as CardCondition)}
                        className="input"
                      >
                        {conditions.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Wishlist: Min condition */}
                    <div>
                      <label className="label">Condición mínima</label>
                      <select
                        value={minCondition}
                        onChange={(e) => setMinCondition(e.target.value as CardCondition)}
                        className="input"
                      >
                        {conditions.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {mode === 'collection' ? (
                <>
                  {/* Foil checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="foil"
                      checked={foil}
                      onChange={(e) => setFoil(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-mtg-green-500 focus:ring-mtg-green-500"
                    />
                    <label htmlFor="foil" className="text-sm text-gray-300">
                      Foil ✨
                    </label>
                  </div>

                  {/* Price mode */}
                  <div>
                    <label className="label">Precio de venta</label>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="percentage"
                          name="priceMode"
                          checked={priceMode === 'percentage'}
                          onChange={() => setPriceMode('percentage')}
                          className="w-4 h-4 border-gray-600 bg-gray-800 text-mtg-green-500 focus:ring-mtg-green-500"
                        />
                        <label htmlFor="percentage" className="text-sm text-gray-300">
                          Porcentaje de Card Kingdom
                        </label>
                      </div>
                      {priceMode === 'percentage' && (
                        <div className="ml-7 flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={pricePercentage}
                            onChange={(e) => setPricePercentage(parseInt(e.target.value) || 100)}
                            className="input w-20"
                          />
                          <span className="text-gray-400">%</span>
                          {currentPrice && (
                            <span className="text-sm text-mtg-green-400 font-medium">
                              = ${((currentPrice * pricePercentage) / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          id="fixed"
                          name="priceMode"
                          checked={priceMode === 'fixed'}
                          onChange={() => setPriceMode('fixed')}
                          className="w-4 h-4 border-gray-600 bg-gray-800 text-mtg-green-500 focus:ring-mtg-green-500"
                        />
                        <label htmlFor="fixed" className="text-sm text-gray-300">
                          Precio fijo
                        </label>
                      </div>
                      {priceMode === 'fixed' && (
                        <div className="ml-7 flex items-center gap-2">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceFixed}
                            onChange={(e) => setPriceFixed(e.target.value)}
                            className="input w-24"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="label">Notas (opcional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input min-h-[60px] resize-none"
                      placeholder="Ej: Carta firmada, borde blanco, etc."
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Wishlist fields */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Max price */}
                    <div>
                      <label className="label">Precio máximo</label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          className="input"
                          placeholder="Sin límite"
                        />
                      </div>
                    </div>

                    {/* Foil preference */}
                    <div>
                      <label className="label">Foil</label>
                      <select
                        value={foilPreference}
                        onChange={(e) => setFoilPreference(e.target.value as 'any' | 'foil_only' | 'non_foil')}
                        className="input"
                      >
                        <option value="any">Cualquiera</option>
                        <option value="foil_only">Solo foil</option>
                        <option value="non_foil">Solo no-foil</option>
                      </select>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="label">Prioridad: {priority}</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value))}
                      className="w-full h-2 bg-mtg-green-900/30 rounded-lg appearance-none cursor-pointer accent-mtg-green-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Baja</span>
                      <span>Alta</span>
                    </div>
                  </div>
                </>
              )}

            </form>
          </div>
        </div>
        </div>

        {/* Actions - sticky footer for mobile accessibility */}
        <div className="sticky bottom-0 bg-mtg-dark border-t border-mtg-green-900/30 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="add-card-form"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : editItem ? (
              'Guardar cambios'
            ) : (
              'Agregar'
            )}
          </button>
        </div>
      </div>

      {/* Edition selector modal for wishlist */}
      {mode === 'wishlist' && displayCard && (
        <EditionSelectorModal
          isOpen={isEditionSelectorOpen}
          onClose={() => setIsEditionSelectorOpen(false)}
          onSave={(selectedIds) => {
            setSpecificEditions(selectedIds)
            if (selectedIds.length > 0) {
              setEditionPreference('specific')
            }
          }}
          printings={printings}
          selectedIds={specificEditions}
          cardName={displayCard.name}
        />
      )}
    </div>
  )
}
