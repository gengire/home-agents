import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw, TrendingUp } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, listFiles } from "../github/client"
import { parseCookLog } from "../utils/cookLogParser"

const RECIPES_PATH = "recipes"
const LOG_PATH = "data/cook-log.md"

// Pritikin per-serving targets
const TARGETS = {
  calories: { min: 350, max: 500, unit: "kcal", label: "Calories" },
  fat:      { max: 6,             unit: "g",    label: "Fat" },
  fiber:    { min: 6,             unit: "g",    label: "Fiber" },
  protein:  { min: 20,            unit: "g",    label: "Protein" },
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
    servings: (content.match(/Servings:\s*([^\n]+)/i) || [])[1]?.trim() || null,
  }
}

/** Get a recipe display name from a filename. */
function nameFromFilename(filename) {
  return filename.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.txt$/, "").replace(/_/g, " ")
}

// ── Metric bar ─────────────────────────────────────────────────────────────

function MetricBar({ label, value, unit, min, max }) {
  if (value == null) return null

  // Determine colour + fill %
  let colour, fill
  if (label === "Calories") {
    const ok = value >= min && value <= max
    const over = value > max
    colour = ok ? "bg-green-500" : over ? "bg-red-400" : "bg-amber-400"
    fill = Math.min(100, (value / 600) * 100)
  } else if (label === "Fat") {
    colour = value <= max ? "bg-green-500" : value <= max * 1.5 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 15) * 100)
  } else if (label === "Fiber") {
    colour = value >= min ? "bg-green-500" : value >= min * 0.5 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 12) * 100)
  } else {  // Protein
    colour = value >= min ? "bg-green-500" : value >= min * 0.6 ? "bg-amber-400" : "bg-red-400"
    fill = Math.min(100, (value / 40) * 100)
  }

  const targetLabel = max && min
    ? `${min}–${max} ${unit}`
    : max
      ? `≤${max} ${unit}`
      : `≥${min} ${unit}`

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

// ── Summary pill ────────────────────────────────────────────────────────────

function SummaryPill({ label, value, unit, isGood }) {
  return (
    <div className={`flex-1 rounded-xl px-3 py-2 text-center border ${isGood ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <p className={`text-lg font-bold ${isGood ? 'text-green-700' : 'text-amber-700'}`}>{value ?? '—'}{value != null ? unit : ''}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

// ── Compliance badge ─────────────────────────────────────────────────────────

function ComplianceBadge({ nutrition }) {
  if (!nutrition) return null
  const checks = [
    nutrition.calories >= 350 && nutrition.calories <= 500,
    nutrition.fat != null && nutrition.fat <= 6,
    nutrition.fiber != null && nutrition.fiber >= 6,
    nutrition.protein != null && nutrition.protein >= 20,
  ].filter(c => c !== null)
  const pass = checks.filter(Boolean).length
  const total = checks.length
  const pct = total ? Math.round((pass / total) * 100) : 0
  const colour = pct >= 75 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colour}`}>
      {pass}/{total} targets
    </span>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HealthTrends() {
  const { repo } = useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState([])   // [{ name, nutrition, cookCount, category }]
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [recipeFiles, { content: logContent }] = await Promise.all([
        listFiles(repo, RECIPES_PATH).catch(() => []),
        getFile(repo, LOG_PATH).catch(() => ({ content: '' })),
      ])

      // Build cook count map from cook-log
      const cookCount = {}
      if (logContent) {
        const entries = parseCookLog(logContent)
        entries.forEach(e => {
          if (!e.notes.startsWith('Ate Out')) {
            cookCount[e.recipeName] = (cookCount[e.recipeName] || 0) + 1
          }
        })
      }

      // Fetch up to 20 recipe files
      const txtFiles = recipeFiles.filter(f => f.name.endsWith('.txt')).slice(0, 20)
      const results = await Promise.allSettled(
        txtFiles.map(f => getFile(repo, `${RECIPES_PATH}/${f.name}`))
      )

      const parsed = results
        .map((res, i) => {
          if (res.status !== 'fulfilled') return null
          const content = res.value.content
          const name = nameFromFilename(txtFiles[i].name)
          const nutrition = parseNutrition(content)
          const categoryLine = content.match(/Category:\s*([^\n]+)/i)
          const category = categoryLine ? categoryLine[1].trim() : null
          return { name, nutrition, cookCount: cookCount[name] || 0, category }
        })
        .filter(Boolean)
        .sort((a, b) => (b.cookCount - a.cookCount) || a.name.localeCompare(b.name))

      setRecipes(parsed)
    } catch (e) {
      setError("Failed to load nutrition data.")
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  // Averages across recipes that have nutrition data
  const withNutrition = recipes.filter(r => r.nutrition)
  const avg = (key) => {
    const vals = withNutrition.map(r => r.nutrition[key]).filter(v => v != null)
    if (!vals.length) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }
  const avgCal    = avg('calories')
  const avgFat    = avg('fat')
  const avgFiber  = avg('fiber')
  const avgProtein = avg('protein')

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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Nutrition Targets</h2>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Pritikin target legend */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-xs text-green-800 space-y-0.5">
        <p className="font-semibold mb-1">Pritikin per-serving targets</p>
        <p>⚡ Calories: 350–500 kcal &nbsp;·&nbsp; 🥑 Fat: ≤6 g &nbsp;·&nbsp; 🌾 Fiber: ≥6 g &nbsp;·&nbsp; 💪 Protein: ≥20 g</p>
      </div>

      {/* Averages summary */}
      {withNutrition.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">Avg across {withNutrition.length} recipe{withNutrition.length !== 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <SummaryPill label="Calories" value={avgCal}    unit=" kcal" isGood={avgCal    != null && avgCal >= 350 && avgCal <= 500} />
            <SummaryPill label="Fat"      value={avgFat}    unit="g"     isGood={avgFat     != null && avgFat <= 6} />
            <SummaryPill label="Fiber"    value={avgFiber}  unit="g"     isGood={avgFiber   != null && avgFiber >= 6} />
            <SummaryPill label="Protein"  value={avgProtein} unit="g"   isGood={avgProtein  != null && avgProtein >= 20} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Recipe cards */}
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
        <p className="text-xs text-gray-400 text-center">Showing up to 20 recipes · Per-serving values from recipe files</p>
      )}
    </div>
  )
}
