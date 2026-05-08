/**
 * Parse meal-plan.md into structured sections for display.
 *
 * Returns:
 * {
 *   lastGenerated: string,
 *   weekOf: string,
 *   prepStrategy: string,       // raw text of the Prep Strategy section
 *   days: [
 *     { heading: string, isNewCook: boolean, lines: string[] }
 *   ],
 *   desserts: string,           // raw text of Desserts section
 *   shoppingList: string,       // raw text of Shopping List section
 * }
 */
export function parseMealPlan(markdown) {
  const lines = markdown.split('\n')

  let lastGenerated = ''
  let weekOf = ''
  let prepStrategy = []
  let days = []
  let desserts = []
  let shoppingList = []

  let section = null // 'prep' | 'day' | 'desserts' | 'shopping' | null
  let currentDay = null

  for (const line of lines) {
    // Metadata
    const genMatch = line.match(/^\*\*Last generated:\*\*\s*(.+)/)
    if (genMatch) { lastGenerated = genMatch[1].trim(); continue }

    const weekMatch = line.match(/^\*\*For week of:\*\*\s*(.+)/)
    if (weekMatch) { weekOf = weekMatch[1].trim(); continue }

    // Section headings
    if (line.startsWith('## Prep Strategy')) { section = 'prep'; continue }
    if (line.startsWith('## Desserts This Week')) {
      if (currentDay) { days.push(currentDay); currentDay = null }
      section = 'desserts'; continue
    }
    if (line.startsWith('## Shopping List') || line.startsWith('## Shopping Notes')) {
      section = 'shopping'; continue
    }
    // Day heading: ### Sunday, May 3 — 🍳 NEW COOK
    const dayMatch = line.match(/^### (.+?)\s*—\s*(🍳 NEW COOK|♻️ LEFTOVERS|🍳 NEW COOK \(Batch Day\))/)
    if (dayMatch) {
      if (currentDay) days.push(currentDay)
      currentDay = {
        heading: dayMatch[1].trim(),
        isNewCook: dayMatch[2].includes('NEW COOK'),
        isBatch: dayMatch[2].includes('Batch'),
        lines: [],
      }
      section = 'day'
      continue
    }
    // Skip horizontal rules and empty section headings
    if (line.startsWith('---') || line.startsWith('## Categories') || line.startsWith('## Serving') || line.startsWith('## Pantry')) continue

    if (section === 'prep') prepStrategy.push(line)
    else if (section === 'day' && currentDay) currentDay.lines.push(line)
    else if (section === 'desserts') desserts.push(line)
    else if (section === 'shopping') shoppingList.push(line)
  }

  if (currentDay) days.push(currentDay)

  // Trim leading/trailing blank lines from each section
  function trim(arr) {
    while (arr.length && !arr[0].trim()) arr.shift()
    while (arr.length && !arr[arr.length - 1].trim()) arr.pop()
    return arr.join('\n')
  }

  return {
    lastGenerated,
    weekOf,
    prepStrategy: trim(prepStrategy),
    days: days.map(d => ({ ...d, lines: trim(d.lines.slice()).split('\n') })),
    desserts: trim(desserts),
    shoppingList: trim(shoppingList),
  }
}

/**
 * Extract just the recipe name from a parsed day object.
 * Looks for the "Dinner:" line and strips category/time annotations.
 * Returns null if not found.
 */
export function getDayRecipeName(day) {
  if (!day) return null
  const dinnerLine = day.lines.find(l => l.toLowerCase().includes('dinner:'))
  const src = dinnerLine || day.lines.find(l => l.trim())
  if (!src) return null
  return src
    .replace(/^\s*[-*]?\s*\*?\*?Dinner:\*?\*?\s*/i, '')
    .replace(/\s*\|.*$/, '')
    .replace(/\*\*/g, '')
    .trim() || null
}

/**
 * Parse a single day's line array into labelled fields for display.
 * Lines look like:
 *   **Dinner:** Saag Chicken | `IND-P` | ~60 min
 *   **Also cooking:** ...
 *   *Yield: ...*
 */
export function parseDayLines(lines) {
  return lines
    .filter(l => l.trim())
    .map(line => {
      const boldMatch = line.match(/^\*\*(.+?):\*\*\s*(.*)/)
      if (boldMatch) return { type: 'field', label: boldMatch[1], value: boldMatch[2] }
      if (line.startsWith('*') && line.endsWith('*')) return { type: 'note', value: line.replace(/^\*|\*$/g, '').trim() }
      return { type: 'text', value: line }
    })
}

/**
 * Extract category codes from a value string like "Saag Chicken | `IND-P` | ~60 min"
 */
export function extractCategoryFromValue(value) {
  const match = value.match(/`([A-Z-]+)`/)
  return match ? match[1] : null
}

/**
 * Extract cook time from a value string
 */
export function extractCookTime(value) {
  const match = value.match(/(?:~|Total: ?)(\d+ min)/)
  return match ? match[1] : null
}

/**
 * Strip category and cook time markers from a value for clean display
 */
export function cleanValue(value) {
  return value
    .replace(/\s*\|?\s*`[A-Z-]+`/g, '')
    .replace(/\s*\|\s*(?:~|Total: ?)[\d]+ min/g, '')
    .replace(/\s*\|\s*[\d]+ min/g, '')
    .trim()
}
