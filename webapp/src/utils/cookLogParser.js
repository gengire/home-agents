/**
 * Parse cook-log.md markdown table into an array of entry objects.
 * Format:
 *   | Date | Recipe Name | Category | Notes |
 *   |------|-------------|----------|-------|
 *   | 2026-05-04 | Red Lentil Dal | IND-L | ... |
 */
export function parseCookLog(markdown) {
  const lines = markdown.split('\n')
  const entries = []

  for (const line of lines) {
    if (!line.startsWith('|')) continue
    // Skip header and separator rows
    if (line.includes('Date') && line.includes('Recipe')) continue
    if (/^\|[-| ]+\|$/.test(line.trim())) continue

    const cols = line
      .split('|')
      .map(c => c.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1) // drop first/last empty

    if (cols.length < 3) continue
    const [date, recipeName, category, notes = ''] = cols
    if (!date || date === '—') continue

    entries.push({ date, recipeName, category, notes })
  }

  return entries
}

/**
 * Append a new entry row to the cook-log markdown string.
 * Returns the updated markdown.
 */
export function appendCookLogEntry(markdown, { date, recipeName, category, notes = '' }) {
  const newRow = `| ${date} | ${recipeName} | ${category} | ${notes} |`
  // Find the last table row and insert after it
  const lines = markdown.split('\n')
  // Find the last line that starts with | and is a data row
  let lastTableLine = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('|') && !/^\|[-| ]+\|$/.test(lines[i].trim())) {
      // Skip the placeholder row
      if (lines[i].includes('Add first entry')) {
        lastTableLine = i
        break
      }
      lastTableLine = i
      break
    }
  }

  if (lastTableLine === -1) {
    return markdown + '\n' + newRow
  }

  // Replace placeholder row OR insert after last real row
  if (lines[lastTableLine].includes('Add first entry') || lines[lastTableLine].includes('— | —')) {
    lines[lastTableLine] = newRow
  } else {
    lines.splice(lastTableLine + 1, 0, newRow)
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
export function updateCookLogEntry(markdown, rowIndex, { date, recipeName, category, notes = '' }) {
  const lines = markdown.split('\n')
  let dataRowCount = 0
  for (let i = 0; i < lines.length; i++) {
    if (!isDataRow(lines[i])) continue
    if (dataRowCount === rowIndex) {
      lines[i] = `| ${date} | ${recipeName} | ${category} | ${notes} |`
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
  let dataRowCount = 0
  for (let i = 0; i < lines.length; i++) {
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
