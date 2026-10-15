import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  MOCK_RECORD_CONTENTS,
  RecordContentProvider,
  createMockRecordContentClient,
  type RecordContentClient,
} from '../lib/records'
import { SorobanClientProvider, createMockClient, type LockaContractClient } from '../lib/soroban'
import { RecordDetailPage } from './RecordDetailPage'

function renderPage(
  contractClient: LockaContractClient = createMockClient({ latencyMs: 0 }),
  contentClient: RecordContentClient = createMockRecordContentClient({ latencyMs: 0 }),
  recordId = 'rec-9f21',
) {
  return render(
    <MemoryRouter initialEntries={[`/records/${recordId}`]}>
      <SorobanClientProvider client={contractClient}>
        <RecordContentProvider client={contentClient}>
          <Routes>
            <Route path="/records/:id" element={<RecordDetailPage />} />
          </Routes>
        </RecordContentProvider>
      </SorobanClientProvider>
    </MemoryRouter>,
  )
}

describe('RecordDetailPage', () => {
  it('shows a loading state while content is fetched and hashed', () => {
    renderPage(
      createMockClient({ latencyMs: 20 }),
      createMockRecordContentClient({ latencyMs: 20 }),
    )

    expect(screen.getByText(/loading and verifying record/i)).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown commitment', async () => {
    renderPage(undefined, undefined, 'rec-missing')

    expect(await screen.findByRole('heading', { name: /record not found/i })).toBeInTheDocument()
  })

  it('shows full content and a locally-computed verified indicator when hashes match', async () => {
    renderPage()

    expect(await screen.findByText(/verified on-chain/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/verified on-chain/i)
    expect(screen.getByText('13.2 g/dL')).toBeInTheDocument()
    expect(screen.getByText('Zenith Diagnostics Lab')).toBeInTheDocument()
  })

  it('shows a prominent mismatch warning when fetched content was changed', async () => {
    const tampered = {
      ...MOCK_RECORD_CONTENTS,
      'rec-9f21': '{"test":"Full blood count","interpretation":"tampered"}',
    }
    renderPage(
      createMockClient({ latencyMs: 0 }),
      createMockRecordContentClient({ latencyMs: 0, contents: tampered }),
    )

    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent(/hash mismatch/i)
    expect(warning).toHaveTextContent(/do not rely on this record/i)
    expect(screen.queryByText(/verified on-chain/i)).not.toBeInTheDocument()
  })

  it('handles an off-chain content failure without crashing', async () => {
    const contentClient = createMockRecordContentClient({ latencyMs: 0, unavailableRecordIds: ['rec-9f21'] })
    const getContent = vi.spyOn(contentClient, 'getRecordContent')
    renderPage(createMockClient({ latencyMs: 0 }), contentClient)

    expect(await screen.findByRole('heading', { name: /record content unavailable/i })).toBeInTheDocument()
    expect(getContent).toHaveBeenCalledOnce()
  })
})

