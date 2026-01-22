// CSV Parser with format detection for Moxfield, ManaBox, and generic formats

export interface ParsedCard {
  name: string
  setCode: string | null
  setName: string | null
  collectorNumber: string | null
  quantity: number
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
  foil: boolean
  language: string | null
  notes: string | null
  // Validation
  isValid: boolean
  errors: string[]
  // For matching after Scryfall lookup
  scryfallMatch?: {
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
  } | null
}

export type CsvFormat = 'moxfield' | 'manabox' | 'deckbox' | 'cubecobra' | 'generic' | 'unknown'

interface FormatSignature {
  format: CsvFormat
  requiredHeaders: string[]
  optionalHeaders?: string[]
}

const FORMAT_SIGNATURES: FormatSignature[] = [
  {
    format: 'moxfield',
    requiredHeaders: ['count', 'name', 'edition'],
    optionalHeaders: ['condition', 'foil', 'language', 'tags'],
  },
  {
    format: 'manabox',
    requiredHeaders: ['name', 'set code', 'quantity'],
    optionalHeaders: ['set name', 'collector number', 'foil', 'condition'],
  },
  {
    format: 'deckbox',
    requiredHeaders: ['count', 'name', 'edition', 'card number'],
    optionalHeaders: ['condition', 'foil', 'language'],
  },
  {
    format: 'cubecobra',
    requiredHeaders: ['name', 'cmc', 'type'],
    optionalHeaders: ['set', 'collector number', 'finish', 'color category', 'status', 'tags', 'notes'],
  },
  {
    format: 'generic',
    requiredHeaders: ['name'],
    optionalHeaders: ['quantity', 'count', 'set', 'edition', 'condition', 'foil'],
  },
]

// Normalize condition strings to our format
function normalizeCondition(condition: string | undefined): 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' {
  if (!condition) return 'NM'

  const c = condition.toLowerCase().trim()

  // Near Mint variations
  if (c.includes('near mint') || c === 'nm' || c === 'mint' || c === 'm' || c === 'near_mint') {
    return 'NM'
  }
  // Lightly Played variations
  if (c.includes('lightly') || c === 'lp' || c === 'excellent' || c === 'ex' || c.includes('light')) {
    return 'LP'
  }
  // Moderately Played variations
  if (c.includes('moderately') || c === 'mp' || c.includes('good') || c === 'gd' || c.includes('moderate')) {
    return 'MP'
  }
  // Heavily Played variations
  if (c.includes('heavily') || c === 'hp' || c.includes('played') || c.includes('heavy')) {
    return 'HP'
  }
  // Damaged variations
  if (c.includes('damaged') || c === 'dmg' || c === 'd' || c.includes('poor')) {
    return 'DMG'
  }

  return 'NM' // Default
}

// Parse foil field
function parseFoil(foil: string | undefined): boolean {
  if (!foil) return false
  const f = foil.toLowerCase().trim()
  return f === 'true' || f === 'yes' || f === '1' || f === 'foil' || f.includes('foil')
}

// Parse quantity
function parseQuantity(qty: string | undefined): number {
  if (!qty) return 1
  const parsed = parseInt(qty.trim(), 10)
  return isNaN(parsed) || parsed < 1 ? 1 : parsed
}

// Parse CSV string to rows
function parseCSVString(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim())
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  // Parse header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

  // Parse data rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}

// Detect CSV format from headers
export function detectFormat(headers: string[]): CsvFormat {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  for (const signature of FORMAT_SIGNATURES) {
    const hasAllRequired = signature.requiredHeaders.every(required =>
      normalizedHeaders.some(h => h.includes(required) || required.includes(h))
    )
    if (hasAllRequired && signature.format !== 'generic') {
      return signature.format
    }
  }

  // Check if it has at least a name column
  if (normalizedHeaders.some(h => h.includes('name') || h.includes('card'))) {
    return 'generic'
  }

  return 'unknown'
}

// Parse cards based on detected format
function parseRow(row: Record<string, string>, format: CsvFormat): ParsedCard {
  const errors: string[] = []
  let name = ''
  let setCode: string | null = null
  let setName: string | null = null
  let collectorNumber: string | null = null
  let quantity = 1
  let condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' = 'NM'
  let foil = false
  let language: string | null = null
  let notes: string | null = null

  switch (format) {
    case 'moxfield':
      name = row['name'] || ''
      setCode = row['edition'] || null
      quantity = parseQuantity(row['count'])
      condition = normalizeCondition(row['condition'])
      foil = parseFoil(row['foil'])
      language = row['language'] || null
      notes = row['tags'] || null
      break

    case 'manabox':
      name = row['name'] || ''
      setCode = row['set code'] || null
      setName = row['set name'] || null
      collectorNumber = row['collector number'] || null
      quantity = parseQuantity(row['quantity'])
      condition = normalizeCondition(row['condition'])
      foil = parseFoil(row['foil'])
      break

    case 'deckbox':
      name = row['name'] || ''
      setCode = row['edition'] || null
      collectorNumber = row['card number'] || null
      quantity = parseQuantity(row['count'])
      condition = normalizeCondition(row['condition'])
      foil = parseFoil(row['foil'])
      language = row['language'] || null
      break

    case 'cubecobra':
      // CubeCobra exports cube lists (1 of each card by default)
      name = row['name'] || ''
      setCode = row['set'] || null
      collectorNumber = row['collector number'] || null
      quantity = 1 // Cubes typically have 1 of each
      condition = 'NM' // CubeCobra doesn't track condition
      // CubeCobra uses "Finish" column with values like "Foil" or "Non-Foil"
      foil = (row['finish']?.toLowerCase() || '').includes('foil') && !(row['finish']?.toLowerCase() || '').includes('non-foil')
      notes = row['tags'] || row['notes'] || null
      break

    case 'generic':
    default:
      // Try to find name
      name = row['name'] || row['card'] || row['card name'] || ''
      // Try to find set
      setCode = row['set'] || row['edition'] || row['set code'] || null
      setName = row['set name'] || null
      collectorNumber = row['collector number'] || row['number'] || row['card number'] || null
      // Try to find quantity
      quantity = parseQuantity(row['quantity'] || row['count'] || row['qty'])
      condition = normalizeCondition(row['condition'])
      foil = parseFoil(row['foil'])
      language = row['language'] || null
      notes = row['notes'] || row['tags'] || null
      break
  }

  // Validation
  if (!name) {
    errors.push('Nombre de carta requerido')
  }

  return {
    name: name.trim(),
    setCode: setCode?.trim().toLowerCase() || null,
    setName: setName?.trim() || null,
    collectorNumber: collectorNumber?.trim() || null,
    quantity,
    condition,
    foil,
    language: language?.trim() || null,
    notes: notes?.trim() || null,
    isValid: errors.length === 0,
    errors,
  }
}

// Main parse function
export function parseCSV(csvContent: string): {
  format: CsvFormat
  cards: ParsedCard[]
  errors: string[]
} {
  const globalErrors: string[] = []

  try {
    const { headers, rows } = parseCSVString(csvContent)

    if (headers.length === 0) {
      return { format: 'unknown', cards: [], errors: ['Archivo CSV vacío o sin encabezados'] }
    }

    const format = detectFormat(headers)

    if (format === 'unknown') {
      return { format, cards: [], errors: ['No se pudo detectar el formato del CSV. Asegurate de incluir una columna "Name"'] }
    }

    const cards = rows.map(row => parseRow(row, format))

    return { format, cards, errors: globalErrors }
  } catch (error) {
    return { format: 'unknown', cards: [], errors: [`Error al parsear CSV: ${error}`] }
  }
}

// Format labels for display
export const FORMAT_LABELS: Record<CsvFormat, string> = {
  moxfield: 'Moxfield',
  manabox: 'ManaBox',
  deckbox: 'Deckbox',
  cubecobra: 'CubeCobra',
  generic: 'Genérico',
  unknown: 'Desconocido',
}
