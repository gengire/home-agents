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

    entries.push({ date, recipeName, category, notes, rating, feedback, prepTime })
  }

  return entries
}

/**
 * Append a new entry row to the Log table only.
 * Returns the updated markdown.
 */
export function appendCookLogEntry(markdown, { date, recipeName, category, notes = '', prepTime = '' }) {
  const newRow = `| ${date} | ${recipeName} | ${category} | ${notes} | | | ${prepTime} |`
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
export function updateCookLogEntry(markdown, rowIndex, { date, recipeName, category, notes = '', rating = '', feedback = '', prepTime = '' }) {
  const lines = markdown.split('\n')
  const { headerIdx, end } = findLogTableRange(lines)
  let dataRowCount = 0
  for (let i = headerIdx; i < end; i++) {
    if (!isDataRow(lines[i])) continue
    if (dataRowCount === rowIndex) {
      lines[i] = `| ${date} | ${recipeName} | ${category} | ${notes} | ${rating ?? ''} | ${feedback} | ${prepTime ?? ''} |`
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
      const [date = '', recipeName = '', category = '', notes = '', , , prepTime = ''] = parts
      lines[i] = `| ${date} | ${recipeName} | ${category} | ${notes} | ${rating ?? ''} | ${feedback} | ${prepTime} |`
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
  { code: 'MEX', label: 'Mexican', color: 'green' },
  { code: 'ASIA', label: 'Asian', color: 'purple' },
  { code: 'SOUP', label: 'Soup/Stew', color: 'teal' },
  { code: 'FISH', label: 'Fish/Seafood', color: 'cyan' },
  { code: 'AMER', label: 'American', color: 'brown' },
  { code: 'DESS', label: 'Dessert', color: 'pink' },
]

export const CATEGORY_STYLES = {
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  purple: 'bg-purple-100 text-purple-700',
  teal: 'bg-teal-100 text-teal-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  brown: 'bg-amber-100 text-amber-800',
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
