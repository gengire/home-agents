import { useState, useEffect, useCallback } from "react"
import { RefreshCw, PlusCircle, Pencil, Trash2, X, Check } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile, listFiles } from "../github/client"
import {
  parseCookLog,
  appendCookLogEntry,
  updateCookLogEntry,
  updateCookLogRating,
  deleteCookLogEntry,
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

function parseFeedback(feedback = '') {
  if (!feedback) return { makeAgain: null, noteText: '' }
  for (const label of ['Yes', 'Maybe', 'No']) {
    if (feedback === label) return { makeAgain: label, noteText: '' }
    if (feedback.startsWith(label + ' — ')) return { makeAgain: label, noteText: feedback.slice(label.length + 3) }
  }
  return { makeAgain: null, noteText: feedback }
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
  const [recipeFileMap, setRecipeFileMap] = useState({})

  // Form state
  const [date, setDate] = useState(todayISO())
  const [recipeName, setRecipeName] = useState("")
  const [category, setCategory] = useState("IND-L")
  const [notes, setNotes] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [ateOut, setAteOut] = useState(false)

  // Edit / delete state
  const [editingIndex, setEditingIndex] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [fetchingCategory, setFetchingCategory] = useState(false)

  // Rating state
  const [pendingRatings, setPendingRatings] = useState({})
  const [savingRating, setSavingRating] = useState(null)

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
      const fileMap = {}
      const names = recipeFiles
        .filter(f => f.name.endsWith(".txt"))
        .map(f => {
          const display = f.name.replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/\.txt$/, "").replace(/_/g, " ")
          fileMap[display] = f.name
          return display
        })
      setRecipeNames(names)
      setRecipeFileMap(fileMap)
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

  function resetForm() {
    setRecipeName("")
    setNotes("")
    setDate(todayISO())
    setCategory("IND-L")
    setEditingIndex(null)
    setAteOut(false)
  }

  async function handleRecipeSelect(name) {
    setRecipeName(name)
    setShowSuggestions(false)
    const filename = recipeFileMap[name]
    if (!filename) return
    setFetchingCategory(true)
    try {
      const { content } = await getFile(repo, `${RECIPES_PATH}/${filename}`)
      const match = content.match(/^Category:\s*([A-Z-]+)/m)
      if (match) setCategory(match[1].trim())
    } catch { /* silent — user can pick manually */ }
    finally { setFetchingCategory(false) }
  }

  async function handleLog(e) {
    e.preventDefault()
    if (!ateOut && !recipeName.trim()) return
    setSaving(true)
    try {
      const rawNotes = notes.trim()
      const notesValue = ateOut
        ? rawNotes ? `Ate Out — ${rawNotes}` : "Ate Out"
        : rawNotes
      const mealName = ateOut ? (recipeName.trim() || "Ate Out") : recipeName.trim()
      const existingEntry = editingIndex !== null ? entries[editingIndex] : null
      const entry = {
        date, recipeName: mealName, category, notes: notesValue,
        rating: existingEntry?.rating ?? '',
        feedback: existingEntry?.feedback ?? '',
      }
      const updated = editingIndex !== null
        ? updateCookLogEntry(rawMarkdown, editingIndex, entry)
        : appendCookLogEntry(rawMarkdown, entry)
      const msg = editingIndex !== null
        ? `Cook log edit — ${entry.recipeName} ${entry.date}`
        : `Cook log — ${entry.recipeName} ${entry.date}`
      await updateFile(repo, LOG_PATH, updated, sha, msg)
      const { content: fresh, sha: newSha } = await getFile(repo, LOG_PATH)
      setRawMarkdown(fresh)
      setSha(newSha)
      setEntries(parseCookLog(fresh))
      resetForm()
      setToast({ message: editingIndex !== null ? "✅ Entry updated!" : "✅ Meal logged!", type: "success" })
    } catch {
      setToast({ message: "❌ Save failed. Check your connection.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(entryIndex) {
    const e = entries[entryIndex]
    const isAteOut = e.notes.startsWith("Ate Out")
    setDate(e.date)
    setRecipeName(e.recipeName)
    setCategory(e.category)
    setNotes(isAteOut ? e.notes.replace(/^Ate Out(?:\s*—\s*)?/, "") : e.notes)
    setAteOut(isAteOut)
    setEditingIndex(entryIndex)
    setDeleteConfirm(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function handleDelete(entryIndex) {
    setSaving(true)
    try {
      const updated = deleteCookLogEntry(rawMarkdown, entryIndex)
      await updateFile(repo, LOG_PATH, updated, sha, `Cook log delete — ${entries[entryIndex].recipeName}`)
      const { content: fresh, sha: newSha } = await getFile(repo, LOG_PATH)
      setRawMarkdown(fresh)
      setSha(newSha)
      setEntries(parseCookLog(fresh))
      setDeleteConfirm(null)
      if (editingIndex === entryIndex) resetForm()
      setToast({ message: "🗑️ Entry deleted", type: "success" })
    } catch {
      setToast({ message: "❌ Delete failed.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function saveRating(origIndex) {
    const entry = entries[origIndex]
    const pending = pendingRatings[origIndex] || {}
    const { makeAgain: parsedMakeAgain, noteText: parsedNote } = parseFeedback(entry.feedback)
    const makeAgain = pending.makeAgain !== undefined ? pending.makeAgain : parsedMakeAgain
    const noteText = pending.noteText !== undefined ? pending.noteText : parsedNote
    const rating = pending.rating !== undefined ? pending.rating : (entry.rating || null)
    const feedbackStr = makeAgain
      ? (noteText.trim() ? `${makeAgain} — ${noteText.trim()}` : makeAgain)
      : noteText.trim()
    setSavingRating(origIndex)
    try {
      const updated = updateCookLogRating(rawMarkdown, origIndex, { rating: rating ?? '', feedback: feedbackStr })
      await updateFile(repo, LOG_PATH, updated, sha, `Cook log rating — ${entry.recipeName}`)
      const { content: fresh, sha: newSha } = await getFile(repo, LOG_PATH)
      setRawMarkdown(fresh)
      setSha(newSha)
      setEntries(parseCookLog(fresh))
      setPendingRatings(prev => { const n = { ...prev }; delete n[origIndex]; return n })
      setToast({ message: '⭐ Rating saved!', type: 'success' })
    } catch {
      setToast({ message: '❌ Rating save failed.', type: 'error' })
    } finally {
      setSavingRating(null)
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            {editingIndex !== null ? "Edit entry" : "Log a meal"}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setAteOut(v => !v); setRecipeName(""); setShowSuggestions(false) }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                ateOut
                  ? "bg-amber-100 text-amber-700 border-amber-300"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              }`}
            >
              🍽️ {ateOut ? "Ate Out" : "Ate Out?"}
            </button>
            {editingIndex !== null && (
              <button
                type="button"
                onClick={() => { resetForm(); setDeleteConfirm(null) }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X size={13} /> Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="block text-xs text-gray-500 mb-1">{ateOut ? "Cuisine Type" : "Category"}</label>
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

        {ateOut ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cuisine / Restaurant (optional)</label>
            <input
              type="text"
              value={recipeName}
              onChange={e => setRecipeName(e.target.value)}
              placeholder="e.g. Sushi Palace, Italian, Tacos"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        ) : (
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
                  onMouseDown={() => handleRecipeSelect(s)}
                >
                  {s}
                </li>
              ))}
            </ul>
          )}
          {fetchingCategory && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <RefreshCw size={11} className="animate-spin" /> Loading category…
            </p>
          )}
        </div>
        )}

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
          disabled={saving || (!ateOut && !recipeName.trim())}
          className={`w-full flex items-center justify-center gap-2 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors ${
            ateOut ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <PlusCircle size={16} />
          {saving ? (editingIndex !== null ? "Saving…" : "Logging…") : (editingIndex !== null ? "Save Changes" : (ateOut ? "Log Ate Out" : "Log It"))}
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
            {recentEntries.map((entry, i) => {
              // recentEntries is reversed; find orignal index in entries array
              const origIndex = entries.indexOf(entry)
              const isEditing = editingIndex === origIndex
              const { makeAgain: parsedMakeAgain, noteText: parsedNote } = parseFeedback(entry.feedback)
              const pending = pendingRatings[origIndex] || {}
              const effectiveRating = pending.rating !== undefined ? pending.rating : (entry.rating || 0)
              const effectiveMakeAgain = pending.makeAgain !== undefined ? pending.makeAgain : parsedMakeAgain
              const effectiveNote = pending.noteText !== undefined ? pending.noteText : parsedNote
              const hasChanges = Object.keys(pending).length > 0
              const isSaving = savingRating === origIndex
              return (
                <div
                  key={i}
                  className={`bg-white rounded-xl border px-4 py-3 ${
                    isEditing ? "border-green-400 ring-1 ring-green-300" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {entry.notes.startsWith("Ate Out") && <span title="Ate out">🍽️</span>}
                        <p className="text-sm font-medium text-gray-900 truncate">{entry.recipeName}</p>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryStyle(entry.category)}`}>
                        {entry.category}
                      </span>
                      <span className="text-xs text-gray-400">{entry.date}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          onClick={() => handleEdit(origIndex)}
                          className="text-gray-400 hover:text-blue-500 p-0.5"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        {deleteConfirm === origIndex ? (
                          <>
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDelete(origIndex)}
                              disabled={saving}
                              className="text-red-500 hover:text-red-700 p-0.5 disabled:opacity-50"
                              title="Confirm delete"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-gray-400 hover:text-gray-600 p-0.5"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(origIndex)}
                            className="text-gray-400 hover:text-red-500 p-0.5"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating panel */}
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setPendingRatings(prev => ({ ...prev, [origIndex]: { ...(prev[origIndex] || {}), rating: star } }))}
                          className={`text-xl leading-none transition-colors ${star <= effectiveRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-200'}`}
                          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                        >★</button>
                      ))}
                      {effectiveRating > 0 && (
                        <span className="text-xs text-gray-400 ml-1.5">{effectiveRating}/5</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {[{label:'Yes',icon:'✅'},{label:'Maybe',icon:'🤔'},{label:'No',icon:'❌'}].map(({label, icon}) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setPendingRatings(prev => ({
                            ...prev,
                            [origIndex]: { ...(prev[origIndex] || {}), makeAgain: effectiveMakeAgain === label ? null : label }
                          }))}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            effectiveMakeAgain === label
                              ? 'bg-green-50 border-green-400 text-green-700 font-medium'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >{icon} {label}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={effectiveNote}
                        onChange={e => setPendingRatings(prev => ({ ...prev, [origIndex]: { ...(prev[origIndex] || {}), noteText: e.target.value } }))}
                        placeholder="Feedback (e.g. needed more spice)"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                      {hasChanges && (
                        <button
                          type="button"
                          onClick={() => saveRating(origIndex)}
                          disabled={isSaving}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 flex-shrink-0"
                        >{isSaving ? 'Saving…' : 'Save'}</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
