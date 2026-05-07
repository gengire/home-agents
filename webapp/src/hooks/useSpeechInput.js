import { useState, useRef, useCallback } from 'react'

/**
 * Wraps the Web Speech API for one-shot voice input.
 * onResult(transcript) is called when a phrase is recognised.
 * Returns { listening, supported, start, stop, toggle }
 */
export function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)
  // Keep onResult stable without forcing callers to memoize it
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous = false
    recog.interimResults = false
    recog.lang = 'en-US'
    recog.onresult = e => {
      const transcript = e.results[0]?.[0]?.transcript ?? ''
      if (transcript) onResultRef.current(transcript)
    }
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.start()
    recogRef.current = recog
    setListening(true)
  }, [])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (listening) stop(); else start()
  }, [listening, start, stop])

  return { listening, supported, start, stop, toggle }
}
