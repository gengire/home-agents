import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react"
import { Plus, Trash2, RefreshCw, Save, ScanBarcode } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile } from "../github/client"
import { parsePantry, serializePantry } from "../utils/pantryParser"
import Toast from "../components/Toast"

const BarcodeScanner = lazy(() => import("../components/BarcodeScanner"))

const PANTRY_PATH = "data/pantry-inventory.md"
const CACHE_PATH = "data/barcode-cache.json"

async function commitPantry(repo, content, sha) {
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  await updateFile(repo, PANTRY_PATH, content, sha, `Pantry update — ${today}`)
  const { sha: newSha } = await getFile(repo, PANTRY_PATH)
  return newSha
}

export default function PantryManager() {
  const { repo } = useApp()
  const [parsed, setParsed] = useState(null)
  const [sha, setSha] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [newItems, setNewItems] = useState({})
  const [scanning, setScanning] = useState(false)
  const pressTimer = useRef(null)
  const [cacheData, setCacheData] = useState({})
  const [cacheSha, setCacheSha] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pantryResult, cacheResult] = await Promise.all([
        getFile(repo, PANTRY_PATH),
        getFile(repo, CACHE_PATH).catch(() => null),
      ])
      setParsed(parsePantry(pantryResult.content))
      setSha(pantryResult.sha)
      setDirty(false)
      if (cacheResult) {
        try {
          setCacheData(JSON.parse(cacheResult.content))
          setCacheSha(cacheResult.sha)
        } catch { /* ignore malformed cache */ }
      }
    } catch {
      setToast({ message: "Failed to load pantry from GitHub.", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  function toggleItem(sectionIdx, itemIdx) {
    setParsed(prev => {
      const next = structuredClone(prev)
      const item = next.sections[sectionIdx].items[itemIdx]
      const prefix = "⬜ "
      next.sections[sectionIdx].items[itemIdx] = item.startsWith(prefix) ? item.slice(prefix.length) : prefix + item
      return next
    })
    setDirty(true)
  }

  function deleteItem(sectionIdx, itemIdx) {
    setParsed(prev => {
      const next = structuredClone(prev)
      next.sections[sectionIdx].items.splice(itemIdx, 1)
      return next
    })
    setDirty(true)
  }

  function addItem(sectionIdx) {
    const key = String(sectionIdx)
    const text = (newItems[key] || "").trim()
    if (!text) return
    setParsed(prev => {
      const next = structuredClone(prev)
      next.sections[sectionIdx].items.push(text)
      return next
    })
    setNewItems(prev => ({ ...prev, [key]: "" }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const content = serializePantry(parsed)
      const newSha = await commitPantry(repo, content, sha)
      setSha(newSha)
      setDirty(false)
      setToast({ message: "✅ Pantry saved to GitHub", type: "success" })
    } catch {
      setToast({ message: "❌ Save failed. Check your connection.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  function handleScannedItem({ item, section }) {
    setScanning(false)
    if (!item.trim()) return
    setParsed(prev => {
      const next = structuredClone(prev)
      // Find section by name (case-insensitive), fall back to last section
      let idx = next.sections.findIndex(s => s.name.toLowerCase() === section.toLowerCase())
      if (idx === -1) idx = next.sections.length - 1
      if (idx === -1) return prev
      next.sections[idx].items.push(item.trim())
      return next
    })
    setDirty(true)
    setToast({ message: `✅ "${item}" added to ${section}`, type: 'success' })
  }

  async function handleCacheUpdate(barcode, name) {
    const updated = { ...cacheData, [barcode]: name }
    setCacheData(updated)
    try {
      await updateFile(repo, CACHE_PATH, JSON.stringify(updated, null, 2), cacheSha, `Barcode cache: ${barcode} → ${name}`)
      const { sha: newSha } = await getFile(repo, CACHE_PATH)
      setCacheSha(newSha)
    } catch {
      // Non-critical — item was already added to pantry
    }
  }

  function startPress(sectionIdx, itemIdx) {
    pressTimer.current = setTimeout(() => deleteItem(sectionIdx, itemIdx), 600)
  }
  function cancelPress() { clearTimeout(pressTimer.current) }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!parsed) return null

  return (
    <div className="p-4 space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Last updated: {parsed.lastUpdated || "—"}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            <ScanBarcode size={14} />
            Scan
          </button>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">Long-press an item to delete it.</p>

      {parsed.sections.map((section, sIdx) => (
        <div key={section.name} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">{section.name}</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {section.items.length === 0 && (
              <li className="px-4 py-3 text-xs text-gray-400 italic">Nothing listed</li>
            )}
            {section.items.map((item, iIdx) => {
              const prefix = "⬜ "
              const isOut = item.startsWith(prefix)
              const label = isOut ? item.slice(prefix.length) : item
              return (
                <li
                  key={iIdx}
                  className="flex items-center gap-3 px-4 py-3 select-none active:bg-gray-50"
                  onTouchStart={() => startPress(sIdx, iIdx)}
                  onTouchEnd={cancelPress}
                  onMouseDown={() => startPress(sIdx, iIdx)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                >
                  <button
                    onClick={() => toggleItem(sIdx, iIdx)}
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isOut ? "border-gray-300 bg-white" : "border-green-500 bg-green-500"}`}
                    aria-label={isOut ? "Mark in stock" : "Mark out of stock"}
                  >
                    {!isOut && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${isOut ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {label}
                  </span>
                  <button
                    onClick={() => deleteItem(sIdx, iIdx)}
                    className="text-gray-300 hover:text-red-400 p-1 hidden sm:block"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
            <input
              type="text"
              value={newItems[String(sIdx)] || ""}
              onChange={e => setNewItems(prev => ({ ...prev, [String(sIdx)]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addItem(sIdx)}
              placeholder="Add item…"
              className="flex-1 text-sm border-none outline-none text-gray-700 placeholder-gray-300 bg-transparent"
            />
            <button onClick={() => addItem(sIdx)} className="text-green-600 hover:text-green-700 p-1" aria-label="Add">
              <Plus size={18} />
            </button>
          </div>
        </div>
      ))}

      {dirty && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-2xl shadow-lg text-sm transition-colors"
          >
            <Save size={16} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {scanning && parsed && (
        <Suspense fallback={null}>
          <BarcodeScanner
            onAdd={handleScannedItem}
            onClose={() => setScanning(false)}
            knownSections={parsed.sections.map(s => s.name)}
            cacheData={cacheData}
            onCacheUpdate={handleCacheUpdate}
          />
        </Suspense>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
