import { useState, useEffect, useCallback } from "react"
import { RefreshCw, Save, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile, updateFile } from "../github/client"
import { parseMaintenance, serializeMaintenance, isOverdue } from "../utils/maintenanceParser"
import Toast from "../components/Toast"

const MAINT_PATH = "data/maintenance-schedule.md"

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function DateField({ label, value, onChange, overdueThreshold }) {
  const overdue = overdueThreshold ? isOverdue(value, overdueThreshold) : false
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        {overdue && (
          <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
            <AlertTriangle size={11} /> Overdue
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => onChange(todayISO())}
          className="text-xs text-green-600 font-semibold px-2.5 py-1.5 bg-green-50 rounded-lg hover:bg-green-100 whitespace-nowrap"
        >
          Today
        </button>
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

export default function Maintenance() {
  const { repo } = useApp()
  const [data, setData] = useState(null)
  const [originalMarkdown, setOriginalMarkdown] = useState("")
  const [sha, setSha] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { content, sha: fileSha } = await getFile(repo, MAINT_PATH)
      setOriginalMarkdown(content)
      setSha(fileSha)
      setData(parseMaintenance(content))
      setDirty(false)
    } catch {
      setToast({ message: "Failed to load maintenance schedule.", type: "error" })
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

  function set(path, value) {
    setData(prev => {
      const next = structuredClone(prev)
      const keys = path.split(".")
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const updated = serializeMaintenance(data, originalMarkdown)
      await updateFile(repo, MAINT_PATH, updated, sha, "Maintenance update — " + new Date().toLocaleDateString("en-US"))
      const { content, sha: newSha } = await getFile(repo, MAINT_PATH)
      setOriginalMarkdown(content)
      setSha(newSha)
      setData(parseMaintenance(content))
      setDirty(false)
      setToast({ message: "✅ Maintenance schedule saved", type: "success" })
    } catch {
      setToast({ message: "❌ Save failed. Check your connection.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-4 space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Last updated: {data.lastUpdated || "—"}</p>
        <button onClick={load} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* HVAC Section */}
      <SectionCard title="🌡️ HVAC & Nest Thermostat">
        <DateField
          label="Last filter changed"
          value={data.hvac.lastFilterChanged}
          onChange={v => set("hvac.lastFilterChanged", v)}
          overdueThreshold={90}
        />
        <DateField
          label="Next filter check"
          value={data.hvac.nextFilterCheck}
          onChange={v => set("hvac.nextFilterCheck", v)}
        />
        <DateField
          label="Next filter replacement"
          value={data.hvac.nextFilterReplacement}
          onChange={v => set("hvac.nextFilterReplacement", v)}
        />
        <DateField
          label="Last Nest seasonal review"
          value={data.hvac.lastNestReview}
          onChange={v => set("hvac.lastNestReview", v)}
        />
        <div className="py-2.5 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1">Humidity target</p>
          <p className="text-sm text-gray-800">{data.hvac.humidityTarget}</p>
        </div>
        <div className="py-2.5">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
          <input
            type="text"
            value={data.hvac.notes}
            onChange={e => set("hvac.notes", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Any notes…"
          />
        </div>
      </SectionCard>

      {/* Safety Section */}
      <SectionCard title="🔒 Safety & Recurring Tasks">
        <DateField
          label="Smoke & CO detectors last tested"
          value={data.safety.detectorsLastTested}
          onChange={v => set("safety.detectorsLastTested", v)}
          overdueThreshold={180}
        />
        <DateField
          label="Detector batteries replaced"
          value={data.safety.detectorBatteriesReplaced}
          onChange={v => set("safety.detectorBatteriesReplaced", v)}
          overdueThreshold={365}
        />
        <DateField
          label="Water heater last flushed"
          value={data.safety.waterHeaterLastFlushed}
          onChange={v => set("safety.waterHeaterLastFlushed", v)}
          overdueThreshold={365}
        />
        <DateField
          label="Gutters last cleaned"
          value={data.safety.guttersLastCleaned}
          onChange={v => set("safety.guttersLastCleaned", v)}
          overdueThreshold={180}
        />
      </SectionCard>

      {/* Quick Actions */}
      <SectionCard title="✅ Monthly Quick Actions">
        {[
          { key: "checkFilter", label: "Check HVAC filter" },
          { key: "reviewNest", label: "Review Nest settings for current season" },
          { key: "testDetectors", label: "Test smoke/CO detectors" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => set(`quickActions.${key}`, !data.quickActions[key])}
            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 text-left"
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${data.quickActions[key] ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
              {data.quickActions[key] && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className={`text-sm ${data.quickActions[key] ? "line-through text-gray-400" : "text-gray-800"}`}>{label}</span>
          </button>
        ))}
      </SectionCard>

      {/* Seasonal notes - read only */}
      {data.seasonalNotes && (
        <SectionCard title="🌦️ Seasonal Notes">
          <div className="py-2 space-y-1">
            {data.seasonalNotes.split("\n").map((line, i) => (
              <p key={i} className="text-xs text-gray-600">{line}</p>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Floating save */}
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

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
