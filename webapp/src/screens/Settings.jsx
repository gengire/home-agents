import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { repo, logout } = useApp()
  const navigate = useNavigate()

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Settings</h2>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-sm text-gray-500">Connected repository</p>
        <p className="text-sm font-medium text-gray-900 mt-1">{repo}</p>
      </div>

      <button
        onClick={() => navigate('/help')}
        className="w-full flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-semibold rounded-xl py-3 text-sm transition-colors mb-3"
      >
        <BookOpen size={16} />
        Help &amp; Guides
      </button>

      <button
        onClick={logout}
        className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold rounded-xl py-3 text-sm transition-colors"
      >
        Disconnect
      </button>
    </div>
  )
}
