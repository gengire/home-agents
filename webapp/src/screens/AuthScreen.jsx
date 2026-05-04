import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Home } from 'lucide-react'

export default function AuthScreen() {
  const { login, loading, error } = useApp()
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('gengire/home-agents')
  const [connecting, setConnecting] = useState(false)
  const [localError, setLocalError] = useState(null)

  async function handleConnect(e) {
    e.preventDefault()
    setLocalError(null)
    if (!token.trim()) {
      setLocalError('Please enter a GitHub Personal Access Token.')
      return
    }
    setConnecting(true)
    try {
      await login(token.trim(), repo.trim())
    } catch {
      setLocalError('Connection failed. Check your token and repo name.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-600 rounded-2xl p-4 mb-3">
            <Home className="text-white" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Home Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Household management, simplified.</p>
        </div>

        {/* Auth form */}
        <form onSubmit={handleConnect} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              autoComplete="off"
            />
            <p className="text-xs text-gray-400 mt-1">
              Needs <code>repo</code> scope.{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 underline"
              >
                Generate one
              </a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repository
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="username/home-agents"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {localError || error}
            </div>
          )}

          <button
            type="submit"
            disabled={connecting || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  )
}
