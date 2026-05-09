/**
 * Find the line range of the Log table (the one with Date/Recipe/Category/Notes headers).
 * Returns { headerIdx, end } where lines[headerIdx..end-1] is the full table.
 * end is the first line index after the table (non-| line).
 */
function findLogTableRange(lines) {
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('|') && lines[i].includes('Date') && lines[i].includes('Recipe')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return { headerIdx: -1, end: -1 }
  let end = headerIdx + 1
  while (end < lines.length && lines[end].startsWith('|')) end++
  return { headerIdx, end }
}

/**
 * Parse cook-log.md markdown table into an array of entry objects.
 * Format:
 *   | Date | Recipe Name | Category | Notes |
 *   |------|-------------|----------|-------|
 *   | 2026-05-04 | Red Lentil Dal | IND-L | ... |
 */
export function parseCookLog(markdown) {
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)
  if (headerIdx === -1) return []
  const entries = []

  for (let i = headerIdx; i < end; i++) {
    const line = lines[i]
    // Skip header and separator rows
    if (line.includes('Date') && line.includes('Recipe')) continue
    if (/^\|[-| ]+\|$/.test(line.trim())) continue

    const cols = line
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)

    if (cols.length < 3) continue
    const [date, recipeName, category, notes = ''] = cols
    if (!date || date === '—') continue
    const rating = cols.length > 4 && cols[4] ? (parseInt(cols[4], 10) || null) : null
    const feedback = cols.length > 5 ? (cols[5] || '') : ''
    const prepTime = cols.length > 6 && cols[6] ? (parseInt(cols[6], 10) || null) : null
    const deviations = cols.length > 7 ? (cols[7] || '') : ''

    entries.push({ date, recipeName, category, notes, rating, feedback, prepTime, deviations })
  }

  return entries
}

/**
 * Append a new entry row to the Log table only.
 * Returns the updated markdown.
 */
export function appendCookLogEntry(markdown, { date, recipeName, category, notes = '', prepTime = '' }) {
  const newRow = `| ${date} | ${recipeName} | ${category} | ${notes} | | | ${prepTime} | |`
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)

  if (headerIdx === -1) {
    return markdown + '\n' + newRow
  }

  // Find the last data row within the Log table range (search backwards from end)
  let lastDataLine = -1
  for (let i = end - 1; i > headerIdx; i--) {
    if (isDataRow(lines[i])) { lastDataLine = i; break }
  }

  if (lastDataLine === -1) {
    // No data rows yet — insert after the separator line (headerIdx + 1)
    const sepIdx = headerIdx + 1
    lines.splice(sepIdx + 1, 0, newRow)
  } else if (lines[lastDataLine].includes('Add first entry') || lines[lastDataLine].includes('— | —')) {
    lines[lastDataLine] = newRow
  } else {
    lines.splice(lastDataLine + 1, 0, newRow)
  }

  return lines.join('\n')
}

/** Helper: identify data rows (skip header, separator, placeholder) */
function isDataRow(line) {
  if (!line.startsWith('|')) return false
  if (line.includes('Date') && line.includes('Recipe')) return false
  if (/^\|[-| ]+\|$/.test(line.trim())) return false
  if (line.includes('Add first entry') || line.includes('— | —')) return false
  return true
}

/**
 * Replace the nth data row (0-indexed) in the cook-log table.
 * Returns the updated markdown.
 */
export function updateCookLogEntry(markdown, rowIndex, { date, recipeName, category, notes = '', rating = '', feedback = '', prepTime = '', deviations = '' }) {
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)
  let dataRowCount = 0
  for (let i = headerIdx; i < end; i++) {
    if (!isDataRow(lines[i])) continue
    if (dataRowCount === rowIndex) {
      lines[i] = `| ${date} | ${recipeName} | ${category} | ${notes} | ${rating ?? ''} | ${feedback} | ${prepTime ?? ''} | ${deviations} |`
      return lines.join('\n')
    }
    dataRowCount++
  }
  return markdown
}

/**
 * Update only the Rating and Feedback columns for the nth data row (0-indexed).
 * Preserves Date, Recipe Name, Category, and Notes.
 * Returns the updated markdown.
 */
export function updateCookLogRating(markdown, rowIndex, { rating, feedback }) {
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)
  let dataRowCount = 0
  for (let i = headerIdx; i < end; i++) {
    if (!isDataRow(lines[i])) continue
    if (dataRowCount === rowIndex) {
      const parts = lines[i].split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      const [date = '', recipeName = '', category = '', notes = '', , , prepTime = '', deviations = ''] = parts
      lines[i] = `| ${date} | ${recipeName} | ${category} | ${notes} | ${rating ?? ''} | ${feedback} | ${prepTime} | ${deviations} |`
      return lines.join('\n')
    }
    dataRowCount++
  }
  return markdown
}

/**
 * Delete the nth data row (0-indexed) from the cook-log table.
 * Returns the updated markdown.
 */
export function deleteCookLogEntry(markdown, rowIndex) {
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)
  let dataRowCount = 0
  for (let i = headerIdx; i < end; i++) {
    if (!isDataRow(lines[i])) continue
    if (dataRowCount === rowIndex) {
      lines.splice(i, 1)
      return lines.join('\n')
    }
    dataRowCount++
  }
  return markdown
}

export const CATEGORIES = [
  { code: 'IND-L', label: 'Indian — Legume/Dal', color: 'orange' },
  { code: 'IND-P', label: 'Indian — Protein', color: 'orange' },
  { code: 'IND-V', label: 'Indian — Vegetable', color: 'orange' },
  { code: 'MED', label: 'Mediterranean', color: 'blue' },
  { code: 'MED-G', label: 'Greek/Middle Eastern', color: 'indigo' },
  { code: 'MEX', label: 'Mexican', color: 'green' },
  { code: 'ASIA', label: 'Asian', color: 'purple' },
  { code: 'SOUP', label: 'Soup/Stew', color: 'teal' },
  { code: 'FISH', label: 'Fish/Seafood', color: 'cyan' },
  { code: 'AMER', label: 'American', color: 'brown' },
  { code: 'AMER-S', label: 'American Southern', color: 'yellow' },
  { code: 'ITA', label: 'Italian', color: 'red' },
  { code: 'CARIB', label: 'Caribbean', color: 'lime' },
  { code: 'ETH', label: 'Ethiopian', color: 'rose' },
  { code: 'FUSE', label: 'Fusion', color: 'violet' },
  { code: 'DESS', label: 'Dessert', color: 'pink' },
]

export const CATEGORY_STYLES = {
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-emerald-100 text-emerald-700',
  purple: 'bg-purple-100 text-purple-700',
  teal: 'bg-teal-100 text-teal-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  brown: 'bg-amber-100 text-amber-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red: 'bg-red-100 text-red-700',
  lime: 'bg-lime-100 text-lime-700',
  rose: 'bg-rose-100 text-rose-700',
  violet: 'bg-violet-100 text-violet-700',
  pink: 'bg-pink-100 text-pink-700',
}

export function getCategoryStyle(code) {
  const cat = CATEGORIES.find(c => c.code === code)
  return cat ? CATEGORY_STYLES[cat.color] : 'bg-gray-100 text-gray-600'
}

/** Returns Set of category codes used within the last N days */
export function getRecentCategories(entries, days = 8) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = new Set()
  for (const entry of entries) {
    const d = new Date(entry.date)
    if (d >= cutoff) recent.add(entry.category)
  }
  return recent
}

/**
 * Serialize deviation arrays into a single cook-log cell string.
 * prefs: [{what, why}]  subs: [{used, original}]
 */
export function serializeDeviations({ prefs = [], subs = [] }) {
  const parts = [
    ...prefs.filter(p => p.what.trim()).map(p => `PREF: ${p.what.trim()}${p.why.trim() ? ' — ' + p.why.trim() : ''}`),
    ...subs.filter(s => s.used.trim() && s.original.trim()).map(s => `SUB: ${s.used.trim()} for ${s.original.trim()}`),
  ]
  return parts.join('; ')
}

/**
 * Parse a deviation cell string back into { prefs, subs }.
 */
export function parseDeviations(str = '') {
  const prefs = []
  const subs = []
  if (!str.trim()) return { prefs, subs }
  for (const segment of str.split(';').map(s => s.trim()).filter(Boolean)) {
    if (segment.startsWith('PREF: ')) {
      const body = segment.slice(6)
      const sep = body.indexOf(' — ')
      if (sep !== -1) prefs.push({ what: body.slice(0, sep).trim(), why: body.slice(sep + 3).trim() })
      else prefs.push({ what: body.trim(), why: '' })
    } else if (segment.startsWith('SUB: ')) {
      const body = segment.slice(5)
      const forIdx = body.indexOf(' for ')
      if (forIdx !== -1) subs.push({ used: body.slice(0, forIdx).trim(), original: body.slice(forIdx + 5).trim() })
      else subs.push({ used: body.trim(), original: '' })
    }
  }
  return { prefs, subs }
}
