import { useState, useEffect, useCallback } from "react"
import { RefreshCw, PlusCircle } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile, listFiles } from "../github/client"
import {
  parseCookLog,
  appendCookLogEntry,
  CATEGORIES,
  getCategoryStyle,
  getRecentCategories,
} from "../utils/cookLogParser"
import Toast from "../components/Toast"

const LOG_PATH = "data/cook-log.md"
const RECIPES_PATH = "recipes"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function CookLog() {
  const { repo } = useApp()
  const [entries, setEntries] = useState([])
  const [sha, setSha] = useState(null)
  const [rawMarkdown, setRawMarkdown] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [recipeNames, setRecipeNames] = useState([])

  // Form state
  const [date, setDate] = useState(todayISO())
  const [recipeName, setRecipeName] = useState("")
  const [category, setCategory] = useState("IND-L")
  const [notes, setNotes] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ content, sha: fileSha }, recipeFiles] = await Promise.all([
        getFile(repo, LOG_PATH),
        listFiles(repo, RECIPES_PATH).catch(() => []),
      ])
      setRawMarkdown(content)
      setSha(fileSha)
      setEntries(parseCookLog(content))
      // Extract recipe names from filenames: "2026-05-02_Red_Lentil_Dal.txt" -> "Red Lentil Dal"
      const names = recipeFiles
        .filter(f => f.name.endsWith(".txt"))
        .map(f => f.name.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.txt$/, "").replace(/_/g, " "))
      setRecipeNames(names)
    } catch {
      setToast({ message: "Failed to load cook log.", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  const suggestions = recipeName.length > 0
    ? recipeNames.filter(n => n.toLowerCase().includes(recipeName.toLowerCase()))
    : []

  async function handleLog(e) {
    e.preventDefault()
    if (!recipeName.trim()) return
    setSaving(true)
    try {
      const updated = appendCookLogEntry(rawMarkdown, { date, recipeName: recipeName.trim(), category, notes: notes.trim() })
      await updateFile(repo, LOG_PATH, updated, sha, `Cook log — ${recipeName.trim()} ${date}`)
      const { content: fresh, sha: newSha } = await getFile(repo, LOG_PATH)
      setRawMarkdown(fresh)
      setSha(newSha)
      setEntries(parseCookLog(fresh))
      setRecipeName("")
      setNotes("")
      setDate(todayISO())
      setToast({ message: "✅ Meal logged!", type: "success" })
    } catch {
      setToast({ message: "❌ Save failed. Check your connection.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const recentCats = getRecentCategories(entries, 8)

  // Recent entries = last 14 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 14)
  const recentEntries = [...entries]
    .filter(e => new Date(e.date) >= cutoff)
    .reverse()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 pb-24">

      {/* Log entry form */}
      <form onSubmit={handleLog} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Log a meal</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs text-gray-500 mb-1">Recipe name</label>
          <input
            type="text"
            value={recipeName}
            onChange={e => { setRecipeName(e.target.value); setShowSuggestions(true) }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="e.g. Red Lentil Dal"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto">
              {suggestions.map(s => (
                <li
                  key={s}
                  className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  onMouseDown={() => { setRecipeName(s); setShowSuggestions(false) }}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Doubled the batch"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !recipeName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
        >
          <PlusCircle size={16} />
          {saving ? "Logging…" : "Log It"}
        </button>
      </form>

      {/* Category rotation indicator */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Category Rotation</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => {
            const cooling = recentCats.has(cat.code)
            return (
              <span
                key={cat.code}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  cooling
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-green-50 text-green-700 border-green-200"
                }`}
                title={cooling ? "Used in last 8 days — avoid" : "Available"}
              >
                {cat.code} {cooling ? "⏸" : "✓"}
              </span>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">⏸ = used within 8 days &nbsp; ✓ = available</p>
      </div>

      {/* Recent entries */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Recent (14 days)</h3>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">No meals logged in the last 14 days.</p>
            <p className="text-xs text-gray-300 mt-1">Log your first meal above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{entry.recipeName}</p>
                  {entry.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryStyle(entry.category)}`}>
                    {entry.category}
                  </span>
                  <span className="text-xs text-gray-400">{entry.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
