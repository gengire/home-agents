/**
 * Parse maintenance-schedule.md into a structured object.
 */
export function parseMaintenance(markdown) {
  const data = {
    lastUpdated: '',
    hvac: {
      lastFilterChanged: '',
      nextFilterCheck: '',
      nextFilterReplacement: '',
      humidityTarget: '45-55%',
      lastNestReview: '',
      notes: '',
    },
    safety: {
      detectorsLastTested: '',
      detectorBatteriesReplaced: '',
      waterHeaterLastFlushed: '',
      guttersLastCleaned: '',
    },
    quickActions: {
      checkFilter: false,
      reviewNest: false,
      testDetectors: false,
    },
    seasonalNotes: '',
    footerNotes: '',
  }

  const lines = markdown.split('\n')
  let inSeasonal = false
  let inFooterNotes = false
  const seasonalLines = []
  const footerNoteLines = []

  for (const line of lines) {
    const lu = line.match(/^\*\*Last updated:\*\*\s*(.*)/)
    if (lu) { data.lastUpdated = lu[1].trim(); continue }

    // HVAC fields
    matchDate(line, 'Last HVAC air filter changed:', val => data.hvac.lastFilterChanged = val)
    matchDate(line, 'Next HVAC filter check:', val => data.hvac.nextFilterCheck = val)
    matchDate(line, 'Next HVAC filter replacement:', val => data.hvac.nextFilterReplacement = val)
    matchDate(line, 'Last Nest schedule/season review:', val => data.hvac.lastNestReview = val)

    const humMatch = line.match(/Current Nest humidity target:\s*(.+)/)
    if (humMatch) { data.hvac.humidityTarget = humMatch[1].trim(); continue }

    const hvacNotes = line.match(/^- Notes:\s*(.*)/)
    if (hvacNotes) { data.hvac.notes = hvacNotes[1].trim(); continue }

    // Safety fields
    matchDate(line, 'Smoke & CO detectors last tested:', val => data.safety.detectorsLastTested = val)
    matchDate(line, 'Smoke & CO detector batteries replaced:', val => data.safety.detectorBatteriesReplaced = val)
    matchDate(line, 'Water heater last flushed:', val => data.safety.waterHeaterLastFlushed = val)
    matchDate(line, 'Gutters last cleaned:', val => data.safety.guttersLastCleaned = val)

    // Quick actions checkboxes
    if (line.includes('Check HVAC filter')) data.quickActions.checkFilter = line.includes('[x]') || line.includes('[X]')
    if (line.includes('Review Nest settings')) data.quickActions.reviewNest = line.includes('[x]') || line.includes('[X]')
    if (line.includes('Test smoke/CO detectors')) data.quickActions.testDetectors = line.includes('[x]') || line.includes('[X]')

    // Seasonal section
    if (line.startsWith('## Seasonal')) { inSeasonal = true; inFooterNotes = false; continue }
    if (line.startsWith('**Quick Actions')) { inSeasonal = false; continue }
    if (inSeasonal && !line.startsWith('## ') && !line.startsWith('**')) {
      seasonalLines.push(line)
    }

    // Footer notes
    if (line.startsWith('**Notes:**')) { inFooterNotes = true; continue }
    if (inFooterNotes && line.startsWith('- ')) footerNoteLines.push(line.slice(2).trim())
  }

  data.seasonalNotes = seasonalLines.filter(l => l.trim()).join('\n')
  data.footerNotes = footerNoteLines.join('\n')
  return data
}

function matchDate(line, label, setter) {
  // Matches "- Label: value" or "- Label: [Date]" (treat [Date] as empty)
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`-\\s*${escaped}\\s*(.*)`)
  const m = line.match(re)
  if (m) {
    const val = m[1].trim()
    setter(val === '[Date]' || val === '' ? '' : val)
  }
}

/**
 * Serialize structured maintenance data back to markdown.
 */
export function serializeMaintenance(data, originalMarkdown) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  let md = originalMarkdown

  // Update last updated
  md = md.replace(/(\*\*Last updated:\*\*\s*)(.*)/, `$1${today}`)

  // HVAC dates
  md = setDateField(md, 'Last HVAC air filter changed:', data.hvac.lastFilterChanged)
  md = setDateField(md, 'Next HVAC filter check:', data.hvac.nextFilterCheck)
  md = setDateField(md, 'Next HVAC filter replacement:', data.hvac.nextFilterReplacement)
  md = setDateField(md, 'Last Nest schedule/season review:', data.hvac.lastNestReview)

  // Preserve Notes line for HVAC
  if (data.hvac.notes) {
    md = md.replace(/(- Notes:\s*)(.*)/, `$1${data.hvac.notes}`)
  }

  // Safety dates
  md = setDateField(md, 'Smoke & CO detectors last tested:', data.safety.detectorsLastTested)
  md = setDateField(md, 'Smoke & CO detector batteries replaced:', data.safety.detectorBatteriesReplaced)
  md = setDateField(md, 'Water heater last flushed:', data.safety.waterHeaterLastFlushed)
  md = setDateField(md, 'Gutters last cleaned:', data.safety.guttersLastCleaned)

  // Quick actions
  md = setCheckbox(md, 'Check HVAC filter', data.quickActions.checkFilter)
  md = setCheckbox(md, 'Review Nest settings for current season', data.quickActions.reviewNest)
  md = setCheckbox(md, 'Test smoke/CO detectors', data.quickActions.testDetectors)

  return md
}

function setDateField(md, label, value) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(- ${escaped})\\s*.*`, 'g')
  return md.replace(re, `$1 ${value || ''}`)
}

function setCheckbox(md, label, checked) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`- \\[.\\] ${escaped}`)
  return md.replace(re, `- [${checked ? 'x' : ' '}] ${label}`)
}

/**
 * Check if a date is overdue by N days.
 * Returns true if the date is blank OR older than thresholdDays.
 */
export function isOverdue(dateStr, thresholdDays) {
  if (!dateStr || dateStr === '[Date]') return false // blank = unknown, don't warn
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const daysSince = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
  return daysSince > thresholdDays
}
