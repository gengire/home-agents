import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"
import { AppProvider, useApp } from "./context/AppContext"
import AuthScreen from "./screens/AuthScreen"
import Dashboard from "./screens/Dashboard"
import PantryManager from "./screens/PantryManager"
import CookLog from "./screens/CookLog"
import MealPlan from "./screens/MealPlan"
import Preferences from "./screens/Preferences"
import Maintenance from "./screens/Maintenance"
import Settings from "./screens/Settings"
import { lazy, Suspense } from "react"
const Help = lazy(() => import("./screens/Help"))
import BottomNav from "./components/BottomNav"
import TopHeader from "./components/TopHeader"

const ROUTE_TITLES = {
  '/': '🏠 Home Agents',
  '/pantry': '🧺 Pantry',
  '/cook-log': '📓 Cook Log',
  '/meal-plan': '🗓 Meal Plan',
  '/prefs': '⚙️ Preferences',
  '/maintenance': '🔧 Maintenance',
  '/settings': '⚙️ Settings',
  '/help': '📖 Help & Guides',
}

function AppShell() {
  const { authenticated, loading } = useApp()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!authenticated) {
    return <AuthScreen />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopHeader title={ROUTE_TITLES[location.pathname] || '🏠 Home Agents'} />
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pantry" element={<PantryManager />} />
          <Route path="/cook-log" element={<CookLog />} />
          <Route path="/meal-plan" element={<MealPlan />} />
          <Route path="/prefs" element={<Preferences />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Suspense fallback={<div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>}><Help /></Suspense>} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/home-agents">
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  )
}
