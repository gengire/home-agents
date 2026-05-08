import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw, ChefHat, ShoppingBasket, CalendarDays, Wrench, AlertTriangle, CheckCircle2, ClipboardList, ChevronDown, ChevronUp, Recycle } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile, listFiles } from "../github/client"
import { parseCookLog, CATEGORIES, getCategoryStyle, getRecentCategories } from "../utils/cookLogParser"
import { parseMealPlan, getDayRecipeName } from "../utils/mealPlanParser"
import { parseMaintenance, isOverdue } from "../utils/maintenanceParser"
import { parsePantry } from "../utils/pantryParser"
import Toast from "../components/Toast"

const REVIEW_PATH = 'data/weekly-reviews.md'
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayDayName() {
  return DAY_NAMES[new Date().getDay()]
}

function tomorrowDayName() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return DAY_NAMES[d.getDay()]
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function findDayPlan(days, dayName) {
  return days.find(d => d.heading.toLowerCase().includes(dayName.toLowerCase())) || null
}

function getDayLabel(day) {
  if (!day) return null
  // Find the "Dinner:" line
  const dinnerLine = day.lines.find(l => l.toLowerCase().includes('dinner:'))
  if (!dinnerLine) return day.lines.find(l => l.trim()) || null
  return dinnerLine.replace(/^\s*[-*]?\s*\*?\*?Dinner:\*?\*?\s*/i, '').replace(/\s*\|.*$/, '').trim()
}

function OverdueAlerts({ maintenance }) {
  const alerts = []

  if (isOverdue(maintenance.hvac.lastFilterChanged, 90))
    alerts.push({ label: 'HVAC filter change overdue', path: '/maintenance' })
  if (isOverdue(maintenance.safety.detectorsLastTested, 180))
    alerts.push({ label: 'Smoke detector test overdue', path: '/maintenance' })
  if (isOverdue(maintenance.safety.detectorBatteriesReplaced, 365))
    alerts.push({ label: 'Detector battery replacement overdue', path: '/maintenance' })
  if (isOverdue(maintenance.safety.waterHeaterLastFlushed, 365))
    alerts.push({ label: 'Water heater flush overdue', path: '/maintenance' })
  if (isOverdue(maintenance.safety.guttersLastCleaned, 180))
    alerts.push({ label: 'Gutter cleaning overdue', path: '/maintenance' })

  if (alerts.length === 0) return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
      <CheckCircle2 size={16} className="shrink-0" />
      Home maintenance is up to date
    </div>
  )

  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <AlertCard key={a.label} label={a.label} path={a.path} />
      ))}
    </div>
  )
}

function AlertCard({ label, path }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 text-left hover:bg-red-100 transition-colors"
    >
      <AlertTriangle size={16} className="shrink-0 text-red-500" />
      <span>{label}</span>
      <span className="ml-auto text-red-400 text-xs">Fix →</span>
    </button>
  )
}

function QuickAction({ icon: Icon, label, sub, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl p-4 border-2 ${color} transition-colors active:scale-95`}
    >
      <Icon size={22} />
      <span className="text-sm font-semibold leading-tight text-center">{label}</span>
      {sub && <span className="text-xs opacity-70 text-center">{sub}</span>}
    </button>
  )
}

export default function Dashboard() {
  const { repo } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [todayDinner, setTodayDinner] = useState(null)
  const [tomorrowDinner, setTomorrowDinner] = useState(null)
  const [todayIsNew, setTodayIsNew] = useState(false)
  const [todayLoggedMeal, setTodayLoggedMeal] = useState(null)
  const [coolingDown, setCoolingDown] = useState([])
  const [maintenance, setMaintenance] = useState(null)
  const [pantryUpdated, setPantryUpdated] = useState('')
  const [error, setError] = useState(null)

  // Weekly review state
  const isSunday = new Date().getDay() === 0
  const [reviewOpen, setReviewOpen] = useState(isSunday)
  const [reviewRows, setReviewRows] = useState([])
  const [weekOf, setWeekOf] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [toast, setToast] = useState(null)

  // Ingredient recycling state
  const [pantryItems, setPantryItems] = useState([])       // flat lowercase strings
  const [recipeFileMap, setRecipeFileMap] = useState({})   // recipeName -> filename
  const [recycleOpen, setRecycleOpen] = useState({})       // rowIndex -> bool
  const [recycleData, setRecycleData] = useState({})       // rowIndex -> {loading, ingredients, matches}
  const [copied, setCopied] = useState(null)               // rowIndex that was just copied

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mealFile, cookFile, maintFile, pantryFile] = await Promise.all([
        getFile(repo, 'data/meal-plan.md').catch(() => null),
        getFile(repo, 'data/cook-log.md').catch(() => null),
        getFile(repo, 'data/maintenance-schedule.md').catch(() => null),
        getFile(repo, 'data/pantry-inventory.md').catch(() => null),
      ])

      if (mealFile) {
        const plan = parseMealPlan(mealFile.content)
        const today = findDayPlan(plan.days, todayDayName())
        const tomorrow = findDayPlan(plan.days, tomorrowDayName())
        setTodayDinner(getDayLabel(today))
        setTomorrowDinner(getDayLabel(tomorrow))
        setTodayIsNew(today?.isNewCook ?? false)
        setWeekOf(plan.weekOf || '')

        // Build review rows: one per planned day
        if (cookFile) {
          const entries = parseCookLog(cookFile.content)
          const rows = plan.days.map(day => {
            const planned = getDayRecipeName(day)
            // Find a log entry whose date falls in this week that matches the day name
            // Best effort: match by day heading name
            const dayName = day.heading.split(',')[0].trim() // "Sunday", "Monday", etc.
            const dayIdx = DAY_NAMES.indexOf(dayName)
            // Find the log entry on the date that corresponds to this day within the plan week
            // Parse week start from weekOf string (e.g. "May 3–9, 2026")
            let loggedEntry = null
            if (plan.weekOf) {
              const yearMatch = plan.weekOf.match(/(\d{4})/)
              const startMatch = plan.weekOf.match(/(\w+ \d+)/)
              if (yearMatch && startMatch) {
                const startDate = new Date(`${startMatch[1]}, ${yearMatch[1]}`)
                if (!isNaN(startDate)) {
                  // Find which calendar date in the plan week matches this day name
                  for (let offset = 0; offset < 7; offset++) {
                    const d = new Date(startDate)
                    d.setDate(startDate.getDate() + offset)
                    if (d.getDay() === dayIdx) {
                      const iso = d.toISOString().slice(0, 10)
                      const match = entries.filter(e => e.date === iso)
                        .find(e => !e.notes.startsWith('Leftovers'))
                      if (match) loggedEntry = match
                      break
                    }
                  }
                }
              }
            }
            const cooked = loggedEntry ? loggedEntry.recipeName : null
            let status = 'unlogged'
            if (cooked) {
              status = planned && cooked.toLowerCase() === planned.toLowerCase() ? 'match' : 'diff'
            }
            return { dayName, isNewCook: day.isNewCook, planned, cooked, status, rating: loggedEntry?.rating || null, notes: loggedEntry?.notes || '' }
          })
          setReviewRows(rows)
        }
      }

      if (cookFile) {
        const entries = parseCookLog(cookFile.content)
        const recent = getRecentCategories(entries, 8)
        setCoolingDown([...recent])
        const todayEntry = entries.find(e => e.date === todayISO())
        setTodayLoggedMeal(todayEntry ? todayEntry.recipeName : null)
      }

      if (maintFile) {
        setMaintenance(parseMaintenance(maintFile.content))
      }

      if (pantryFile) {
        const match = pantryFile.content.match(/\*\*Last updated:\*\*\s*(.+)/)
        setPantryUpdated(match ? match[1].trim() : '')
        const parsed = parsePantry(pantryFile.content)
        const flat = parsed.sections.flatMap(s => s.items.map(i => i.toLowerCase()))
        setPantryItems(flat)
      }

      // Load recipe file map for ingredient recycling
      try {
        const recipeFiles = await listFiles(repo, 'recipes')
        const map = {}
        recipeFiles.filter(f => f.name.endsWith('.txt')).forEach(f => {
          const display = f.name.replace(/^\d{4}-\d{2}-\d{2}_/, '').replace(/\.txt$/, '').replace(/_/g, ' ')
          map[display.toLowerCase()] = f.name
        })
        setRecipeFileMap(map)
      } catch { /* recipes dir missing - ok */ }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  async function loadRecycleData(rowIndex, plannedName) {
    setRecycleData(prev => ({ ...prev, [rowIndex]: { loading: true, ingredients: [], matches: [] } }))
    try {
      const filename = recipeFileMap[plannedName.toLowerCase()]
      if (!filename) {
        setRecycleData(prev => ({ ...prev, [rowIndex]: { loading: false, ingredients: [], matches: [] } }))
        return
      }
      const { content } = await getFile(repo, `recipes/${filename}`)
      // Extract ingredients section
      const ingStart = content.indexOf('Ingredients:')
      const ingEnd = content.indexOf('Directions:', ingStart)
      const ingBlock = ingStart !== -1
        ? content.slice(ingStart + 'Ingredients:'.length, ingEnd !== -1 ? ingEnd : undefined)
        : ''
      const ingredients = ingBlock
        .split('\n')
        .map(l => l.replace(/^\s*[-*\d.]+\s*/, '').trim())
        .filter(Boolean)
        .map(l => {
          // Extract first 1-2 meaningful words before comma/paren as the ingredient token
          return l.replace(/[,(\d].*$/, '').trim().toLowerCase()
        })
        .filter(l => l.length > 2)

      // Cross-reference against pantry
      const matches = ingredients.filter(ing =>
        pantryItems.some(p => p.includes(ing) || ing.includes(p.split(' ')[0]))
      )
      setRecycleData(prev => ({ ...prev, [rowIndex]: { loading: false, ingredients, matches } }))
    } catch {
      setRecycleData(prev => ({ ...prev, [rowIndex]: { loading: false, ingredients: [], matches: [] } }))
    }
  }

  function toggleRecycle(rowIndex, plannedName) {
    const opening = !recycleOpen[rowIndex]
    setRecycleOpen(prev => ({ ...prev, [rowIndex]: opening }))
    if (opening && !recycleData[rowIndex]) {
      loadRecycleData(rowIndex, plannedName)
    }
  }

  function copyCarryover(recipeName) {
    const msg = `Carry over "${recipeName}" to next week — we still have the ingredients.`
    navigator.clipboard?.writeText(msg).catch(() => {})
  }

  async function saveReview() {
    setReviewSaving(true)
    try {
      const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      const ratedRows = reviewRows.filter(r => r.rating)
      const avgRating = ratedRows.length
        ? (ratedRows.reduce((s, r) => s + r.rating, 0) / ratedRows.length).toFixed(1)
        : null
      const tableRows = reviewRows.map(r => {
        const icon = r.status === 'match' ? '✅' : r.status === 'diff' ? '🔄' : '❌'
        const cooked = r.cooked || '(not logged)'
        return `| ${r.dayName} | ${r.planned || '—'} | ${cooked} | ${icon} |`
      }).join('\n')
      const notesLines = reviewRows
        .filter(r => r.notes && !r.notes.startsWith('Leftovers') && !r.notes.startsWith('Ate Out'))
        .map(r => `- ${r.dayName}: ${r.notes}`)
        .join('\n')

      const block = [
        `## Week of ${weekOf}`,
        `**Generated:** ${date}`,
        '',
        '### Planned vs Cooked',
        '| Day | Planned | Cooked | Match |',
        '|-----|---------|--------|-------|',
        tableRows,
        '',
        '### Ratings',
        avgRating ? `Average this week: ${avgRating}/5` : 'No meals rated this week.',
        ...ratedRows.map(r => `- ${r.cooked || r.planned}: ${r.rating}★`),
        '',
        '### Notes for HomeChef',
        notesLines || '(none)',
        '',
        '---',
        '',
      ].join('\n')

      // Load current file (or create if missing)
      let sha = undefined
      let existing = ''
      try {
        const f = await getFile(repo, REVIEW_PATH)
        sha = f.sha
        existing = f.content
      } catch { /* file doesn't exist yet — create it */ }

      const header = existing || '# Weekly Reviews \u2014 HomeChef Reference Log\n**Purpose:** Append-only weekly summaries.\n\n---\n\n'
      await updateFile(repo, REVIEW_PATH, header + block, sha, `Weekly review — ${weekOf}`)
      setReviewSaved(true)
      setToast({ message: '✅ Review saved! HomeChef will use this for next week\'s plan.', type: 'success' })
    } catch {
      setToast({ message: '❌ Failed to save review.', type: 'error' })
    } finally {
      setReviewSaving(false)
    }
  }

  const availableCategories = CATEGORIES.filter(c => !coolingDown.includes(c.code))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <RefreshCw size={28} className="animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-32 pt-2 space-y-4">

      {/* Tonight's Dinner */}
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:border-green-300 transition-colors"
        onClick={() => navigate('/meal-plan')}
      >
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={16} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Tonight</span>
          {todayIsNew && !todayLoggedMeal && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🍳 Cook tonight</span>
          )}
        </div>

        {todayLoggedMeal ? (
          <>
            <div className="flex items-start gap-2">
              <span className="text-base">✅</span>
              <p className="text-base font-semibold text-gray-800 leading-snug">{todayLoggedMeal}</p>
            </div>
            {todayDinner && todayDinner.toLowerCase() !== todayLoggedMeal.toLowerCase() && (
              <p className="text-xs text-gray-400 mt-1">Was planned: {todayDinner}</p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start gap-2">
              <span className="text-base">📋</span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-800 leading-snug">
                  {todayDinner || <span className="text-gray-400 font-normal italic">No meal plan for today</span>}
                </p>
                {todayDinner && <p className="text-xs text-gray-400 mt-0.5">Planned</p>}
              </div>
            </div>
          </>
        )}

        {tomorrowDinner && (
          <p className="text-xs text-gray-400 mt-2">Tomorrow: {tomorrowDinner}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction
          icon={ChefHat}
          label="Log Dinner"
          sub="Cook log"
          color="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          onClick={() => navigate('/cook-log')}
        />
        <QuickAction
          icon={ShoppingBasket}
          label="Pantry"
          sub={pantryUpdated ? `Updated ${pantryUpdated}` : 'Check stock'}
          color="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
          onClick={() => navigate('/pantry')}
        />
        <QuickAction
          icon={Wrench}
          label="Home"
          sub="Maintenance"
          color="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          onClick={() => navigate('/maintenance')}
        />
      </div>

      {/* Category Rotation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Meal Rotation — Available Now</p>
        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map(c => (
            <span key={c.code} className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryStyle(c.code)}`}>
              {c.label}
            </span>
          ))}
          {availableCategories.length === 0 && (
            <span className="text-xs text-gray-400 italic">All categories used recently</span>
          )}
        </div>
        {coolingDown.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            {coolingDown.length} categor{coolingDown.length === 1 ? 'y' : 'ies'} cooling down (8-day window)
          </p>
        )}
      </div>

      {/* Maintenance Alerts */}
      {maintenance && <OverdueAlerts maintenance={maintenance} />}

      {/* Weekly Review */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setReviewOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-purple-600" />
            <span className="text-sm font-semibold text-gray-700">Weekly Review</span>
            {isSunday && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Review day!</span>}
            {weekOf && <span className="text-xs text-gray-400">{weekOf}</span>}
          </div>
          {reviewOpen ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </button>

        {reviewOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {reviewRows.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No meal plan data available.</p>
            ) : (
              <div className="space-y-2">
                {reviewRows.map((row, i) => {
                  const canRecycle = row.status !== 'match' && row.planned
                  const rd = recycleData[i]
                  return (
                    <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="flex items-start gap-2 text-sm p-2">
                        <span className="text-base leading-5 shrink-0 pt-0.5">
                          {row.status === 'match' ? '✅' : row.status === 'diff' ? '🔄' : '❌'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-800">{row.dayName}</span>
                            {row.isNewCook && <span className="text-xs text-green-600">🍳 cook</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {row.planned ? `Planned: ${row.planned}` : 'No plan'}
                            {row.cooked && row.status === 'diff' && ` → Made: ${row.cooked}`}
                            {!row.cooked && ' → Not logged'}
                          </p>
                          {row.rating > 0 && (
                            <p className="text-xs text-amber-500">{'\u2605'.repeat(row.rating)}{'\u2606'.repeat(5 - row.rating)}</p>
                          )}
                        </div>
                        {canRecycle && (
                          <button
                            type="button"
                            onClick={() => toggleRecycle(i, row.planned)}
                            className="shrink-0 flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 px-2 py-1 rounded-lg hover:bg-teal-50 border border-teal-200 transition-colors"
                            title="Check which ingredients you still have"
                          >
                            <Recycle size={11} />
                            <span>Recycle</span>
                          </button>
                        )}
                      </div>

                      {canRecycle && recycleOpen[i] && (
                        <div className="border-t border-gray-100 bg-teal-50 px-3 py-2 text-xs space-y-1.5">
                          {rd?.loading && (
                            <p className="text-teal-600 flex items-center gap-1"><RefreshCw size={10} className="animate-spin" /> Checking pantry…</p>
                          )}
                          {rd && !rd.loading && rd.matches.length > 0 && (
                            <>
                              <p className="text-teal-700 font-medium">You likely still have:</p>
                              <div className="flex flex-wrap gap-1">
                                {rd.matches.map(m => (
                                  <span key={m} className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full capitalize">{m}</span>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => { copyCarryover(row.planned); setCopied(i); setTimeout(() => setCopied(null), 2500) }}
                                className="mt-1 flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                              >
                                {copied === i ? '✔️ Copied!' : '📋 Copy carry-over note for HomeChef'}
                              </button>
                            </>
                          )}
                          {rd && !rd.loading && rd.matches.length === 0 && rd.ingredients.length > 0 && (
                            <p className="text-gray-500">No pantry matches found for this recipe.</p>
                          )}
                          {rd && !rd.loading && rd.ingredients.length === 0 && (
                            <p className="text-gray-500">Recipe file not found — can’t check ingredients.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {reviewRows.length > 0 && (
              <button
                type="button"
                onClick={saveReview}
                disabled={reviewSaving || reviewSaved}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
              >
                {reviewSaving ? <RefreshCw size={14} className="animate-spin" /> : <ClipboardList size={14} />}
                {reviewSaved ? '✔️ Saved for HomeChef' : reviewSaving ? 'Saving…' : 'Save Review for HomeChef'}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
