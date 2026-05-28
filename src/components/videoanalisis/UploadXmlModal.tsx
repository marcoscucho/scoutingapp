import { useState, useRef, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { parseXml, validateXml } from '@/services/xmlParserService'
import { createVideoAnalysis } from '@/services/videoAnalysisSupabase'
import type { AnalysisCategory, AnalysisType, ParsedAnalysis } from '@/services/videoAnalysisTypes'
import { ALL_CATEGORIES, CATEGORY_LABELS } from '@/services/videoAnalysisTypes'

interface UploadXmlModalProps {
  isOpen: boolean
  onClose: () => void
  defaultCategory?: AnalysisCategory
  defaultType?: AnalysisType
}

export default function UploadXmlModal({ isOpen, onClose, defaultCategory = 'primera', defaultType = 'partido' }: UploadXmlModalProps) {
  const navigate = useNavigate()
  const { user, userDisplayName } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string; eventCount?: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const [category, setCategory] = useState<AnalysisCategory>(defaultCategory)
  const [type, setType] = useState<AnalysisType>(defaultType)
  const [rival, setRival] = useState('')
  const [matchDay, setMatchDay] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function handleFile(f: File) {
    if (!f.name.endsWith('.xml')) {
      setValidation({ valid: false, error: 'El archivo debe ser .xml' })
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      setXmlContent(content)
      setValidation(validateXml(content))
    }
    reader.readAsText(f)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  async function handleSubmit() {
    if (!xmlContent || !validation?.valid || !date || saving) return
    if (type === 'partido' && !rival.trim()) {
      setError('Completá el rival')
      return
    }
    if (type === 'entrenamiento' && !description.trim()) {
      setError('Completá la descripción del entrenamiento')
      return
    }

    setSaving(true)
    setError(null)

    let parsedData: ParsedAnalysis
    try {
      parsedData = parseXml(xmlContent)
    } catch {
      setError('Error al parsear el XML')
      setSaving(false)
      return
    }

    const result = await createVideoAnalysis({
      category,
      type,
      rival: type === 'partido' ? rival.trim() : null,
      matchDay: type === 'partido' ? matchDay.trim() || null : null,
      description: type === 'entrenamiento' ? description.trim() : null,
      date,
      parsedData,
    })

    setSaving(false)

    if (result.success && result.id) {
      onClose()
      navigate(`/videoanalisis/${result.id}`)
    } else {
      setError(result.error || 'Error al guardar')
    }
  }

  const isValid = validation?.valid && date && (type === 'partido' ? rival.trim() : description.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-apple-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-apple-gray-200/50 dark:border-apple-gray-700/50">
          <div>
            <h2 className="text-lg font-semibold text-apple-gray-800 dark:text-white">Subir análisis</h2>
            <p className="text-xs text-apple-gray-500 mt-0.5">Arrastrá tu archivo XML de videoanálisis</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-apple-gray-100 dark:hover:bg-apple-gray-700 transition-colors text-apple-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-apple-lg p-6 text-center cursor-pointer transition-colors ${
              dragging
                ? 'border-brand-green bg-brand-green/5'
                : validation?.valid
                  ? 'border-green-500/50 bg-green-500/5'
                  : validation && !validation.valid
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-apple-gray-300 dark:border-apple-gray-600 hover:border-brand-green'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <svg className="w-8 h-8 text-apple-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-medium text-apple-gray-800 dark:text-white">{file.name}</p>
                  <p className="text-xs text-apple-gray-500">
                    {(file.size / 1024).toFixed(0)} KB
                    {validation?.valid && ` · ${validation.eventCount} eventos detectados`}
                  </p>
                </div>
                {validation?.valid && (
                  <span className="text-green-500 text-sm font-medium ml-2">✓</span>
                )}
              </div>
            ) : (
              <>
                <svg className="w-10 h-10 text-apple-gray-300 dark:text-apple-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-apple-gray-700 dark:text-apple-gray-300">Arrastrá tu archivo XML acá</p>
                <p className="text-xs text-apple-gray-500 mt-1">o hacé click para buscar</p>
              </>
            )}
            {validation && !validation.valid && (
              <p className="text-xs text-red-500 mt-2">{validation.error}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Categoría</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as AnalysisCategory)}
                className="input-apple text-sm"
              >
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Tipo</label>
              <div className="flex gap-1 bg-apple-gray-100 dark:bg-apple-gray-700 rounded-apple p-1">
                <button
                  type="button"
                  onClick={() => setType('partido')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                    type === 'partido'
                      ? 'bg-brand-green text-white shadow-sm'
                      : 'text-apple-gray-600 dark:text-apple-gray-300'
                  }`}
                >
                  Partido
                </button>
                <button
                  type="button"
                  onClick={() => setType('entrenamiento')}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
                    type === 'entrenamiento'
                      ? 'bg-brand-green text-white shadow-sm'
                      : 'text-apple-gray-600 dark:text-apple-gray-300'
                  }`}
                >
                  Entrenamiento
                </button>
              </div>
            </div>
          </div>

          {type === 'partido' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Rival *</label>
                <input type="text" value={rival} onChange={e => setRival(e.target.value)} placeholder="Ej: Boca Juniors" className="input-apple text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Jornada</label>
                <input type="text" value={matchDay} onChange={e => setMatchDay(e.target.value)} placeholder="Ej: Fecha 10" className="input-apple text-sm" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Descripción *</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Trabajo táctico ofensivo" className="input-apple text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-apple-gray-600 dark:text-apple-gray-400 mb-1">Fecha *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-apple text-sm" />
          </div>

          {user && (
            <p className="text-xs text-apple-gray-400">
              Subiendo como <span className="font-medium text-apple-gray-600 dark:text-apple-gray-300">{userDisplayName}</span>
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-apple-gray-100 dark:bg-apple-gray-700 text-apple-gray-600 dark:text-apple-gray-300 hover:bg-apple-gray-200 dark:hover:bg-apple-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || saving}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#8B1530] text-white hover:bg-[#A01A38] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {saving ? 'Subiendo...' : 'Subir análisis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
