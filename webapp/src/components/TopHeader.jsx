import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'

export default function TopHeader({ title }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
      <span className="text-base font-bold text-gray-900">{title || '🏠 Home Agents'}</span>
      <button
        onClick={() => navigate('/settings')}
        className="text-gray-500 hover:text-gray-800 p-1 rounded-lg"
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
    </header>
  )
}
