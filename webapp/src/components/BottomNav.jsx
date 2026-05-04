import { NavLink } from 'react-router-dom'
import { Home, ShoppingBasket, BookOpen, CalendarDays, Wrench } from 'lucide-react'

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/pantry', icon: ShoppingBasket, label: 'Pantry' },
  { to: '/cook-log', icon: BookOpen, label: 'Cook Log' },
  { to: '/meal-plan', icon: CalendarDays, label: 'Meals' },
  { to: '/maintenance', icon: Wrench, label: 'Upkeep' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex safe-area-pb">
      {tabs.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-green-600' : 'text-gray-400'
            }`
          }
        >
          <Icon size={22} className="mb-0.5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
