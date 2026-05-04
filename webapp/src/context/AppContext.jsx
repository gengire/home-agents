import { createContext, useContext, useState, useEffect } from 'react'
import { initOctokit, testConnection } from '../github/client'

const AppContext = createContext(null)

const TOKEN_KEY = 'homeAgentsToken'
const REPO_KEY = 'homeAgentsRepo'

export function AppProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [repo, setRepoState] = useState(() => localStorage.getItem(REPO_KEY) || 'gengire/home-agents')
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedRepo = localStorage.getItem(REPO_KEY) || 'gengire/home-agents'
    if (savedToken) {
      initOctokit(savedToken)
      setAuthenticated(true)
    }
    setLoading(false)
  }, [])

  async function login(newToken, newRepo) {
    setLoading(true)
    setError(null)
    try {
      await testConnection(newToken, newRepo)
      localStorage.setItem(TOKEN_KEY, newToken)
      localStorage.setItem(REPO_KEY, newRepo)
      setTokenState(newToken)
      setRepoState(newRepo)
      initOctokit(newToken)
      setAuthenticated(true)
    } catch (err) {
      setError('Connection failed. Check your token and repo name.')
      throw err
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REPO_KEY)
    setTokenState('')
    setAuthenticated(false)
  }

  return (
    <AppContext.Provider value={{ token, repo, authenticated, loading, error, login, logout }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
