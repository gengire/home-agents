/**
 * Parse pantry-inventory.md into a structured object.
 *
 * Expected format:
 *   # Pantry & Fridge Inventory
 *   **Last updated:** May 2, 2026
 *
 *   **Proteins:**
 *   - item 1
 *   - item 2
 *
 * Returns:
 *   {
 *     lastUpdated: "May 2, 2026",
 *     sections: [
 *       { name: "Proteins", items: ["Tilapia fillets (frozen — use this week)"] },
 *       ...
 *     ],
 *     footer: "**Notes:**\n- ..."   // everything after the last item section
 *   }
 */
export function parsePantry(markdown) {
  const lines = markdown.split('\n')
  const sections = []
  let lastUpdated = ''
  let currentSection = null
  let footerLines = []
  let inFooter = false

  for (const line of lines) {
    // Last updated line
    const updatedMatch = line.match(/^\*\*Last updated:\*\*\s*(.+)/)
    if (updatedMatch) {
      lastUpdated = updatedMatch[1].trim()
      continue
    }

    // Notes section — treat as footer (preserve as-is)
    if (line.match(/^\*\*Notes:\*\*/)) {
      inFooter = true
      if (currentSection) sections.push(currentSection)
      currentSection = null
      footerLines.push(line)
      continue
    }

    if (inFooter) {
      footerLines.push(line)
      continue
    }

    // Section heading: **SectionName:**
    const sectionMatch = line.match(/^\*\*(.+):\*\*$/)
    if (sectionMatch) {
      if (currentSection) sections.push(currentSection)
      currentSection = { name: sectionMatch[1].trim(), items: [] }
      continue
    }

    // List item under a section
    if (currentSection && line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (item) currentSection.items.push(item)
      continue
    }
  }

  if (currentSection) sections.push(currentSection)

  return { lastUpdated, sections, footer: footerLines.join('\n') }
}

/**
 * Serialize structured pantry data back to markdown.
 * Preserves the exact format the agents expect.
 */
export function serializePantry(parsed) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const lines = ['# Pantry & Fridge Inventory', `**Last updated:** ${today}`, '']

  for (const section of parsed.sections) {
    lines.push(`**${section.name}:**`)
    if (section.items.length === 0) {
      lines.push('- ')
    } else {
      for (const item of section.items) {
        lines.push(`- ${item}`)
      }
    }
    lines.push('')
  }

  if (parsed.footer) {
    lines.push(parsed.footer)
  }

  return lines.join('\n')
}
