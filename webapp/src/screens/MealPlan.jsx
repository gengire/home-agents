import { useState, useEffect, useCallback } from "react"
import { RefreshCw, ChefHat, Repeat2, CalendarDays } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile } from "../github/client"
import {
  parseMealPlan,
  parseDayLines,
  extractCategoryFromValue,
  extractCookTime,
  cleanValue,
} from "../utils/mealPlanParser"
import { getCategoryStyle } from "../utils/cookLogParser"
import Toast from "../components/Toast"

const PLAN_PATH = "data/meal-plan.md"

function FieldRow({ label, value }) {
  const cat = extractCategoryFromValue(value)
  const time = extractCookTime(value)
  const clean = cleanValue(value)
  return (
    <div className="py-1.5">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
        <span className="text-sm text-gray-800">{clean}</span>
        {cat && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryStyle(cat)}`}>
            {cat}
          </span>
        )}
        {time && (
          <span className="text-xs text-gray-400">{time}</span>
        )}
      </div>
    </div>
  )
}

function DayCard({ day }) {
  const fields = parseDayLines(day.lines)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className={`px-4 py-3 flex items-center justify-between ${day.isNewCook ? "bg-green-50 border-b border-green-100" : "bg-gray-50 border-b border-gray-100"}`}>
        <h3 className="text-sm font-bold text-gray-900">{day.heading}</h3>
        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${day.isNewCook ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
          {day.isNewCook
            ? <><ChefHat size={11} /> {day.isBatch ? "BATCH DAY" : "NEW COOK"}</>
            : <><Repeat2 size={11} /> LEFTOVERS</>
          }
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 pt-2 pb-3 divide-y divide-gray-50">
        {fields.map((f, i) => {
          if (f.type === "field") return <FieldRow key={i} label={f.label} value={f.value} />
          if (f.type === "note") return (
            <p key={i} className="text-xs text-gray-400 italic pt-2">{f.value}</p>
          )
          return null
        })}
      </div>
    </div>
  )
}

export default function MealPlan() {
  const { repo } = useApp()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showShopping, setShowShopping] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { content } = await getFile(repo, PLAN_PATH)
      setPlan(parseMealPlan(content))
    } catch {
      setToast({ message: "Failed to load meal plan.", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!plan || plan.days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-8 text-center">
        <CalendarDays size={36} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No meal plan yet.</p>
        <p className="text-xs text-gray-400 mt-1">Ask HomeChef in VS Code to generate one.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Meta header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700">{plan.weekOf}</p>
          <p className="text-xs text-gray-400">Generated {plan.lastGenerated}</p>
        </div>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Prep Strategy banner */}
      {plan.prepStrategy && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">Prep Strategy</p>
          {plan.prepStrategy.split("\n").filter(l => l.trim()).map((line, i) => {
            // Bold headings like "**Sunday (today...):**"
            const headingMatch = line.match(/^\*\*(.+)\*\*:?$/)
            if (headingMatch) return (
              <p key={i} className="text-xs font-semibold text-amber-800 mt-2">{headingMatch[1]}</p>
            )
            // Bullet items
            if (line.startsWith("- ")) return (
              <p key={i} className="text-xs text-amber-700 ml-2">• {line.slice(2)}</p>
            )
            return <p key={i} className="text-xs text-amber-700">{line}</p>
          })}
        </div>
      )}

      {/* Day cards */}
      {plan.days.map((day, i) => (
        <DayCard key={i} day={day} />
      ))}

      {/* Desserts section */}
      {plan.desserts && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">Desserts This Week</p>
          {plan.desserts.split("\n").filter(l => l.trim() && !l.startsWith("|---")).map((line, i) => {
            if (line.startsWith("|") && !line.includes("When")) {
              const cols = line.split("|").map(c => c.trim()).filter(Boolean)
              if (cols.length >= 3) return (
                <div key={i} className="flex items-baseline gap-2 mt-1">
                  <span className="text-xs font-semibold text-pink-700 w-16 flex-shrink-0">{cols[0]}</span>
                  <span className="text-xs text-pink-800">{cols[1]}</span>
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      {/* Shopping list toggle */}
      {plan.shoppingList && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowShopping(s => !s)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-800"
          >
            Shopping List
            <span className="text-gray-400 text-xs">{showShopping ? "▲ hide" : "▼ show"}</span>
          </button>
          {showShopping && (
            <div className="px-4 pb-4 space-y-1 border-t border-gray-100">
              {plan.shoppingList.split("\n").filter(l => l.trim()).map((line, i) => {
                if (line.startsWith("### ")) return (
                  <p key={i} className="text-xs font-bold text-gray-600 mt-3 mb-1">{line.slice(4)}</p>
                )
                if (line.startsWith("- [ ] ") || line.startsWith("- ")) return (
                  <p key={i} className="text-sm text-gray-700">• {line.replace(/^- \[.\] /, "").replace(/^- /, "")}</p>
                )
                return <p key={i} className="text-xs text-gray-400">{line}</p>
              })}
            </div>
          )}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
