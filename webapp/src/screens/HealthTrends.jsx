import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  RefreshCw, TrendingUp, ChevronDown, ChevronUp,
  Flame, Trophy, UtensilsCrossed, Home, Leaf,
} from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend,
} from "recharts"
import { useApp } from "../context/AppContext"
import { getFile, listFiles, updateFile } from "../github/client"
import { parseCookLog } from "../utils/cookLogParser"

const RECIPES_PATH = "recipes"
const LOG_PATH = "data/cook-log.md"
const REVIEWS_PATH = "data/weekly-reviews.md"

// Pritikin per-serving targets
const TARGETS = {
  calories: { min: 350, max: 500, unit: "kcal", label: "Calories" },
  fat:      { max: 6,             unit: "g",    label: "Fat" },
  fiber:    { min: 6,             unit: "g",    label: "Fiber" },
  protein:  { min: 20,            unit: "g",    label: "Protein" },
  sodium:   { max: 1500,          unit: "mg",   label: "Sodium" },
}

/** Parse the "Nutrition Information (per serving):" block from a recipe file. */
function parseNutrition(content) {
  const block = content.match(/Nutrition Information \(per serving\):([\s\S]*?)(\n\n|\n(?:Notes|Categories|---))/i)
  if (!block) return null
  const lines = block[1]
  const extract = (pattern) => {
    const m = lines.match(pattern)
    return m ? parseFloat(m[1]) : null
  }
  return {
    calories: extract(/Calories:\s*([\d.]+)/i),
    fat:      extract(/Total Fat:\s*([\d.]+)/i),
    fiber:    extract(/Dietary Fiber:\s*([\d.]+)/i),
    protein:  extract(/Protein:\s*([\d.]+)/i),
    sodium:   extract(/Sodium:\s*([\d.]+)/i),
    carbs:    extract(/Total Carbohydrate:\s*([\d.]+)/i),
    servings: (content.match(/Servings:\s*([^\n]+)/i) || [])[1]?.trim() || null,
  }
}

function nameFromFilename(filename) {
  return filename.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.txt$/, "").replace(/_/g, " ")
}

/** ISO week key "YYYY-Www" for a date string */
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const year = d.getFullYear()
  const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** Generate last N ISO week keys in order, oldest first */
function lastNWeeks(n) {
  const today = new Date()
  const day = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + 1)
  const weeks = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    weeks.push(isoWeekKey(d.toISOString().slice(0, 10)))
  }
  return weeks
}

/** Check compliance against Pritikin targets. Returns pass count out of 4. */
function checkCompliance(nutrition) {
  if (!nutrition) return null
  let pass = 0
  if (nutrition.calories != null && nutrition.calories >= 350 && nutrition.calories <= 500) pass++
  if (nutrition.fat      != null && nutrition.fat <= 6) pass++
  if (nutrition.fiber    != null && nutrition.fiber >= 6) pass++
  if (nutrition.protein  != null && nutrition.protein >= 20) pass++
  return pass
}

/** Format short week label e.g. "Apr 28" from "2026-W18" */
function weekLabel(wk) {
  const [year, w] = wk.split('-W')
  const simple = new Date(parseInt(year), 0, 1 + (parseInt(w) - 1) * 7)
  const day = simple.getDay() || 7
  simple.setDate(simple.getDate() - day + 1)
  return simple.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Shared collapsible section ────────────────────────────────────────────

function ChartSection({ title, summary, open, onToggle, description, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {!open && summary && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {description && <p className="text-xs text-gray-500 italic">{description}</p>}
          {children}
        </div>
      )}
    </div>
  )
}

function ChartEmptyState({ name }) {
  return (
    <p className="text-sm text-gray-400 italic text-center py-6">
      Keep logging meals — your <strong>{name}</strong> will appear here after a couple of weeks.
    </p>
  )
}

// ── Metric bar (legacy, kept for per-recipe cards) ────────────────────────

function MetricBar({ label, value, unit, min, max }) {
  if (value == null) return null
  let colour, fill
  if (label === "Calories") {
    const ok = value >= min && value <= max
    colour = ok ? "bg-green-500" : value > max ? "bg-red-400" : "bg-amber-400"
    fill = Math.min(100, (value / 600) * 100)
  } else if (label === "Fat") {
    colour = value <= max ? "bg-green-500" : value <= max * 1.5 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 15) * 100)
  } else if (label === "Fiber") {
    colour = value >= min ? "bg-green-500" : value >= min * 0.5 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 12) * 100)
  } else {
    colour = value >= min ? "bg-green-500" : value >= min * 0.6 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 40) * 100)
  }
  const targetLabel = max && min ? `${min}–${max} ${unit}` : max ? `≤${max} ${unit}` : `≥${min} ${unit}`
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-xs font-medium text-gray-700">{value}{unit} <span className="text-gray-400 font-normal">({targetLabel})</span></span>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colour} transition-all duration-500`} style={{ width: `${fill}%` }} />
      </div>
    </div>
  )
}

function SummaryPill({ label, value, unit, isGood }) {
  return (
    <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${isGood ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className={`text-lg font-bold ${isGood ? 'text-green-700' : 'text-amber-700'}`}>{value ?? '—'}{value != null ? unit : ''}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function ComplianceBadge({ nutrition }) {
  if (!nutrition) return null
  const pass = checkCompliance(nutrition)
  const total = 4
  const pct = Math.round((pass / total) * 100)
  const colour = pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colour}`}>
      {pass}/{total} targets
    </span>
  )
}

// ── Item 3: Cook Frequency Calendar ──────────────────────────────────────

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function cellColor(dayEntries, nutritionMap) {
  if (!dayEntries || dayEntries.length === 0) return { bg: '#e5e7eb', label: 'No data' }
  const ateOut = dayEntries.some(e => e.notes.startsWith('Ate Out'))
  if (ateOut && dayEntries.every(e => e.notes.startsWith('Ate Out'))) return { bg: '#fbbf24', label: 'Ate Out' }
  let bestPass = -1
  for (const e of dayEntries) {
    if (e.notes.startsWith('Ate Out')) continue
    const n = nutritionMap[e.recipeName]
    if (n) {
      const p = checkCompliance(n)
      if (p > bestPass) bestPass = p
    }
  }
  if (bestPass === -1) return { bg: '#bfdbfe', label: 'Logged (no nutrition data)' }
  if (bestPass === 4) return { bg: '#15803d', label: 'Fully compliant' }
  if (bestPass === 3) return { bg: '#86efac', label: 'Mostly compliant (3/4)' }
  if (bestPass === 2) return { bg: '#fde047', label: 'Partial compliance (2/4)' }
  return { bg: '#f87171', label: 'Off plan (0-1 targets)' }
}

function CookFrequencyCalendar({ entries, nutritionMap }) {
  const [showAll, setShowAll] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  const byDate = useMemo(() => {
    const m = {}
    entries.forEach(e => {
      if (!m[e.date]) m[e.date] = []
      m[e.date].push(e)
    })
    return m
  }, [entries])

  const today = new Date()

  // determine start date
  const startDate = new Date(today)
  if (!showAll) {
    startDate.setDate(today.getDate() - 26 * 7)
  } else if (entries.length > 0) {
    const earliest = entries.reduce((min, e) => e.date < min ? e.date : min, entries[0].date)
    const e = new Date(earliest + 'T00:00:00')
    e.setDate(e.getDate() - e.getDay())
    startDate.setTime(e.getTime())
  }
  startDate.setDate(startDate.getDate() - startDate.getDay()) // align to Sunday

  const endDate = new Date(today)
  endDate.setDate(today.getDate() + (6 - today.getDay()))

  // Build weeks (each week = 7 days Sun-Sat)
  const weeks = []
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().slice(0, 10)
      week.push({ dateStr, future: cursor > today })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  const CELL = 26
  const GAP = 3

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { bg: '#15803d', label: 'Fully compliant' },
            { bg: '#86efac', label: '3/4 targets' },
            { bg: '#fde047', label: '2/4 targets' },
            { bg: '#f87171', label: 'Off plan' },
            { bg: '#fbbf24', label: 'Ate out' },
            { bg: '#bfdbfe', label: 'Logged' },
            { bg: '#e5e7eb', label: 'No data' },
          ].map(item => (
            <span key={item.label} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.bg }} />
              {item.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="text-xs text-green-700 hover:text-green-800 font-medium shrink-0 ml-2"
        >
          {showAll ? 'Show 6 months' : 'Full history'}
        </button>
      </div>

      <div className="overflow-x-auto pb-1">
        {/* Day-of-week header */}
        <div
          className="flex flex-col gap-[3px]"
          style={{ minWidth: (CELL + GAP) * weeks.length + 'px' }}
        >
          {/* Day labels row across the top, transposed: weeks=columns, days=rows */}
          {DAY_LABELS.map((dl, dayIdx) => (
            <div key={dl} className="flex gap-[3px]">
              <span style={{ width: 16, fontSize: 9, color: '#9ca3af', flexShrink: 0, paddingTop: 7, lineHeight: 1 }}>{dl}</span>
              {weeks.map((week, wi) => {
                const { dateStr, future } = week[dayIdx]
                const dayEntries = byDate[dateStr]
                const { bg, label } = future ? { bg: '#f9fafb', label: 'Future' } : cellColor(dayEntries, nutritionMap)
                const meals = dayEntries ? dayEntries.map(e => e.recipeName).join(', ') : ''
                const rating = dayEntries ? dayEntries.map(e => e.rating).filter(Boolean).join('/') : ''
                return (
                  <div
                    key={wi}
                    style={{ width: CELL, height: CELL, backgroundColor: bg, cursor: dayEntries ? 'pointer' : 'default', flexShrink: 0 }}
                    className="rounded-sm"
                    onClick={() => {
                      if (!dayEntries && !future) return
                      setTooltip(prev => prev?.dateStr === dateStr ? null : { dateStr, meals, rating, label })
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="mt-2 bg-gray-800 text-white rounded-xl px-3 py-2 text-xs space-y-0.5">
          <p className="font-semibold">{tooltip.dateStr}</p>
          {tooltip.meals && <p>{tooltip.meals}</p>}
          {tooltip.rating && <p>Rating: {'★'.repeat(Number(tooltip.rating))}</p>}
          <p className="text-gray-300">{tooltip.label}</p>
          <button type="button" onClick={() => setTooltip(null)} className="text-gray-400 text-xs mt-1">dismiss</button>
        </div>
      )}
    </div>
  )
}

// ── Item 4: Streak & Records Row ──────────────────────────────────────────

function computeStats(entries, nutritionMap) {
  const sorted = [...entries].sort((a, b) => a.date < b.date ? -1 : 1)

  let currentStreak = 0
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  let checkDate = new Date(todayStr + 'T00:00:00')
  while (true) {
    const ds = checkDate.toISOString().slice(0, 10)
    const dayEntries = sorted.filter(e => e.date === ds)
    const hasHomeCooked = dayEntries.some(e => !e.notes.startsWith('Ate Out'))
    if (!hasHomeCooked) break
    currentStreak++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  let longestStreak = 0, tempStreak = 0, prevDate = null
  const homeCookedDates = [...new Set(sorted.filter(e => !e.notes.startsWith('Ate Out')).map(e => e.date))].sort()
  for (const ds of homeCookedDates) {
    if (prevDate) {
      const diff = Math.round((new Date(ds + 'T00:00:00') - new Date(prevDate + 'T00:00:00')) / 86400000)
      if (diff === 1) { tempStreak++ } else { longestStreak = Math.max(longestStreak, tempStreak); tempStreak = 1 }
    } else { tempStreak = 1 }
    prevDate = ds
  }
  longestStreak = Math.max(longestStreak, tempStreak)

  const total = entries.length
  const homeCooked = entries.filter(e => !e.notes.startsWith('Ate Out')).length
  const homePct = total > 0 ? Math.round((homeCooked / total) * 100) : 0

  const fiberByWeek = {}
  for (const e of sorted) {
    const n = nutritionMap[e.recipeName]
    if (n?.fiber != null) {
      const wk = isoWeekKey(e.date)
      if (!fiberByWeek[wk]) fiberByWeek[wk] = []
      fiberByWeek[wk].push(n.fiber)
    }
  }
  let bestFiberWeek = null
  for (const vals of Object.values(fiberByWeek)) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    if (bestFiberWeek === null || avg > bestFiberWeek) bestFiberWeek = avg
  }

  return { currentStreak, longestStreak, total, homeCooked, homePct, bestFiberWeek }
}

function StatsRow({ entries, nutritionMap }) {
  const stats = useMemo(() => computeStats(entries, nutritionMap), [entries, nutritionMap])
  const pills = [
    { icon: <Flame size={16} className="text-orange-500" />, value: `${stats.currentStreak}d`, label: 'Streak' },
    { icon: <Trophy size={16} className="text-amber-500" />, value: `${stats.longestStreak}d`, label: 'Best streak' },
    { icon: <UtensilsCrossed size={16} className="text-gray-500" />, value: stats.total, label: 'Meals logged' },
    { icon: <Home size={16} className="text-green-600" />, value: `${stats.homePct}%`, label: 'Home cooked' },
    { icon: <Leaf size={16} className="text-emerald-600" />, value: stats.bestFiberWeek ? `${stats.bestFiberWeek.toFixed(1)}g` : '—', label: 'Best fiber wk' },
  ]
  return (
    <div className="overflow-x-auto -mx-1">
      <div className="flex gap-2 px-1 pb-1" style={{ minWidth: 'max-content' }}>
        {pills.map(p => (
          <div key={p.label} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shrink-0">
            {p.icon}
            <div>
              <p className="text-base font-bold text-gray-800 leading-tight">{p.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{p.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Item 5: Weekly Compliance Bar + What Derailed You ────────────────────

function buildComplianceData(entries, nutritionMap, weeks) {
  return weeks.map(wk => {
    const weekEntries = entries.filter(e => isoWeekKey(e.date) === wk && !e.notes.startsWith('Ate Out'))
    const withNutrition = weekEntries.filter(e => nutritionMap[e.recipeName])
    if (withNutrition.length === 0) return { week: wk, label: weekLabel(wk), pct: null, entries: weekEntries, withNutrition, nonCompliant: [] }
    const compliant = withNutrition.filter(e => checkCompliance(nutritionMap[e.recipeName]) === 4)
    const pct = Math.round((compliant.length / withNutrition.length) * 100)
    const nonCompliant = withNutrition.filter(e => checkCompliance(nutritionMap[e.recipeName]) < 4)
    return { week: wk, label: weekLabel(wk), pct, entries: weekEntries, withNutrition, compliant, nonCompliant }
  })
}

function complianceBarColor(pct) {
  if (pct == null) return '#d1d5db'
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#eab308'
  return '#dc2626'
}

function WhatHappenedPanel({ weekData, nutritionMap }) {
  const [open, setOpen] = useState(false)
  if (!weekData.nonCompliant || weekData.nonCompliant.length === 0 || (weekData.pct ?? 100) >= 80) return null
  return (
    <div className="border border-amber-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50 text-left"
      >
        <span className="text-xs text-amber-800 font-semibold">⚠️ What happened — week of {weekData.label}? ({weekData.pct}%)</span>
        {open ? <ChevronUp size={13} className="text-amber-600" /> : <ChevronDown size={13} className="text-amber-600" />}
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2 bg-white">
          {weekData.nonCompliant.map((e, i) => {
            const n = nutritionMap[e.recipeName]
            if (!n) return null
            const fails = []
            if (n.calories != null && (n.calories < 350 || n.calories > 500)) fails.push(`Calories ${n.calories} kcal (target 350–500)`)
            if (n.fat      != null && n.fat > 6)    fails.push(`Fat ${n.fat}g (target ≤6g)`)
            if (n.fiber    != null && n.fiber < 6)  fails.push(`Fiber ${n.fiber}g (target ≥6g)`)
            if (n.protein  != null && n.protein < 20) fails.push(`Protein ${n.protein}g (target ≥20g)`)
            return (
              <div key={i} className="text-xs">
                <p className="font-semibold text-gray-800">{e.recipeName} <span className="text-gray-400 font-normal">({e.date})</span></p>
                {fails.map(f => <p key={f} className="text-red-600 ml-2">• {f}</p>)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Items 6–8: Chart data builders ────────────────────────────────────────

function buildSodiumData(entries, nutritionMap, weeks) {
  return weeks.map(wk => {
    const vals = entries.filter(e => isoWeekKey(e.date) === wk && !e.notes.startsWith('Ate Out'))
      .map(e => nutritionMap[e.recipeName]?.sodium).filter(v => v != null)
    const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    return { week: wk, label: weekLabel(wk), sodium: avg }
  })
}

function buildNutritionTrendData(entries, nutritionMap, weeks) {
  return weeks.map(wk => {
    const weekEntries = entries.filter(e => isoWeekKey(e.date) === wk && !e.notes.startsWith('Ate Out'))
    const avg = (key) => {
      const vals = weekEntries.map(e => nutritionMap[e.recipeName]?.[key]).filter(v => v != null)
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null
    }
    return { week: wk, label: weekLabel(wk), calories: avg('calories'), fiber: avg('fiber'), protein: avg('protein'), fat: avg('fat') }
  })
}

function trendArrow(data, key) {
  const vals = data.map(d => d[key]).filter(v => v != null)
  if (vals.length < 4) return '→'
  const half = Math.floor(vals.length / 2)
  const recent = vals.slice(-half).reduce((a, b) => a + b, 0) / half
  const prior  = vals.slice(0, half).reduce((a, b) => a + b, 0) / half
  const delta = recent - prior
  const threshold = prior * 0.05
  if (delta > threshold) return '↑'
  if (delta < -threshold) return '↓'
  return '→'
}

function buildCalorieDistData(entries, nutritionMap, weeks) {
  return weeks.map(wk => {
    const weekEntries = entries.filter(e => isoWeekKey(e.date) === wk && !e.notes.startsWith('Ate Out'))
    const avg = (key) => {
      const vals = weekEntries.map(e => nutritionMap[e.recipeName]?.[key]).filter(v => v != null)
      return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
    }
    const carbs = avg('carbs'), protein = avg('protein'), fat = avg('fat')
    return {
      week: wk, label: weekLabel(wk),
      carbCal:  carbs   != null ? Math.round(carbs * 4)   : null,
      protCal:  protein != null ? Math.round(protein * 4) : null,
      fatCal:   fat     != null ? Math.round(fat * 9)     : null,
    }
  })
}

// ── Item 11: Sunday Health Brief ──────────────────────────────────────────

function generateHealthBrief(entries, nutritionMap, weeks8) {
  const compData = buildComplianceData(entries, nutritionMap, weeks8)
  const withData = compData.filter(w => w.pct !== null)
  if (!withData.length) return null
  const latestWeek = withData[withData.length - 1]
  const avgCompliance = Math.round(withData.reduce((a, b) => a + (b.pct ?? 0), 0) / withData.length)

  let bestMeal = null, bestPass = -1
  for (const e of entries) {
    const n = nutritionMap[e.recipeName]
    if (n) { const p = checkCompliance(n); if (p > bestPass) { bestPass = p; bestMeal = e.recipeName } }
  }

  const failCounts = { calories: 0, fat: 0, fiber: 0, protein: 0 }
  for (const e of entries) {
    const n = nutritionMap[e.recipeName]
    if (!n) continue
    if (n.calories != null && (n.calories < 350 || n.calories > 500)) failCounts.calories++
    if (n.fat      != null && n.fat > 6)    failCounts.fat++
    if (n.fiber    != null && n.fiber < 6)  failCounts.fiber++
    if (n.protein  != null && n.protein < 20) failCounts.protein++
  }
  const watchNutrient = Object.entries(failCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const suggestions = {
    fat:      'Watch for hidden oils and cheese — try dry-sautéing aromatics instead.',
    fiber:    'Add a handful of lentils or chickpeas to any dish to boost fiber easily.',
    protein:  'Include a legume or extra tofu/chicken to hit the 20g protein target.',
    calories: 'Aim for 350–500 kcal per serving — use the nutrition blocks in recipe files to confirm.',
  }
  const suggestion = suggestions[watchNutrient] || 'Keep logging and cooking at home to build a stronger data picture.'

  return [
    `This week's Pritikin compliance was ${latestWeek.pct ?? '?'}%, and your rolling average across ${withData.length} tracked weeks is ${avgCompliance}%.`,
    bestMeal ? `The standout high-nutrition meal in your log is ${bestMeal} — make it again.` : '',
    watchNutrient ? `${watchNutrient.charAt(0).toUpperCase() + watchNutrient.slice(1)} is the nutrient most often missing its target — keep an eye on it this coming week.` : '',
    suggestion,
  ].filter(Boolean).join(' ')
}

function SundayHealthBrief({ entries, nutritionMap, weeks8, reviewsSha, repo }) {
  const isSunday = new Date().getDay() === 0
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const brief = useMemo(() => generateHealthBrief(entries, nutritionMap, weeks8), [entries, nutritionMap, weeks8])

  if (!isSunday || !brief) return null

  async function saveBrief() {
    setSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const { content: current, sha: currentSha } = await getFile(repo, REVIEWS_PATH).catch(() => ({ content: '', sha: undefined }))
      const appended = (current || '') + `\n## Week of ${today} — Health Brief\n${brief}\n`
      await updateFile(repo, REVIEWS_PATH, appended, currentSha || reviewsSha, `Health brief — ${today}`)
      setSaved(true)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-green-50 border border-green-300 rounded-2xl px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">📋</span>
        <p className="text-sm font-semibold text-green-800">Sunday Health Brief</p>
      </div>
      <p className="text-xs text-green-900 leading-relaxed">{brief}</p>
      <button
        type="button"
        onClick={saveBrief}
        disabled={saving || saved}
        className="text-xs bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {saved ? '✔ Saved to weekly-reviews.md' : saving ? 'Saving…' : 'Save to weekly-reviews.md'}
      </button>
    </div>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────

const WEEKS_12 = lastNWeeks(12)
const WEEKS_8  = lastNWeeks(8)

export default function HealthTrends() {
  const { repo } = useApp()
  const navigate = useNavigate()
  const [loading,  setLoading]  = useState(true)
  const [recipes,  setRecipes]  = useState([])
  const [entries,  setEntries]  = useState([])
  const [nutritionMap, setNutritionMap] = useState({})
  const [reviewsSha,   setReviewsSha]   = useState(undefined)
  const [error, setError] = useState(null)

  // Chart open/close state
  const [calendarOpen,   setCalendarOpen]   = useState(true)
  const [complianceOpen, setComplianceOpen] = useState(true)
  const [sodiumOpen,     setSodiumOpen]     = useState(true)
  const [nutriOpen,      setNutriOpen]      = useState(false)
  const [calDistOpen,    setCalDistOpen]    = useState(false)

  const [visLines, setVisLines] = useState({ calories: true, fiber: true, protein: true, fat: true })

  function expandAll()  { setCalendarOpen(true);  setComplianceOpen(true);  setSodiumOpen(true);  setNutriOpen(true);  setCalDistOpen(true)  }
  function collapseAll(){ setCalendarOpen(false); setComplianceOpen(false); setSodiumOpen(false); setNutriOpen(false); setCalDistOpen(false) }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [recipeFiles, { content: logContent }] = await Promise.all([
        listFiles(repo, RECIPES_PATH).catch(() => []),
        getFile(repo, LOG_PATH).catch(() => ({ content: '' })),
      ])

      const allEntries = logContent ? parseCookLog(logContent) : []
      setEntries(allEntries)

      const cookCount = {}
      allEntries.forEach(e => {
        if (!e.notes.startsWith('Ate Out')) cookCount[e.recipeName] = (cookCount[e.recipeName] || 0) + 1
      })

      const txtFiles = recipeFiles.filter(f => f.name.endsWith('.txt')).slice(0, 30)
      const results = await Promise.allSettled(txtFiles.map(f => getFile(repo, `${RECIPES_PATH}/${f.name}`)))

      const parsed = []
      const nMap = {}
      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return
        const content = res.value.content
        const name = nameFromFilename(txtFiles[i].name)
        const nutrition = parseNutrition(content)
        const categoryLine = content.match(/Category:\s*([^\n]+)/i)
        const category = categoryLine ? categoryLine[1].trim() : null
        if (nutrition) nMap[name] = nutrition
        parsed.push({ name, nutrition, cookCount: cookCount[name] || 0, category })
      })

      setNutritionMap(nMap)
      setRecipes(parsed.sort((a, b) => (b.cookCount - a.cookCount) || a.name.localeCompare(b.name)))
      getFile(repo, REVIEWS_PATH).then(r => setReviewsSha(r.sha)).catch(() => {})
    } catch {
      setError("Failed to load nutrition data.")
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  const complianceData = useMemo(() => buildComplianceData(entries, nutritionMap, WEEKS_8),      [entries, nutritionMap])
  const sodiumData     = useMemo(() => buildSodiumData(entries, nutritionMap, WEEKS_12),          [entries, nutritionMap])
  const nutriData      = useMemo(() => buildNutritionTrendData(entries, nutritionMap, WEEKS_12),  [entries, nutritionMap])
  const calDistData    = useMemo(() => buildCalorieDistData(entries, nutritionMap, WEEKS_8),      [entries, nutritionMap])

  const hasEnoughData = complianceData.filter(d => d.pct !== null).length >= 2

  const withNutrition = recipes.filter(r => r.nutrition)
  const avg = (key) => {
    const vals = withNutrition.map(r => r.nutrition[key]).filter(v => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }

  const nutriSummary = useMemo(() => {
    const fib = trendArrow(nutriData, 'fiber')
    const pro = trendArrow(nutriData, 'protein')
    const fat = trendArrow(nutriData, 'fat')
    return `Fiber ${fib}  Protein ${pro}  Fat ${fat}${fat === '↑' ? ' ⚠️' : ''}`
  }, [nutriData])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
      <RefreshCw size={28} className="animate-spin" />
      <span className="text-sm">Crunching nutrition data…</span>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 pb-32 pt-2 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-green-600" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Health Trends</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll}   className="text-xs text-gray-500 hover:text-gray-700">Expand all</button>
          <span className="text-gray-300">·</span>
          <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-gray-700">Collapse all</button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
            <RefreshCw size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Item 11: Sunday Health Brief */}
      <SundayHealthBrief
        entries={entries}
        nutritionMap={nutritionMap}
        weeks8={WEEKS_8}
        reviewsSha={reviewsSha}
        repo={repo}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Item 3: Cook Frequency Calendar */}
      <ChartSection
        title="Cook Frequency Calendar"
        description="Each cell is one day — colored by Pritikin compliance. Tap a cell to see what was eaten."
        open={calendarOpen}
        onToggle={() => setCalendarOpen(v => !v)}
      >
        <CookFrequencyCalendar entries={entries} nutritionMap={nutritionMap} />
      </ChartSection>

      {/* Item 4: Stats Row — always visible, outside ChartSection */}
      <StatsRow entries={entries} nutritionMap={nutritionMap} />

      {/* Item 5: Weekly Compliance Bar */}
      <ChartSection
        title="Weekly Compliance"
        description="Each bar shows the percentage of your meals that week meeting all four Pritikin targets — aim to keep every bar green."
        open={complianceOpen}
        onToggle={() => setComplianceOpen(v => !v)}
      >
        {!hasEnoughData ? <ChartEmptyState name="Weekly Compliance" /> : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={complianceData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v) => v != null ? `${v}%` : 'No data'} />
                <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="4 2"
                  label={{ value: 'Target 80%', fill: '#16a34a', fontSize: 10, position: 'insideTopRight' }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {complianceData.map((entry, i) => (
                    <Cell key={i} fill={complianceBarColor(entry.pct)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {complianceData.filter(w => (w.pct ?? 100) < 80).map((wk, i) => (
                <WhatHappenedPanel key={i} weekData={wk} nutritionMap={nutritionMap} />
              ))}
            </div>
          </>
        )}
      </ChartSection>

      {/* Item 6: Sodium Trend */}
      <ChartSection
        title="Sodium Trend"
        description="Sodium is the nutrient most likely to creep up even in otherwise healthy Pritikin cooking — watch this line."
        open={sodiumOpen}
        onToggle={() => setSodiumOpen(v => !v)}
      >
        {!hasEnoughData ? <ChartEmptyState name="Sodium Trend" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={sodiumData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="mg" />
              <Tooltip formatter={(v) => v != null ? `${v} mg` : 'No data'} />
              <ReferenceLine y={1500} stroke="#dc2626" strokeDasharray="4 2"
                label={{ value: 'Ceiling 1500mg', fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="sodium" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls name="Avg Sodium" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      {/* Item 7: Nutrition Trends (collapsed by default) */}
      <ChartSection
        title="Nutrition Trends"
        summary={nutriSummary}
        description="Weekly averages for key nutrients. Toggle lines on/off. Reference lines for fiber (≥6g) and fat limit (≤6g)."
        open={nutriOpen}
        onToggle={() => setNutriOpen(v => !v)}
      >
        {!hasEnoughData ? <ChartEmptyState name="Nutrition Trends" /> : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'calories', label: 'Calories', color: '#3b82f6' },
                { key: 'fiber',    label: 'Fiber',    color: '#16a34a' },
                { key: 'protein',  label: 'Protein',  color: '#8b5cf6' },
                { key: 'fat',      label: 'Fat',      color: '#f59e0b' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVisLines(v => ({ ...v, [key]: !v[key] }))}
                  className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                  style={visLines[key]
                    ? { backgroundColor: color, borderColor: color, color: '#fff', fontWeight: 600 }
                    : { backgroundColor: '#fff', borderColor: '#e5e7eb', color: '#9ca3af' }}
                >
                  {label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={nutriData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine y={6}  stroke="#16a34a" strokeDasharray="3 2" label={{ value: 'Fiber 6g', fill: '#16a34a', fontSize: 9 }} />
                <ReferenceLine y={6}  stroke="#f59e0b" strokeDasharray="3 2" label={{ value: 'Fat limit', fill: '#f59e0b', fontSize: 9 }} />
                {visLines.calories && <Line type="monotone" dataKey="calories" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls name="Calories" />}
                {visLines.fiber    && <Line type="monotone" dataKey="fiber"    stroke="#16a34a" strokeWidth={2} dot={false} connectNulls name="Fiber g" />}
                {visLines.protein  && <Line type="monotone" dataKey="protein"  stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls name="Protein g" />}
                {visLines.fat      && <Line type="monotone" dataKey="fat"      stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls name="Fat g" />}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </ChartSection>

      {/* Item 8: Calorie Distribution Stacked Bar (collapsed by default) */}
      <ChartSection
        title="Calorie Distribution"
        description="Each bar is your average weekly calories broken into macros — the fat slice should stay thin on a Pritikin diet."
        open={calDistOpen}
        onToggle={() => setCalDistOpen(v => !v)}
      >
        {!hasEnoughData ? <ChartEmptyState name="Calorie Distribution" /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calDistData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit=" cal" />
              <Tooltip />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="carbCal" name="Carbs"   stackId="a" fill="#93c5fd" />
              <Bar dataKey="protCal" name="Protein" stackId="a" fill="#c4b5fd" />
              <Bar dataKey="fatCal"  name="Fat"     stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartSection>

      {/* Pritikin target legend */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-800 space-y-0.5">
        <p className="font-semibold mb-1">Pritikin per-serving targets</p>
        <p>⚡ Calories: 350–500 kcal &nbsp;·&nbsp; 🥑 Fat: ≤6 g &nbsp;·&nbsp; 🌾 Fiber: ≥6 g &nbsp;·&nbsp; 💪 Protein: ≥20 g &nbsp;·&nbsp; 🧂 Sodium: ≤1,500 mg</p>
      </div>

      {/* Averages summary */}
      {withNutrition.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">Avg across {withNutrition.length} recipe{withNutrition.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <SummaryPill label="Calories" value={avg('calories')} unit=" kcal" isGood={avg('calories') != null && avg('calories') >= 350 && avg('calories') <= 500} />
            <SummaryPill label="Fat"      value={avg('fat')}      unit="g"     isGood={avg('fat')      != null && avg('fat') <= 6} />
            <SummaryPill label="Fiber"    value={avg('fiber')}    unit="g"     isGood={avg('fiber')    != null && avg('fiber') >= 6} />
            <SummaryPill label="Protein"  value={avg('protein')}  unit="g"     isGood={avg('protein')  != null && avg('protein') >= 20} />
          </div>
        </div>
      )}

      {/* Per-recipe cards */}
      {recipes.length === 0 && !error && (
        <p className="text-sm text-gray-400 italic text-center py-8">No recipes found in the recipes/ folder.</p>
      )}
      <div className="space-y-3">
        {recipes.map(recipe => (
          <div key={recipe.name} className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{recipe.name}</p>
                {recipe.category && <p className="text-xs text-gray-400 mt-0.5">{recipe.category}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {recipe.cookCount > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    ×{recipe.cookCount} cooked
                  </span>
                )}
                <ComplianceBadge nutrition={recipe.nutrition} />
              </div>
            </div>
            {recipe.nutrition ? (
              <div className="space-y-2">
                <MetricBar label="Calories" value={recipe.nutrition.calories} unit=" kcal" min={350} max={500} />
                <MetricBar label="Fat"      value={recipe.nutrition.fat}      unit="g"     max={6} />
                <MetricBar label="Fiber"    value={recipe.nutrition.fiber}    unit="g"     min={6} />
                <MetricBar label="Protein"  value={recipe.nutrition.protein}  unit="g"     min={20} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No nutrition data in recipe file.</p>
            )}
          </div>
        ))}
      </div>

      {recipes.length > 0 && (
        <p className="text-xs text-gray-400 text-center">Showing up to 30 recipes · Per-serving values from recipe files</p>
      )}
    </div>
  )
}
