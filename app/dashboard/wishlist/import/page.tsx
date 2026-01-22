'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, AlertCircle, CheckCircle2, XCircle, Loader2, ArrowLeft, HelpCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { parseCSV, FORMAT_LABELS, type ParsedCard, type CsvFormat } from '@/lib/csv-parser'

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete'
type ConflictMode = 'skip' | 'update' | 'add'

interface MatchedCard extends ParsedCard {
  matchStatus: 'pending' | 'matched' | 'not_found' | 'error'
  matchError?: string
}

export default function ImportWishlistPage() {
  const router = useRouter()
  const [step, setStep] = useState<ImportStep>('upload')
  const [format, setFormat] = useState<CsvFormat>('unknown')
  const [cards, setCards] = useState<MatchedCard[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [conflictMode, setConflictMode] = useState<ConflictMode>('add')
  const [isMatching, setIsMatching] = useState(false)
  const [matchProgress, setMatchProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    total: number
    inserted: number
    updated: number
    skipped: number
    errors: number
  } | null>(null)

  const handleFileUpload = useCallback(async (file: File) => {
    const text = await file.text()
    const result = parseCSV(text)

    setFormat(result.format)
    setParseErrors(result.errors)

    if (result.cards.length > 0) {
      // Initialize cards with pending match status
      const matchedCards: MatchedCard[] = result.cards.map(card => ({
        ...card,
        matchStatus: 'pending',
      }))
      setCards(matchedCards)
      setStep('preview')

      // Start matching cards with Scryfall
      await matchCardsWithScryfall(matchedCards)
    }
  }, [])

  const matchCardsWithScryfall = async (cardsToMatch: MatchedCard[]) => {
    setIsMatching(true)
    setMatchProgress(0)

    // Process in batches of 200 (API now supports up to 500 with Scryfall collection endpoint)
    const batchSize = 200
    const updatedCards = [...cardsToMatch]

    for (let i = 0; i < cardsToMatch.length; i += batchSize) {
      const batch = cardsToMatch.slice(i, i + batchSize)
      const batchIndices = batch.map((_, idx) => i + idx)

      try {
        const response = await fetch('/api/cards/bulk-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards: batch.map(c => ({
              name: c.name,
              setCode: c.setCode,
              collectorNumber: c.collectorNumber,
            })),
          }),
        })

        if (response.ok) {
          const { results } = await response.json()

          results.forEach((result: { index: number; match: ParsedCard['scryfallMatch']; error: string | null }) => {
            const cardIndex = batchIndices[result.index]
            if (result.match) {
              updatedCards[cardIndex] = {
                ...updatedCards[cardIndex],
                matchStatus: 'matched',
                scryfallMatch: result.match,
                matchError: result.error || undefined,
              }
            } else {
              updatedCards[cardIndex] = {
                ...updatedCards[cardIndex],
                matchStatus: 'not_found',
                matchError: result.error || 'No encontrada',
              }
            }
          })
        }
      } catch (error) {
        console.error('Match error:', error)
        batchIndices.forEach(idx => {
          updatedCards[idx] = {
            ...updatedCards[idx],
            matchStatus: 'error',
            matchError: 'Error de red',
          }
        })
      }

      setMatchProgress(Math.min(i + batchSize, cardsToMatch.length))
      setCards([...updatedCards])
    }

    setIsMatching(false)
  }

  const handleImport = async () => {
    const validCards = cards.filter(c => c.matchStatus === 'matched' && c.scryfallMatch)

    if (validCards.length === 0) {
      return
    }

    setStep('importing')
    setIsImporting(true)
    setImportProgress(0)

    // Process in batches of 200 (API now supports batch DB operations)
    const batchSize = 200
    let processed = 0
    const allResults: { inserted: number; updated: number; skipped: number; errors: number } = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    }

    for (let i = 0; i < validCards.length; i += batchSize) {
      const batch = validCards.slice(i, i + batchSize)

      try {
        const response = await fetch('/api/cards/bulk-import-wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cards: batch.map(c => ({
              card: c.scryfallMatch,
              quantity: c.quantity,
              minCondition: c.condition || 'LP', // Default to LP for wishlist
              foilPreference: c.foil ? 'foil_only' : 'any',
              notes: c.notes,
            })),
            conflictMode,
          }),
        })

        if (response.ok) {
          const { summary } = await response.json()
          allResults.inserted += summary.inserted
          allResults.updated += summary.updated
          allResults.skipped += summary.skipped
          allResults.errors += summary.errors
        }
      } catch (error) {
        console.error('Import error:', error)
        allResults.errors += batch.length
      }

      processed += batch.length
      setImportProgress(processed)
    }

    setImportResults({
      total: validCards.length,
      ...allResults,
    })
    setIsImporting(false)
    setStep('complete')
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const validCount = cards.filter(c => c.matchStatus === 'matched').length
  const errorCount = cards.filter(c => c.matchStatus === 'not_found' || c.matchStatus === 'error').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/wishlist"
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Importar Wishlist</h1>
          <p className="text-gray-400 mt-1">
            Subí un archivo CSV de Moxfield, ManaBox o Deckbox
          </p>
        </div>
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Drop zone - Desktop */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="hidden sm:block card border-2 border-dashed border-gray-700 hover:border-mtg-green-500/50 transition-colors cursor-pointer"
          >
            <label className="flex flex-col items-center justify-center py-12 cursor-pointer">
              <Upload className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-lg text-gray-300 mb-2">
                Arrastrá tu archivo CSV acá
              </p>
              <p className="text-sm text-gray-500 mb-4">
                o hacé click para seleccionar
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="btn-secondary">Seleccionar archivo</span>
            </label>
          </div>

          {/* Upload button - Mobile */}
          <div className="sm:hidden card">
            <label className="flex flex-col items-center justify-center py-8 cursor-pointer">
              <Upload className="w-10 h-10 text-mtg-green-400 mb-3" />
              <p className="text-gray-300 mb-4 text-center">
                Seleccioná tu archivo CSV
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="btn-primary">Seleccionar archivo</span>
            </label>
          </div>

          {/* Format help */}
          <div className="card">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-mtg-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-gray-200 mb-2">Formatos soportados</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li><strong>Moxfield:</strong> Exportá tu wishlist desde Moxfield → Export → CSV</li>
                  <li><strong>ManaBox:</strong> Exportá desde ManaBox → Settings → Export → CSV</li>
                  <li><strong>Deckbox:</strong> Exportá desde Deckbox → Tools → Export</li>
                  <li><strong>CubeCobra:</strong> Exportá tu cube desde List → Export → CSV</li>
                  <li><strong>Genérico:</strong> Cualquier CSV con columnas: Name, Quantity/Count, Set/Edition</li>
                </ul>
                <p className="text-sm text-gray-500 mt-3">
                  Las cartas se importarán con condición mínima LP y preferencia de foil según el archivo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Parse errors */}
          {parseErrors.length > 0 && (
            <div className="card bg-red-500/10 border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-400">Errores de parseo</h3>
                  <ul className="text-sm text-red-300 mt-1">
                    {parseErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400">
                  Formato detectado: <span className="text-mtg-green-400 font-medium">{FORMAT_LABELS[format]}</span>
                </p>
                <p className="text-lg font-medium text-gray-100 mt-1">
                  {cards.length} cartas encontradas
                </p>
                {!isMatching && (
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-green-400">✓ {validCount} válidas</span>
                    {errorCount > 0 && (
                      <span className="text-red-400">✗ {errorCount} con errores</span>
                    )}
                  </div>
                )}
              </div>

              {isMatching ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-mtg-green-400" />
                  <span className="text-gray-300">
                    Buscando cartas... {matchProgress}/{cards.length}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="label text-xs">Si ya existe:</label>
                    <select
                      value={conflictMode}
                      onChange={(e) => setConflictMode(e.target.value as ConflictMode)}
                      className="input text-sm py-1"
                    >
                      <option value="add">Sumar cantidad</option>
                      <option value="update">Reemplazar cantidad</option>
                      <option value="skip">Omitir</option>
                    </select>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={validCount === 0}
                    className="btn-primary disabled:opacity-50"
                  >
                    Importar {validCount} cartas
                  </button>
                </div>
              )}
            </div>

            {/* Progress bar for matching */}
            {isMatching && (
              <div className="mt-4">
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-mtg-green-500 transition-all duration-300"
                    style={{ width: `${(matchProgress / cards.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card list preview */}
          <div className="card max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-400 border-b border-gray-800 sticky top-0 bg-mtg-dark">
                <tr>
                  <th className="py-2 px-2">Estado</th>
                  <th className="py-2 px-2">Carta</th>
                  <th className="py-2 px-2">Set</th>
                  <th className="py-2 px-2">Cant.</th>
                  <th className="py-2 px-2">Foil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {cards.map((card, i) => (
                  <tr key={i} className={card.matchStatus === 'not_found' || card.matchStatus === 'error' ? 'bg-red-500/5' : ''}>
                    <td className="py-2 px-2">
                      {card.matchStatus === 'pending' && (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                      )}
                      {card.matchStatus === 'matched' && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                      {(card.matchStatus === 'not_found' || card.matchStatus === 'error') && (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {card.scryfallMatch?.image_uri_small && (
                          <Image
                            src={card.scryfallMatch.image_uri_small}
                            alt={card.name}
                            width={24}
                            height={34}
                            className="rounded"
                          />
                        )}
                        <div>
                          <p className="text-gray-200">{card.name}</p>
                          {card.matchError && (
                            <p className="text-xs text-yellow-400">{card.matchError}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-400">
                      {card.scryfallMatch?.set_code?.toUpperCase() || card.setCode?.toUpperCase() || '-'}
                    </td>
                    <td className="py-2 px-2 text-gray-300">{card.quantity}</td>
                    <td className="py-2 px-2">
                      {card.foil && <span className="text-purple-400">✨</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <button
              onClick={() => {
                setStep('upload')
                setCards([])
                setParseErrors([])
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === 'importing' && (
        <div className="card text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-mtg-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-100 mb-2">
            Importando cartas...
          </h2>
          <p className="text-gray-400 mb-4">
            {importProgress} de {validCount} procesadas
          </p>
          <div className="max-w-md mx-auto">
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-mtg-green-500 transition-all duration-300"
                style={{ width: `${(importProgress / validCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && importResults && (
        <div className="card text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-100 mb-4">
            Importación completada
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto mb-8">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-100">{importResults.total}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-400">{importResults.inserted}</p>
              <p className="text-sm text-gray-400">Nuevas</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg">
              <p className="text-2xl font-bold text-blue-400">{importResults.updated}</p>
              <p className="text-sm text-gray-400">Actualizadas</p>
            </div>
            {importResults.errors > 0 && (
              <div className="p-4 bg-red-500/10 rounded-lg">
                <p className="text-2xl font-bold text-red-400">{importResults.errors}</p>
                <p className="text-sm text-gray-400">Errores</p>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setStep('upload')
                setCards([])
                setImportResults(null)
              }}
              className="btn-secondary"
            >
              Importar más
            </button>
            <button
              onClick={() => router.push('/dashboard/wishlist')}
              className="btn-primary"
            >
              Ver wishlist
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
