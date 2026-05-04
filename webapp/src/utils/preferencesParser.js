/**
 * Parse family-preferences.md into editable structured data.
 * We extract the sections we make editable; everything else is preserved by
 * doing surgical string replacements on the original markdown on save.
 */
export function parsePreferences(markdown) {
  const data = {
    spiceBaseline: 'medium', // 'mild' | 'medium' | 'hot'
    dislikes: [],
    dessertFavorites: [],
    proteins: [],
    cuisineNotes: '',
    notes: '',
  }

  const lines = markdown.split('\n')
  let section = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Section detection
    if (line.startsWith('## Spice')) { section = 'spice'; continue }
    if (line.startsWith('## Cuisine')) { section = 'cuisine'; continue }
    if (line.startsWith('## Dislikes')) { section = 'dislikes'; continue }
    if (line.startsWith('## Desserts')) { section = 'desserts'; continue }
    if (line.startsWith('## Common Proteins')) { section = 'proteins'; continue }
    if (line.startsWith('## Cooking')) { section = null; continue }
    if (line.startsWith('## ')) { section = null; continue }

    if (section === 'spice') {
      const baseMatch = line.match(/\*\*Family baseline:\*\*\s*(.+)/i)
      if (baseMatch) {
        const val = baseMatch[1].toLowerCase()
        if (val.includes('mild')) data.spiceBaseline = 'mild'
        else if (val.includes('hot')) data.spiceBaseline = 'hot'
        else data.spiceBaseline = 'medium'
      }
    }

    if (section === 'dislikes' && line.startsWith('- [')) {
      // skip — no structured items yet, parse free list items below
    }
    if (section === 'dislikes' && line.startsWith('- ') && !line.includes('[Add any')) {
      data.dislikes.push(line.slice(2).trim())
    }

    if (section === 'desserts') {
      // Parse "- **Favorites:** item1, item2, ..." or individual "- item" lines
      const favMatch = line.match(/\*\*Favorites:\*\*\s*(.+)/)
      if (favMatch) {
        data.dessertFavorites = favMatch[1].split(',').map(s => s.trim()).filter(Boolean)
      } else if (line.startsWith('- ') && !line.includes('dessert') && !line.includes('Rotate') && !line.includes('Rules:') && !line.includes('1–2')) {
        const item = line.slice(2).trim()
        if (item && !data.dessertFavorites.includes(item)) data.dessertFavorites.push(item)
      }
    }

    if (section === 'proteins' && line.startsWith('- ')) {
      data.proteins.push(line.slice(2).trim())
    }
  }

  return data
}

const SPICE_LABELS = { mild: 'Mild', medium: 'Medium', hot: 'Hot' }

/**
 * Serialize updated prefs back into the original markdown via surgical replacement.
 */
export function serializePreferences(original, data) {
  let md = original

  // Spice baseline
  md = md.replace(
    /(\*\*Family baseline:\*\*\s*).*/,
    `$1${spiceDescription(data.spiceBaseline)}`
  )

  // Dislikes section — replace everything between the heading and the next ##
  md = replaceSectionContent(md, '## Dislikes / Avoid', data.dislikes.length > 0
    ? data.dislikes.map(d => `- ${d}`).join('\n')
    : '- [Add any specific dislikes here]'
  )

  // Dessert favorites line
  if (data.dessertFavorites.length > 0) {
    md = md.replace(
      /(\*\*Favorites:\*\*\s*).*/,
      `$1${data.dessertFavorites.join(', ')}`
    )
  }

  // Common Proteins section
  md = replaceSectionContent(md, '## Common Proteins', data.proteins.map(p => `- ${p}`).join('\n'))

  return md
}

function spiceDescription(level) {
  if (level === 'mild') return 'Mild heat. Everyone is comfortable here.'
  if (level === 'hot') return 'Hot. Family enjoys spicier food.'
  return 'Mild to medium heat. Everyone is comfortable here.'
}

/**
 * Replace the content of a section (between its ## heading and the next ## heading)
 * with new content lines.
 */
function replaceSectionContent(markdown, sectionHeading, newContent) {
  const lines = markdown.split('\n')
  let start = -1
  let end = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(sectionHeading)) { start = i; continue }
    if (start !== -1 && lines[i].startsWith('## ') && i > start) { end = i; break }
  }

  if (start === -1) return markdown
  if (end === -1) end = lines.length

  // Find first non-blank content line after heading
  let contentStart = start + 1
  while (contentStart < end && !lines[contentStart].trim()) contentStart++

  // Find last content line before next section
  let contentEnd = end - 1
  while (contentEnd > contentStart && !lines[contentEnd].trim()) contentEnd--

  const before = lines.slice(0, contentStart)
  const after = lines.slice(contentEnd + 1)
  return [...before, newContent, '', ...after].join('\n')
}

export { SPICE_LABELS }
