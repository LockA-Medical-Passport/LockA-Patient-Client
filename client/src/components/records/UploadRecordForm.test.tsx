import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../toast'
import {
  MAX_RECORD_UPLOAD_BYTES,
  RecordUploadProvider,
  createStubRecordUploadClient,
  type RecordUploadClient,
} from '../../lib/records'
import { MOCK_PATIENT_ADDRESS, SorobanClientProvider, createMockClient } from '../../lib/soroban'
import type { LockaContractClient } from '../../lib/soroban'
import { UploadRecordForm } from './UploadRecordForm'

function renderForm(
  uploadClient: RecordUploadClient = createStubRecordUploadClient({ latencyMs: 0 }),
  contractClient: LockaContractClient = createMockClient({ latencyMs: 0 }),
) {
  render(
    <MemoryRouter>
      <ToastProvider>
        <SorobanClientProvider client={contractClient}>
          <RecordUploadProvider client={uploadClient}>
            <UploadRecordForm patient={MOCK_PATIENT_ADDRESS} />
          </RecordUploadProvider>
        </SorobanClientProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
  return { uploadClient, contractClient, user: userEvent.setup({ applyAccept: false }) }
}

function fileInput() {
  return screen.getByLabelText(/record file/i) as HTMLInputElement
}

function oversizedFile(): File {
  const file = new File(['small'], 'huge.pdf', { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: MAX_RECORD_UPLOAD_BYTES + 1 })
  return file
}

describe('UploadRecordForm — validation', () => {
  it('starts with upload disabled and explains the accepted files', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /upload record/i })).toBeDisabled()
    expect(screen.getByText(/PDF, JPEG, PNG, WebP, text, or JSON/i)).toBeInTheDocument()
  })

  it('rejects an unsupported file type with a clear message', async () => {
    const { user } = renderForm()
    await user.upload(fileInput(), new File(['data'], 'malware.exe', { type: 'application/x-msdownload' }))

    expect(await screen.findByText(/unsupported file type/i)).toBeInTheDocument()
    expect(screen.getByText(/PDF, JPEG, PNG, WebP, text, or JSON/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload record/i })).toBeDisabled()
  })

  it('rejects a file over the size limit', async () => {
    const { user } = renderForm()
    await user.upload(fileInput(), oversizedFile())

    expect(await screen.findByText(/10 MB or smaller/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload record/i })).toBeDisabled()
  })

  it('requires a category and caps the optional note', async () => {
    const { user } = renderForm()
    await user.upload(fileInput(), new File(['hello'], 'result.txt', { type: 'text/plain' }))

    const form = screen.getByRole('button', { name: /upload record/i }).closest('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(await screen.findByText(/choose a category for this record/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/category/i), 'lab-result')
    await user.click(screen.getByLabelText(/note \(optional\)/i))
    await user.paste('a'.repeat(501))
    expect(await screen.findByText(/500 characters or fewer/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload record/i })).toBeDisabled()
  })
})

describe('UploadRecordForm — upload paths', () => {
  it('encrypts first, uploads, then anchors the matching commitment', async () => {
    const uploadClient = createStubRecordUploadClient({ latencyMs: 0 })
    const upload = vi.spyOn(uploadClient, 'uploadRecord')
    const contractClient = createMockClient({ latencyMs: 0 })
    const anchor = vi.spyOn(contractClient, 'anchorRecord')
    const { user } = renderForm(uploadClient, contractClient)

    await user.upload(fileInput(), new File(['haemoglobin 13.2'], 'blood-test.txt', { type: 'text/plain' }))
    await user.selectOptions(screen.getByLabelText(/category/i), 'lab-result')
    await user.type(screen.getByLabelText(/note \(optional\)/i), 'External result')
    await user.click(screen.getByRole('button', { name: /upload record/i }))

    expect(await screen.findByText(/blood-test.txt is now anchored/i)).toBeInTheDocument()

    await waitFor(() => expect(upload).toHaveBeenCalledOnce())
    const uploadInput = upload.mock.calls[0][0]
    expect(uploadInput).toMatchObject({
      patient: MOCK_PATIENT_ADDRESS,
      category: 'lab-result',
      note: 'External result',
      originalContentType: 'text/plain',
      contentType: 'application/json',
    })
    expect(uploadInput.commitment).toMatch(/^[0-9a-f]{64}$/)
    expect(uploadInput.ciphertext).not.toContain('haemoglobin')
    expect(uploadInput.iv).not.toBe('')
    expect(uploadInput.keyEnvelope).not.toBe('')

    await waitFor(() => expect(anchor).toHaveBeenCalledOnce())
    expect(anchor.mock.calls[0][0]).toMatchObject({
      patient: MOCK_PATIENT_ADDRESS,
      title: 'blood-test.txt',
      category: 'lab-result',
      commitment: uploadInput.commitment,
    })
    expect(anchor.mock.calls[0][0].storageUri).toMatch(/^locka:\/\/records\/rec-upload-/)
    expect(anchor.mock.calls[0][0].recordId).toMatch(/^rec-upload-/)
  })

  it('shows an upload progress indicator while the encrypted blob is in flight', async () => {
    const uploadClient = createStubRecordUploadClient({ latencyMs: 200 })
    const { user } = renderForm(uploadClient)

    await user.upload(fileInput(), new File(['hello'], 'result.txt', { type: 'text/plain' }))
    await user.selectOptions(screen.getByLabelText(/category/i), 'lab-result')
    await user.click(screen.getByRole('button', { name: /upload record/i }))

    const progress = await screen.findByRole('progressbar', { name: /record upload progress/i })
    expect(progress).toBeInTheDocument()
    expect(screen.getByText(/encrypting your file|uploading the encrypted record|anchoring the commitment/i)).toBeInTheDocument()

    expect(await screen.findByText(/result.txt is now anchored/i)).toBeInTheDocument()
  })

  it('does not anchor and surfaces a clear error when the off-chain upload fails', async () => {
    const uploadClient = createStubRecordUploadClient({ latencyMs: 0, failWith: 'The record vault rejected the file.' })
    const contractClient = createMockClient({ latencyMs: 0 })
    const anchor = vi.spyOn(contractClient, 'anchorRecord')
    const { user } = renderForm(uploadClient, contractClient)

    await user.upload(fileInput(), new File(['hello'], 'result.txt', { type: 'text/plain' }))
    await user.selectOptions(screen.getByLabelText(/category/i), 'lab-result')
    await user.click(screen.getByRole('button', { name: /upload record/i }))

    const alerts = await screen.findAllByRole('alert')
    expect(alerts.some((alert) => alert.textContent?.includes('The record vault rejected the file.'))).toBe(true)
    expect(screen.getByText('Upload failed')).toBeInTheDocument()
    expect(anchor).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /upload record/i })).toBeEnabled()
  })
})
