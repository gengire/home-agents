import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw, ChefHat, ShoppingBasket, CalendarDays, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react"
import { useApp } from "../context/AppContext"
import { getFile } from "../github/client"
import { parseCookLog, CATEGORIES, getCategoryStyle, getRecentCategories } from "../utils/cookLogParser"
import { parseMealPlan } from "../utils/mealPlanParser"
import { parseMaintenance, isOverdue } from "../utils/maintenanceParser"

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function todayDayName() {
  return DAY_NAMES[new Date().getDay()]
}

function tomorrowDayName() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return DAY_NAMES[d.getDay()]
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
  const [coolingDown, setCoolingDown] = useState([])
  const [maintenance, setMaintenance] = useState(null)
  const [pantryUpdated, setPantryUpdated] = useState('')
  const [error, setError] = useState(null)

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
      }

      if (cookFile) {
        const entries = parseCookLog(cookFile.content)
        const recent = getRecentCategories(entries, 8)
        setCoolingDown([...recent])
      }

      if (maintFile) {
        setMaintenance(parseMaintenance(maintFile.content))
      }

      if (pantryFile) {
        const match = pantryFile.content.match(/\*\*Last updated:\*\*\s*(.+)/)
        setPantryUpdated(match ? match[1].trim() : '')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [repo])

  useEffect(() => { load() }, [load])

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
          {todayIsNew && <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🍳 Cook tonight</span>}
        </div>
        <p className="text-base font-semibold text-gray-800 leading-snug">
          {todayDinner || <span className="text-gray-400 font-normal italic">No meal plan for today</span>}
        </p>
        {tomorrowDinner && (
          <p className="text-xs text-gray-400 mt-1">Tomorrow: {tomorrowDinner}</p>
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

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
