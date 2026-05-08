import { useState, useEffect, useCallback } from "react"
import { RefreshCw, PlusCircle, Pencil, Trash2, X, Check, PlusSquare, ChevronDown, ChevronUp } from "lucide-react"
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
  serializeDeviations,
  parseDeviations,
} from "../utils/cookLogParser"
import Toast from "../components/Toast"
import MicButton from "../components/MicButton"

const LOG_PATH = "data/cook-log.md"
const RECIPES_PATH = "recipes"
const NOTES_PATH = "data/recipe-notes.json"

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

  // Form rating state (log + edit)
  const [formRating, setFormRating] = useState(0)
  const [formMakeAgain, setFormMakeAgain] = useState(null)
  const [formPrepTime, setFormPrepTime] = useState('')

  // Deviation form state
  const [devPref, setDevPref] = useState(false)
  const [devSub, setDevSub] = useState(false)
  const [prefChanges, setPrefChanges] = useState([{ what: '', why: '' }])
  const [subs, setSubs] = useState([{ used: '', original: '' }])

  // Edit / delete state
  const [editingIndex, setEditingIndex] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [fetchingCategory, setFetchingCategory] = useState(false)

  // History card rating state
  const [pendingRatings, setPendingRatings] = useState({})
  const [savingRating, setSavingRating] = useState(null)

  // Recipe iteration notes
  const [recipeNotes, setRecipeNotes] = useState({})      // { recipeName: { iterations: [...] } }
  const [recipeNotesSha, setRecipeNotesSha] = useState(undefined)
  const [expandedNotes, setExpandedNotes] = useState({})  // { entryIndex: bool }
  const [evolutionRecipe, setEvolutionRecipe] = useState(null)  // recipe name for Evolution modal

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

      // Load recipe-notes.json (non-fatal if missing)
      try {
        const { content: notesContent, sha: notesSha } = await getFile(repo, NOTES_PATH)
        setRecipeNotes(JSON.parse(notesContent || '{}'))
        setRecipeNotesSha(notesSha)
      } catch {
        setRecipeNotes({})
        setRecipeNotesSha(undefined)
      }
    } catch {
      setToast({ message: "Failed to load cook log.", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  /** Upsert an iteration note for a recipe into recipe-notes.json */
  async function upsertRecipeNote({ recipeName, date, rating, makeAgain, noteText }) {
    if (!noteText.trim()) return  // nothing to record
    try {
      const current = structuredClone(recipeNotes)
      if (!current[recipeName]) current[recipeName] = { iterations: [] }
      current[recipeName].iterations.push({ date, rating: rating || null, makeAgain: makeAgain || null, note: noteText.trim() })
      const json = JSON.stringify(current, null, 2)
      await updateFile(repo, NOTES_PATH, json, recipeNotesSha, `Recipe notes — ${recipeName} ${date}`)
      // Refresh sha
      const { sha: newSha } = await getFile(repo, NOTES_PATH)
      setRecipeNotesSha(newSha)
      setRecipeNotes(current)
    } catch { /* silent — note write failure should not block the main save */ }
  }

  /** Accumulate deviation data into recipe-notes.json */
  async function upsertDeviations({ recipeName, date, rating, prefs = [], subs: subList = [] }) {
    if (!prefs.length && !subList.length) return
    try {
      // Re-fetch to get latest sha (avoids collision with upsertRecipeNote)
      let current = structuredClone(recipeNotes)
      let latestSha = recipeNotesSha
      try {
        const { content: fresh, sha: freshSha } = await getFile(repo, NOTES_PATH)
        current = JSON.parse(fresh || '{}')
        latestSha = freshSha
      } catch { /* use in-memory copy */ }

      if (!current[recipeName]) current[recipeName] = {}
      const rec = current[recipeName]

      // Preference changes
      if (!rec.preferenceChanges) rec.preferenceChanges = []
      for (const p of prefs) {
        const key = p.what.trim().toLowerCase()
        const existing = rec.preferenceChanges.find(x => x.change.toLowerCase() === key)
        if (existing) {
          existing.count = (existing.count || 1) + 1
          if (rating) existing.lastRating = rating
          if (existing.count >= 2) existing.suggestPermanentUpdate = true
        } else {
          rec.preferenceChanges.push({ change: p.what.trim(), reason: p.why.trim(), count: 1, lastRating: rating || null })
        }
      }

      // Substitutions
      if (!rec.substitutions) rec.substitutions = []
      for (const s of subList) {
        const keyUsed = s.used.trim().toLowerCase()
        const keyOrig = s.original.trim().toLowerCase()
        const existing = rec.substitutions.find(x => x.usedIngredient.toLowerCase() === keyUsed && x.originalIngredient.toLowerCase() === keyOrig)
        if (existing) {
          const prevCount = existing.count || 1
          existing.count = prevCount + 1
          if (rating) existing.avgRating = Math.round(((existing.avgRating || rating) * prevCount + rating) / (prevCount + 1) * 10) / 10
          if (existing.count >= 2 && (existing.avgRating || 0) >= 4) existing.provenSubstitute = true
        } else {
          rec.substitutions.push({ usedIngredient: s.used.trim(), originalIngredient: s.original.trim(), count: 1, avgRating: rating || null })
        }
      }

      const json = JSON.stringify(current, null, 2)
      await updateFile(repo, NOTES_PATH, json, latestSha, `Recipe deviations — ${recipeName} ${date}`)
      const { sha: newSha } = await getFile(repo, NOTES_PATH)
      setRecipeNotesSha(newSha)
      setRecipeNotes(current)
    } catch { /* silent */ }
  }

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
    setFormRating(0)
    setFormMakeAgain(null)
    setFormPrepTime('')
    setDevPref(false)
    setDevSub(false)
    setPrefChanges([{ what: '', why: '' }])
    setSubs([{ used: '', original: '' }])
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
      const formFeedback = formMakeAgain
        ? (rawNotes ? `${formMakeAgain} — ${rawNotes}` : formMakeAgain)
        : ''
      const entry = {
        date, recipeName: mealName, category, notes: notesValue,
        rating: formRating || '',
        feedback: formFeedback,
        prepTime: formPrepTime ? parseInt(formPrepTime, 10) : '',
        deviations: (!ateOut && (devPref || devSub)) ? serializeDeviations({
          prefs: devPref ? prefChanges : [],
          subs: devSub ? subs : [],
        }) : '',
      }
      const updated = editingIndex !== null
        ? updateCookLogEntry(rawMarkdown, editingIndex, entry)
        : appendCookLogEntry(rawMarkdown, entry)
      const msg = editingIndex !== null
        ? `Cook log edit — ${entry.recipeName} ${entry.date}`
        : `Cook log — ${entry.recipeName} ${entry.date}`
      await updateFile(repo, LOG_PATH, updated, sha, msg)
      // Write iteration note if a note was entered with a rating
      if (!ateOut && formRating && rawNotes) {
        await upsertRecipeNote({ recipeName: mealName, date, rating: formRating, makeAgain: formMakeAgain, noteText: rawNotes })
      }
      // Accumulate deviations into recipe-notes.json
      if (!ateOut && (devPref || devSub)) {
        await upsertDeviations({
          recipeName: mealName, date, rating: formRating || null,
          prefs: devPref ? prefChanges.filter(p => p.what.trim()) : [],
          subs: devSub ? subs.filter(s => s.used.trim() && s.original.trim()) : [],
        })
      }
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
    const { makeAgain: ma, noteText: nt } = parseFeedback(e.feedback)
    setDate(e.date)
    setRecipeName(e.recipeName)
    setCategory(e.category)
    setNotes(isAteOut ? e.notes.replace(/^Ate Out(?:\s*—\s*)?/, "") : e.notes)
    setAteOut(isAteOut)
    setFormRating(e.rating || 0)
    setFormMakeAgain(ma)
    setFormPrepTime(e.prepTime ? String(e.prepTime) : '')
    // Pre-fill deviations
    const { prefs: ep, subs: es } = parseDeviations(e.deviations || '')
    setDevPref(ep.length > 0)
    setDevSub(es.length > 0)
    setPrefChanges(ep.length > 0 ? ep : [{ what: '', why: '' }])
    setSubs(es.length > 0 ? es : [{ used: '', original: '' }])
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

  async function saveRating(origIndex, overrides = {}) {
    const entry = entries[origIndex]
    const pending = pendingRatings[origIndex] || {}
    const { makeAgain: parsedMakeAgain, noteText: parsedNote } = parseFeedback(entry.feedback)
    const makeAgain = 'makeAgain' in overrides ? overrides.makeAgain
                    : 'makeAgain' in pending   ? pending.makeAgain
                    : parsedMakeAgain
    const noteText  = 'noteText' in overrides  ? overrides.noteText
                    : 'noteText' in pending    ? pending.noteText
                    : parsedNote
    const rating    = 'rating' in overrides    ? overrides.rating
                    : 'rating' in pending      ? pending.rating
                    : (entry.rating || null)
    const feedbackStr = makeAgain
      ? (noteText.trim() ? `${makeAgain} — ${noteText.trim()}` : makeAgain)
      : noteText.trim()
    setSavingRating(origIndex)
    try {
      const updated = updateCookLogRating(rawMarkdown, origIndex, { rating: rating ?? '', feedback: feedbackStr })
      await updateFile(repo, LOG_PATH, updated, sha, `Cook log rating — ${entry.recipeName}`)
      // Write iteration note if noteText was set
      if (noteText.trim()) {
        await upsertRecipeNote({ recipeName: entry.recipeName, date: entry.date, rating: rating || null, makeAgain, noteText })
      }
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

        {/* Prep time — inline narrow field, only for home-cooked meals */}
        {!ateOut && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 shrink-0">⏱ Actual cook time</label>
            <input
              type="number"
              min="0"
              max="480"
              value={formPrepTime}
              onChange={e => setFormPrepTime(e.target.value)}
              placeholder="min"
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-xs text-gray-400">minutes (optional)</span>
          </div>
        )}

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
          <label className="block text-xs text-gray-500 mb-1">Notes &amp; feedback (optional)</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={formMakeAgain ? `e.g. needed more spice, too salty…` : `e.g. Doubled the batch, needed more spice`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <MicButton value={notes} onChange={setNotes} disabled={saving} />
          </div>
        </div>

        {/* How did you make it? — hidden for Ate Out */}
        {!ateOut && (
          <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600">How did you make it?</p>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={devPref} onChange={e => setDevPref(e.target.checked)} className="rounded accent-orange-500" />
                Preference changes
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" checked={devSub} onChange={e => setDevSub(e.target.checked)} className="rounded accent-blue-500" />
                Used substitutes
              </label>
            </div>

            {devPref && (
              <div className="space-y-2">
                <p className="text-xs text-orange-700 font-medium">Preference changes — what you changed &amp; why</p>
                {prefChanges.map((row, idx) => (
                  <div key={idx} className="flex gap-1.5 items-start">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={row.what}
                        onChange={e => setPrefChanges(prev => prev.map((r, i) => i === idx ? { ...r, what: e.target.value } : r))}
                        placeholder="What you changed"
                        className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                      />
                      <input
                        type="text"
                        value={row.why}
                        onChange={e => setPrefChanges(prev => prev.map((r, i) => i === idx ? { ...r, why: e.target.value } : r))}
                        placeholder="Why / notes (optional)"
                        className="w-full text-xs border border-orange-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white"
                      />
                    </div>
                    {prefChanges.length > 1 && (
                      <button type="button" onClick={() => setPrefChanges(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-400 mt-1 shrink-0"><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setPrefChanges(prev => [...prev, { what: '', why: '' }])} className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800">
                  <PlusSquare size={13} /> Add another change
                </button>
              </div>
            )}

            {devSub && (
              <div className="space-y-2">
                <p className="text-xs text-blue-700 font-medium">Substitutes — what you used &amp; what it replaced</p>
                {subs.map((row, idx) => (
                  <div key={idx} className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      value={row.used}
                      onChange={e => setSubs(prev => prev.map((r, i) => i === idx ? { ...r, used: e.target.value } : r))}
                      placeholder="Used instead of"
                      className="flex-1 text-xs border border-blue-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    />
                    <span className="text-xs text-gray-400 shrink-0">for</span>
                    <input
                      type="text"
                      value={row.original}
                      onChange={e => setSubs(prev => prev.map((r, i) => i === idx ? { ...r, original: e.target.value } : r))}
                      placeholder="In place of"
                      className="flex-1 text-xs border border-blue-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                    />
                    {subs.length > 1 && (
                      <button type="button" onClick={() => setSubs(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-400 shrink-0"><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setSubs(prev => [...prev, { used: '', original: '' }])} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                  <PlusSquare size={13} /> Add another substitute
                </button>
              </div>
            )}

            {!devPref && !devSub && (
              <p className="text-xs text-gray-400 italic">Check a box above to log how you modified the recipe.</p>
            )}
          </div>
        )}

        {/* Inline rating */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <p className="text-xs text-gray-500 font-medium">How was it? (optional)</p>
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setFormRating(prev => prev === star ? 0 : star)}
                className={`text-3xl leading-none transition-colors ${
                  star <= formRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'
                }`}
                aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              >★</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {[{label:'Yes',icon:'✅'},{label:'Maybe',icon:'🤔'},{label:'No',icon:'❌'}].map(({label, icon}) => (
              <button
                key={label}
                type="button"
                onClick={() => setFormMakeAgain(prev => prev === label ? null : label)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  formMakeAgain === label
                    ? 'bg-green-50 border-green-400 text-green-700 font-semibold'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >{icon} {label}</button>
            ))}
          </div>
          {formMakeAgain && (
            <p className="text-xs text-gray-400">Your note above will be saved with this rating.</p>
          )}
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
              const effectiveRating = 'rating' in pending ? pending.rating : (entry.rating || 0)
              const effectiveMakeAgain = 'makeAgain' in pending ? pending.makeAgain : parsedMakeAgain
              const effectiveNote = 'noteText' in pending ? pending.noteText : parsedNote
              const hasNoteChange = 'noteText' in pending
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
                        <button
                          type="button"
                          onClick={() => !entry.notes.startsWith("Ate Out") && setEvolutionRecipe(entry.recipeName)}
                          className={`text-sm font-medium text-gray-900 truncate text-left ${!entry.notes.startsWith("Ate Out") ? 'hover:text-green-700 hover:underline cursor-pointer' : ''}`}
                          title={!entry.notes.startsWith("Ate Out") ? "View recipe evolution" : undefined}
                        >{entry.recipeName}</button>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.notes}</p>
                      )}
                      {entry.deviations && (
                        <DevBadge deviations={entry.deviations} />
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
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                    {/* Stars */}
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            const newRating = star === effectiveRating ? 0 : star
                            setPendingRatings(prev => ({ ...prev, [origIndex]: { ...(prev[origIndex] || {}), rating: newRating } }))
                            saveRating(origIndex, { rating: newRating })
                          }}
                          className={`text-2xl leading-none transition-colors touch-manipulation ${
                            star <= effectiveRating ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300'
                          } disabled:opacity-40`}
                          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                        >★</button>
                      ))}
                      {isSaving && <span className="text-xs text-gray-400 ml-1 animate-pulse">saving…</span>}
                    </div>
                    {/* Would make again */}
                    <div className="flex items-center gap-2">
                      {[{label:'Yes',icon:'✅'},{label:'Maybe',icon:'🤔'},{label:'No',icon:'❌'}].map(({label, icon}) => (
                        <button
                          key={label}
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            const newMakeAgain = effectiveMakeAgain === label ? null : label
                            setPendingRatings(prev => ({ ...prev, [origIndex]: { ...(prev[origIndex] || {}), makeAgain: newMakeAgain } }))
                            saveRating(origIndex, { makeAgain: newMakeAgain })
                          }}
                          className={`text-sm px-3 py-1.5 rounded-full border transition-colors touch-manipulation ${
                            effectiveMakeAgain === label
                              ? 'bg-green-50 border-green-400 text-green-700 font-semibold'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                          } disabled:opacity-40`}
                        >{icon} {label}</button>
                      ))}
                    </div>
                    {/* Note */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={effectiveNote}
                        onChange={e => setPendingRatings(prev => ({ ...prev, [origIndex]: { ...(prev[origIndex] || {}), noteText: e.target.value } }))}
                        onKeyDown={e => e.key === 'Enter' && hasNoteChange && saveRating(origIndex)}
                        placeholder="Add a note... (optional)"
                        className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-green-400"
                      />
                      {hasNoteChange && (
                        <button
                          type="button"
                          onClick={() => saveRating(origIndex)}
                          disabled={isSaving}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium disabled:opacity-50 flex-shrink-0 touch-manipulation"
                        >{isSaving ? 'Saving…' : 'Save note'}</button>
                      )}
                    </div>

                    {/* Iteration history badge */}
                    {(() => {
                      const iterations = recipeNotes[entry.recipeName]?.iterations
                      if (!iterations?.length) return null
                      const isOpen = !!expandedNotes[origIndex]
                      return (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setExpandedNotes(prev => ({ ...prev, [origIndex]: !prev[origIndex] }))}
                            className="inline-flex items-center gap-1 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5 hover:bg-teal-100 transition-colors"
                          >
                            📝 {iterations.length} note{iterations.length !== 1 ? 's' : ''}
                            <span className="text-teal-500 ml-0.5">{isOpen ? '▲' : '▼'}</span>
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-1.5 border-l-2 border-teal-200 pl-2.5">
                              {[...iterations].reverse().map((it, itIdx) => (
                                <div key={itIdx} className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-400">{it.date}</span>
                                  {it.makeAgain && <span className={`ml-1.5 font-medium ${it.makeAgain === 'Yes' ? 'text-green-600' : it.makeAgain === 'Maybe' ? 'text-yellow-600' : 'text-red-600'}`}>{it.makeAgain}</span>}
                                  {it.rating && <span className="ml-1 text-yellow-500">{'★'.repeat(it.rating)}</span>}
                                  {it.note && <span className="ml-1.5 italic">"{it.note}"</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })()}
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

      {evolutionRecipe && (
        <EvolutionModal
          recipeName={evolutionRecipe}
          entries={entries}
          recipeNotes={recipeNotes}
          onClose={() => setEvolutionRecipe(null)}
        />
      )}
    </div>
  )
}

// ── DevBadge ────────────────────────────────────────────────────────────────
function DevBadge({ deviations }) {
  const [open, setOpen] = useState(false)
  const { prefs, subs } = parseDeviations(deviations)
  const total = prefs.length + subs.length
  if (!total) return null
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 hover:bg-orange-100 transition-colors"
      >
        🔧 Modified ({total})
        <span className="text-orange-400 ml-0.5">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-1.5 pl-2 border-l-2 border-orange-200 space-y-1">
          {prefs.map((p, i) => (
            <p key={i} className="text-xs text-gray-600"><span className="font-medium text-orange-600">Change:</span> {p.what}{p.why ? <span className="text-gray-400"> — {p.why}</span> : ''}</p>
          ))}
          {subs.map((s, i) => (
            <p key={i} className="text-xs text-gray-600"><span className="font-medium text-blue-600">Sub:</span> {s.used} <span className="text-gray-400">for</span> {s.original}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── EvolutionModal ───────────────────────────────────────────────────────────
function EvolutionModal({ recipeName, entries, recipeNotes, onClose }) {
  const [copied, setCopied] = useState(false)
  const cookEntries = entries.filter(e => e.recipeName === recipeName && !e.notes.startsWith('Ate Out'))
  const cookCount = cookEntries.length
  const ratings = cookEntries.map(e => e.rating).filter(Boolean)
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null
  const rn = recipeNotes[recipeName] || {}
  const prefChanges = rn.preferenceChanges || []
  const subs = rn.substitutions || []

  function buildSuggestedUpdate() {
    const lines = [`Suggested updates for: ${recipeName}`, '']
    const highFreqPrefs = prefChanges.filter(p => (p.count || 1) >= 2)
    if (highFreqPrefs.length) {
      lines.push('Permanent preference changes to apply:')
      highFreqPrefs.forEach(p => lines.push(`  • ${p.change}${p.reason ? ' (' + p.reason + ')' : ''} — made ${p.count}× ${p.lastRating ? '(last rated ' + p.lastRating + '★)' : ''}`))
      lines.push('')
    }
    const provenSubs = subs.filter(s => s.provenSubstitute)
    if (provenSubs.length) {
      lines.push('Proven substitutes to note in recipe:')
      provenSubs.forEach(s => lines.push(`  • Use ${s.usedIngredient} instead of ${s.originalIngredient} (${s.count}× tried, avg ${s.avgRating}★)`))
    }
    return lines.join('\n')
  }

  function copySuggestion() {
    navigator.clipboard.writeText(buildSuggestedUpdate()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
  }

  const hasHighFreqPref = prefChanges.some(p => (p.count || 1) >= 2)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">{recipeName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">Recipe Evolution</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* Summary row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-700">{cookCount}</p>
            <p className="text-xs text-gray-500">times cooked</p>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-700">{avgRating ? `${avgRating}★` : '—'}</p>
            <p className="text-xs text-gray-500">avg rating</p>
          </div>
        </div>

        {/* Preference changes */}
        {prefChanges.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-orange-700 mb-2">Preference changes logged</p>
            <div className="space-y-2">
              {prefChanges.map((p, i) => (
                <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-800">{p.change}</span>
                    <span className="shrink-0 text-orange-600 font-semibold">×{p.count || 1}</span>
                  </div>
                  {p.reason && <p className="text-gray-500 mt-0.5">{p.reason}</p>}
                  {p.lastRating && <p className="text-amber-600 mt-0.5">Last rated {p.lastRating}★</p>}
                  {p.suggestPermanentUpdate && (
                    <p className="mt-1 text-orange-700 font-semibold">⚠️ Made this change {p.count}× — consider updating the recipe</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Substitutions */}
        {subs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-blue-700 mb-2">Substitutions logged</p>
            <div className="space-y-2">
              {subs.map((s, i) => (
                <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-gray-800">{s.usedIngredient} <span className="text-gray-400">for</span> {s.originalIngredient}</span>
                    <span className="shrink-0 text-blue-600 font-semibold">×{s.count || 1}</span>
                  </div>
                  {s.avgRating && <p className="text-amber-600 mt-0.5">Avg rating when used: {s.avgRating}★</p>}
                  {s.provenSubstitute && (
                    <p className="mt-1 text-blue-700 font-semibold">✅ Proven substitute — works well</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {prefChanges.length === 0 && subs.length === 0 && (
          <p className="text-sm text-gray-400 italic text-center py-4">No deviations logged yet for this recipe.</p>
        )}

        {/* Suggest update button */}
        {hasHighFreqPref && (
          <button
            type="button"
            onClick={copySuggestion}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            {copied ? '✔️ Copied!' : '📋 Suggest recipe update'}
          </button>
        )}
      </div>
    </div>
  )
}
