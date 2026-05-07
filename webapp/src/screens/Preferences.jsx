import { useState, useEffect, useCallback, useRef } from "react"
import { Plus, X, RefreshCw, Save, Flame } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile } from "../github/client"
import { parsePreferences, serializePreferences } from "../utils/preferencesParser"
import Toast from "../components/Toast"
import MicButton from "../components/MicButton"

const PREFS_PATH = "data/family-preferences.md"

const SPICE_OPTIONS = [
  { value: 'mild', label: 'Mild', desc: 'Comfortable for everyone' },
  { value: 'medium', label: 'Medium', desc: 'A little heat, no problem' },
  { value: 'hot', label: 'Hot', desc: 'Family likes it spicy' },
]

function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function addTag() {
    const val = input.trim()
    if (!val || tags.includes(val)) { setInput(''); return }
    onChange([...tags, val])
    setInput('')
    inputRef.current?.focus()
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-10">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="ml-1 leading-none text-green-600 hover:text-red-500">
              <X size={13} />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-gray-400 text-sm italic">None added yet</span>}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
        <MicButton value={input} onChange={setInput} />
        <button
          type="button"
          onClick={addTag}
          className="bg-green-600 text-white px-3 py-2 rounded-lg"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

export default function Preferences() {
  const { repo } = useApp()
  const [data, setData] = useState(null)
  const [originalMd, setOriginalMd] = useState('')
  const [sha, setSha] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [newProtein, setNewProtein] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { content, sha: fileSha } = await getFile(repo, PREFS_PATH)
      setOriginalMd(content)
      setSha(fileSha)
      setData(parsePreferences(content))
      setDirty(false)
    } catch (e) {
      setToast({ type: 'error', message: `Failed to load: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  function update(field, value) {
    setData(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const updated = serializePreferences(originalMd, data)
      const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      await updateFile(repo, PREFS_PATH, updated, sha, `Preferences update — ${today}`)
      const { sha: newSha } = await getFile(repo, PREFS_PATH)
      setSha(newSha)
      setOriginalMd(updated)
      setDirty(false)
      setToast({ type: 'success', message: 'Preferences saved!' })
    } catch (e) {
      setToast({ type: 'error', message: `Save failed: ${e.message}` })
    } finally {
      setSaving(false)
    }
  }

  function addProtein() {
    const val = newProtein.trim()
    if (!val || data.proteins.includes(val)) { setNewProtein(''); return }
    update('proteins', [...data.proteins, val])
    setNewProtein('')
  }

  function removeProtein(p) {
    update('proteins', data.proteins.filter(x => x !== p))
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <RefreshCw size={28} className="animate-spin" />
        <span className="text-sm">Loading preferences…</span>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-lg mx-auto px-4 pb-32 pt-2 space-y-4">

      {/* Spice Preferences */}
      <SectionCard title="Spice Level — Family Baseline">
        <p className="text-xs text-gray-500">Sets the default heat level for all meals.</p>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {SPICE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update('spiceBaseline', opt.value)}
              className={`flex flex-col items-center px-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                data.spiceBaseline === opt.value
                  ? 'border-orange-400 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <span className="text-lg mb-1">
                {opt.value === 'mild' ? '🌶️' : opt.value === 'medium' ? '🌶️🌶️' : '🌶️🌶️🌶️'}
              </span>
              <span>{opt.label}</span>
              <span className="text-xs font-normal mt-0.5 text-center leading-tight opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <Flame size={16} className="text-red-500 shrink-0" />
          <span className="text-sm text-red-700"><strong>Chris:</strong> ultra-spicy at the table — always.</span>
        </div>
      </SectionCard>

      {/* Dislikes */}
      <SectionCard title="Dislikes / Avoid">
        <p className="text-xs text-gray-500">HomeChef will avoid these when planning meals.</p>
        <TagInput
          tags={data.dislikes}
          onChange={v => update('dislikes', v)}
          placeholder="Add an ingredient to avoid…"
        />
      </SectionCard>

      {/* Dessert Favorites */}
      <SectionCard title="Dessert Favorites">
        <p className="text-xs text-gray-500">Pritikin-compliant. Rotated 1–2×/week.</p>
        <TagInput
          tags={data.dessertFavorites}
          onChange={v => update('dessertFavorites', v)}
          placeholder="Add a dessert…"
        />
      </SectionCard>

      {/* Common Proteins */}
      <SectionCard title="Common Proteins">
        <p className="text-xs text-gray-500">Typically stocked and used in meal rotation.</p>
        <ul className="space-y-2">
          {data.proteins.map(p => (
            <li key={p} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span>{p}</span>
              <button type="button" onClick={() => removeProtein(p)} className="text-gray-400 hover:text-red-500 ml-2">
                <X size={15} />
              </button>
            </li>
          ))}
          {data.proteins.length === 0 && <li className="text-sm text-gray-400 italic">No proteins listed</li>}
        </ul>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={newProtein}
            onChange={e => setNewProtein(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addProtein() } }}
            placeholder="Add a protein…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <MicButton value={newProtein} onChange={setNewProtein} />
          <button type="button" onClick={addProtein} className="bg-green-600 text-white px-3 py-2 rounded-lg">
            <Plus size={16} />
          </button>
        </div>
      </SectionCard>

      {dirty && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30 px-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg disabled:opacity-60 transition-colors"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      )}

      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
