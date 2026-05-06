import { useEffect, useRef, useState, useCallback } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { X, Camera, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

/**
 * Guess pantry section from product categories/name.
 * Returns one of the known section keys used in parsePantry.
 */
function guessSection(productName, categories = '') {
  const text = (productName + ' ' + categories).toLowerCase()
  if (/chicken|beef|pork|turkey|salmon|tuna|shrimp|fish|tilapia|lamb|bison|egg|tofu|tempeh|seitan/.test(text)) return 'Proteins'
  if (/milk|cheese|yogurt|cream|butter|kefir|dairy/.test(text)) return 'Dairy'
  if (/apple|banana|mango|berry|grape|orange|lemon|lime|peach|plum|pear|fruit/.test(text)) return 'Fruits'
  if (/spinach|kale|broccoli|carrot|onion|garlic|pepper|tomato|zucchini|eggplant|vegetable|celery|lettuce|cabbage/.test(text)) return 'Vegetables'
  if (/rice|oat|bread|pasta|noodle|quinoa|barley|flour|grain|cereal|tortilla|cracker/.test(text)) return 'Grains'
  if (/lentil|bean|chickpea|pea|dal|legume/.test(text)) return 'Legumes'
  if (/cumin|turmeric|coriander|paprika|chili|cardamom|garam|herb|spice|basil|oregano|thyme|bay|pepper|salt/.test(text)) return 'Herbs & Seasonings'
  return 'Other'
}

async function lookupBarcode(barcode) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Lookup failed')
  const json = await res.json()
  if (json.status !== 1 || !json.product) throw new Error('Product not found')
  const product = json.product
  const name = product.product_name_en || product.product_name || ''
  const categories = product.categories || ''
  return { name, categories, barcode }
}

/**
 * BarcodeScanner
 * Props:
 *   onAdd({ item, section }) — called when user confirms adding the scanned product
 *   onClose() — dismiss the scanner
 *   knownSections: string[] — list of available section names for the user to pick
 *   cacheData: object — barcode→name map to check before calling API
 *   onCacheUpdate(barcode, name) — called when user manually enters a name for an unknown barcode
 */
export default function BarcodeScanner({ onAdd, onClose, knownSections = [], cacheData = {}, onCacheUpdate }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const [scanning, setScanning] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [product, setProduct] = useState(null) // { name, section }
  const [editedName, setEditedName] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [cameraError, setCameraError] = useState(null)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [isManualEntry, setIsManualEntry] = useState(false)

  // Start scanner
  useEffect(() => {
    if (!scanning) return
    let controls = null
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader

    reader.decodeFromVideoDevice(undefined, videoRef.current, async (result, err) => {
      if (!result) return
      // Got a barcode — stop scanning, look up
      controls?.stop()
      setScanning(false)
      const barcode = result.getText()
      setScannedBarcode(barcode)

      // Check local cache first
      if (cacheData[barcode]) {
        const cachedName = cacheData[barcode]
        const suggestedSection = guessSection(cachedName)
        setProduct({ name: cachedName, categories: '', barcode })
        setEditedName(cachedName)
        setSelectedSection(knownSections.includes(suggestedSection) ? suggestedSection : (knownSections[0] || 'Other'))
        setIsManualEntry(false)
        return
      }

      setLoading(true)
      setError(null)
      setIsManualEntry(false)
      try {
        const data = await lookupBarcode(barcode)
        const suggestedSection = guessSection(data.name, data.categories)
        setProduct(data)
        setEditedName(data.name)
        setSelectedSection(
          knownSections.includes(suggestedSection) ? suggestedSection : (knownSections[0] || 'Other')
        )
      } catch (e) {
        setError(e.message === 'Product not found'
          ? 'Product not found in database. Enter name manually.'
          : 'Could not look up barcode. Check connection.')
        setEditedName('')
        setSelectedSection(knownSections[0] || 'Other')
        setIsManualEntry(true)
      } finally {
        setLoading(false)
      }
    }).then(c => { controls = c }).catch(e => {
      setCameraError('Camera not available: ' + e.message)
      setScanning(false)
    })

    return () => { controls?.stop() }
  }, [scanning, knownSections])

  function handleRescan() {
    setProduct(null)
    setError(null)
    setEditedName('')
    setSelectedSection('')
    setScanning(true)
    setScannedBarcode(null)
    setIsManualEntry(false)
  }

  function handleConfirm() {
    const name = editedName.trim()
    if (!name) return
    if (isManualEntry && scannedBarcode && onCacheUpdate) {
      onCacheUpdate(scannedBarcode, name)
    }
    onAdd({ item: name, section: selectedSection })
  }

  const sections = knownSections.length > 0 ? knownSections : ['Proteins', 'Vegetables', 'Fruits', 'Grains', 'Legumes', 'Dairy', 'Herbs & Seasonings', 'Other']

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
        <span className="font-semibold text-base">Scan Barcode</span>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-800">
          <X size={22} />
        </button>
      </div>

      {/* Camera / Result area */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Video feed */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${scanning ? 'block' : 'hidden'}`}
          playsInline
          muted
        />

        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-48 border-4 border-green-400 rounded-xl opacity-80" />
            <p className="absolute bottom-8 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              Point camera at barcode
            </p>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="flex flex-col items-center gap-3 px-6 text-white text-center">
            <Camera size={48} className="opacity-40" />
            <p className="text-sm opacity-80">{cameraError}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 text-white">
            <RefreshCw size={36} className="animate-spin" />
            <p className="text-sm">Looking up product…</p>
          </div>
        )}
      </div>

      {/* Bottom sheet — result or error */}
      {(product || error != null) && !loading && (
        <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {product && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 text-sm">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Found: <strong>{product.name}</strong></span>
            </div>
          )}

          {/* Item name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Item name</label>
            <input
              type="text"
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              placeholder="Enter product name…"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {/* Section picker */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Add to section</label>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              {sections.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleRescan}
              className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Scan Again
            </button>
            <button
              onClick={handleConfirm}
              disabled={!editedName.trim()}
              className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-green-700"
            >
              Add to Pantry
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
