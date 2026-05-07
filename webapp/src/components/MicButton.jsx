import { Mic } from 'lucide-react'
import { useSpeechInput } from '../hooks/useSpeechInput'

/**
 * Mic button that appends spoken text to a field value.
 *
 * Usage:
 *   <MicButton value={notes} onChange={setNotes} disabled={saving} />
 *
 * The transcript is appended (space-separated) to the current value.
 * If the browser doesn't support SpeechRecognition, renders nothing.
 */
export default function MicButton({ value = '', onChange, disabled = false }) {
  const { listening, supported, toggle } = useSpeechInput(transcript => {
    onChange((value ? value + ' ' : '') + transcript)
  })

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={listening ? 'Stop recording' : 'Start voice input'}
      className={`relative flex-shrink-0 p-2 rounded-lg border transition-colors disabled:opacity-40 ${
        listening
          ? 'text-red-500 bg-red-50 border-red-200'
          : 'text-gray-400 hover:text-green-600 hover:bg-gray-50 border-gray-200'
      }`}
    >
      {listening && (
        <span className="absolute inset-0 rounded-lg animate-ping bg-red-200 opacity-60" />
      )}
      <Mic size={16} className="relative" />
    </button>
  )
}
