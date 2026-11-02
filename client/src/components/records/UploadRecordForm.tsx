import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../toast'
import { Button, Card } from '../ui'
import {
  encryptRecordContent,
  formatFileSize,
  sha256Hex,
  useRecordUploadClient,
  validateRecordFile,
  validateRecordNote,
  buildRecordContent,
  MAX_RECORD_NOTE_LENGTH,
  type RecordUploadClient,
} from '../../lib/records'
import { describeUnknownError, useSorobanClient, type MedicalRecord, type RecordCategory } from '../../lib/soroban'

const CATEGORIES: RecordCategory[] = [
  'lab-result',
  'imaging',
  'prescription',
  'treatment-note',
  'immunization',
  'allergy',
  'other',
]

const CATEGORY_LABELS: Record<RecordCategory, string> = {
  'lab-result': 'Lab result',
  imaging: 'Imaging',
  prescription: 'Prescription',
  'treatment-note': 'Treatment note',
  immunization: 'Immunization',
  allergy: 'Allergy',
  other: 'Other',
}

type Step = 'idle' | 'encrypting' | 'uploading' | 'anchoring' | 'success'

const STEP_LABELS: Record<Exclude<Step, 'idle' | 'success'>, string> = {
  encrypting: 'Encrypting your file in this browser…',
  uploading: 'Uploading the encrypted record…',
  anchoring: 'Anchoring the commitment on Stellar…',
}

const ACCEPTED_FILE_TYPES =
  'application/pdf,image/jpeg,image/png,image/webp,text/plain,application/json,.pdf,.jpg,.jpeg,.png,.webp,.txt,.json'

export interface UploadRecordFormProps {
  patient: string
  /** Called with the anchored record after the on-chain write succeeds. */
  onUploaded?: (record: MedicalRecord) => void
  /** Overrides the app's upload client — useful in tests. */
  uploadClient?: RecordUploadClient
}

export function UploadRecordForm({ patient, onUploaded, uploadClient }: UploadRecordFormProps) {
  const contractClient = useSorobanClient()
  const appUploadClient = useRecordUploadClient()
  const client = uploadClient ?? appUploadClient
  const toast = useToast()

  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<RecordCategory | ''>('')
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState({ file: false, category: false, note: false })
  const [step, setStep] = useState<Step>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastUploaded, setLastUploaded] = useState<MedicalRecord | null>(null)

  const isBusy = step === 'encrypting' || step === 'uploading' || step === 'anchoring'
  const fileError = validateRecordFile(file)
  const categoryError = category === '' ? 'Choose a category for this record.' : null
  const noteError = validateRecordNote(note)
  const isValid = !fileError && !categoryError && !noteError

  function chooseFile(next: File | null) {
    setFile(next)
    setTouched((current) => ({ ...current, file: true }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched({ file: true, category: true, note: true })
    setError(null)

    if (!isValid || !file || !category || isBusy) {
      return
    }

    let phase: 'encrypting' | 'uploading' | 'anchoring' = 'encrypting'
    setStep(phase)
    setProgress(0)
    setLastUploaded(null)

    try {
      const plaintext = await buildRecordContent(file, category, note)
      const commitment = await sha256Hex(plaintext)
      const encrypted = await encryptRecordContent(plaintext)

      phase = 'uploading'
      setStep(phase)
      setProgress(0.15)
      const uploaded = await client.uploadRecord({
        patient,
        fileName: file.name,
        category,
        note: note.trim() || null,
        originalContentType: file.type || 'application/octet-stream',
        size: file.size,
        commitment,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyEnvelope: encrypted.keyEnvelope,
        contentType: 'application/json',
        onProgress: (fraction) => setProgress(0.15 + fraction * 0.7),
      })

      phase = 'anchoring'
      setStep(phase)
      setProgress(0.9)
      const record = await contractClient.anchorRecord({
        patient,
        title: file.name,
        category,
        commitment,
        storageUri: uploaded.storageUri,
        recordId: uploaded.recordId,
        contentType: 'application/json',
      })

      setStep('success')
      setProgress(1)
      setLastUploaded(record)
      setFile(null)
      setCategory('')
      setNote('')
      setTouched({ file: false, category: false, note: false })
      toast.success('Your encrypted record was uploaded and anchored on Stellar.', {
        title: 'Record uploaded',
      })
      onUploaded?.(record)
    } catch (err) {
      setStep('idle')
      setProgress(0)
      const message = describeUnknownError(err)
      setError(message)
      toast.error(message, { title: phase === 'anchoring' ? 'Anchoring failed' : 'Upload failed' })
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit} noValidate>
        <h2 className="text-lg font-bold text-white mb-2">Add a record</h2>
        <p className="text-slate-400 text-sm mb-6">
          Upload a document you already have, such as an external lab result. The file is encrypted in this
          browser before it leaves your device; only its commitment is written on-chain.
        </p>

        {lastUploaded && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-emerald-300">Record uploaded</p>
            <p className="mt-1 text-xs text-slate-300">
              {lastUploaded.title} is now anchored. <Link to={`/records/${encodeURIComponent(lastUploaded.id)}`}>View record</Link>
            </p>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="record-file"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5"
            >
              Record file
            </label>
            <input
              id="record-file"
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className={`input-field ${touched.file && fileError ? 'border-red-500/60' : ''}`}
              aria-invalid={touched.file && fileError ? true : undefined}
              aria-describedby={touched.file && fileError ? 'record-file-error' : 'record-file-helper'}
              disabled={isBusy}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            {touched.file && fileError ? (
              <p id="record-file-error" className="mt-1.5 text-xs text-red-400">
                {fileError}
              </p>
            ) : (
              <p id="record-file-helper" className="mt-1.5 text-xs text-slate-500">
                PDF, JPEG, PNG, WebP, text, or JSON · up to {formatFileSize(10 * 1024 * 1024)}.
                {file && ` Selected: ${file.name} (${formatFileSize(file.size)}).`}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="record-category"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5"
            >
              Category
            </label>
            <select
              id="record-category"
              className={`input-field ${touched.category && categoryError ? 'border-red-500/60' : ''}`}
              value={category}
              disabled={isBusy}
              aria-invalid={touched.category && categoryError ? true : undefined}
              aria-describedby={touched.category && categoryError ? 'record-category-error' : undefined}
              onChange={(event) => {
                setCategory(event.target.value as RecordCategory | '')
                setTouched((current) => ({ ...current, category: true }))
              }}
            >
              <option value="">Choose a category</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
            {touched.category && categoryError && (
              <p id="record-category-error" className="mt-1.5 text-xs text-red-400">
                {categoryError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="record-note"
              className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5"
            >
              Note (optional)
            </label>
            <textarea
              id="record-note"
              className={`input-field min-h-24 ${touched.note && noteError ? 'border-red-500/60' : ''}`}
              value={note}
              disabled={isBusy}
              maxLength={MAX_RECORD_NOTE_LENGTH + 1}
              aria-invalid={touched.note && noteError ? true : undefined}
              aria-describedby={touched.note && noteError ? 'record-note-error' : 'record-note-helper'}
              placeholder="Why are you adding this record?"
              onChange={(event) => {
                setNote(event.target.value)
                setTouched((current) => ({ ...current, note: true }))
              }}
            />
            {touched.note && noteError ? (
              <p id="record-note-error" className="mt-1.5 text-xs text-red-400">
                {noteError}
              </p>
            ) : (
              <p id="record-note-helper" className="mt-1.5 text-xs text-slate-500">
                {note.length}/{MAX_RECORD_NOTE_LENGTH} characters
              </p>
            )}
          </div>
        </div>

        {isBusy && (
          <div className="mt-6">
            <div
              role="progressbar"
              aria-label="Record upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="h-2 w-full overflow-hidden rounded-full bg-blue-950"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-blue transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400" role="status">
              {STEP_LABELS[step as Exclude<Step, 'idle' | 'success'>]} {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        <div className="mt-6">
          <Button type="submit" disabled={!isValid || isBusy} loading={isBusy} className="w-full py-2.5 font-semibold">
            {isBusy ? 'Uploading…' : 'Upload record'}
          </Button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          The encrypted upload currently runs against a local stub until locka-api publishes its upload
          contract. The on-chain commitment is real in mock-contract mode.
        </p>
      </form>
    </Card>
  )
}
