// @vitest-environment node
// These tests never touch the DOM, so they skip the jsdom environment.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scValToNative } from '@stellar/stellar-sdk'
import { MOCK_PATIENT_ADDRESS, MOCK_PROVIDERS } from './mockSeed'
import type { LockaContractClient } from './types'

vi.mock('./client', () => ({
  readContract: vi.fn(),
  invokeContract: vi.fn(),
}))

const { readContract, invokeContract } = await import('./client')
const { createRealClient } = await import('./realClient')

const PATIENT = MOCK_PATIENT_ADDRESS

function client(): LockaContractClient {
  return createRealClient()
}

/** The args the last call passed, decoded back to native values. */
function lastArgs(fn: typeof readContract | typeof invokeContract): unknown[] {
  const call = vi.mocked(fn).mock.lastCall
  return (call?.[0].args ?? []).map((arg) => scValToNative(arg))
}

beforeEach(() => {
  vi.stubEnv('VITE_PATIENT_IDENTITY_REGISTRY_CONTRACT_ID', 'C_PATIENT')
  vi.stubEnv('VITE_PROVIDER_REGISTRY_CONTRACT_ID', 'C_PROVIDER')
  vi.stubEnv('VITE_CONSENT_ACCESS_CONTROL_CONTRACT_ID', 'C_CONSENT')
  vi.stubEnv('VITE_RECORD_COMMITMENT_REGISTRY_CONTRACT_ID', 'C_RECORD')
  vi.stubEnv('VITE_DEVICE_ATTESTATION_REGISTRY_CONTRACT_ID', 'C_DEVICE')
  vi.stubEnv('VITE_AUDIT_EVENT_EMITTER_CONTRACT_ID', 'C_AUDIT')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(readContract).mockReset()
  vi.mocked(invokeContract).mockReset()
})

describe('createRealClient — routing', () => {
  it('reads the passport from the identity registry', async () => {
    vi.mocked(readContract).mockResolvedValue(null)
    await client().getPassport(PATIENT)

    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: 'C_PATIENT', method: 'get_passport' }),
    )
    expect(lastArgs(readContract)).toEqual([PATIENT])
  })

  it('reads requests, grants, records, and audit events from their own contracts', async () => {
    vi.mocked(readContract).mockResolvedValue([])
    const locka = client()

    await locka.listAccessRequests(PATIENT)
    expect(readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ contractId: 'C_CONSENT', method: 'list_access_requests' }),
    )

    await locka.listConsentGrants(PATIENT)
    expect(readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ contractId: 'C_CONSENT', method: 'list_consent_grants' }),
    )

    await locka.listRecords(PATIENT)
    expect(readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ contractId: 'C_RECORD', method: 'list_records' }),
    )

    await locka.listAuditEvents(PATIENT)
    expect(readContract).toHaveBeenLastCalledWith(
      expect.objectContaining({ contractId: 'C_AUDIT', method: 'list_audit_events' }),
    )
  })

  it('sends writes through invokeContract so they get signed', async () => {
    vi.mocked(invokeContract).mockResolvedValue({ id: 'grant-1', request_id: 'req-1', status: 'active' })
    await client().approveAccessRequest({
      patient: PATIENT,
      requestId: 'req-1',
      expiresAt: '2026-09-01T00:00:00.000Z',
      scopes: ['lab-result'],
    })

    expect(invokeContract).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: 'C_CONSENT', method: 'approve_access_request' }),
    )
    expect(lastArgs(invokeContract)).toEqual([PATIENT, 'req-1', 1_788_220_800n, ['lab-result']])
    expect(readContract).not.toHaveBeenCalled()
  })
})

describe('createRealClient — decoding', () => {
  it('decodes a passport struct, converting ledger seconds to ISO', async () => {
    vi.mocked(readContract).mockResolvedValue({
      id: 'passport-1',
      owner: PATIENT,
      identity_commitment: 'a'.repeat(64),
      display_name: 'Amara Okafor',
      registered_at: 1_772_615_520n,
      status: 'active',
      recovery_address: MOCK_PROVIDERS.insurer.address,
    })

    await expect(client().getPassport(PATIENT)).resolves.toEqual({
      id: 'passport-1',
      owner: PATIENT,
      identityCommitment: 'a'.repeat(64),
      displayName: 'Amara Okafor',
      registeredAt: '2026-03-04T09:12:00.000Z',
      status: 'active',
      recoveryAddress: MOCK_PROVIDERS.insurer.address,
    })
  })

  it('returns null when no passport is registered', async () => {
    vi.mocked(readContract).mockResolvedValue(undefined)
    await expect(client().getPassport(PATIENT)).resolves.toBeNull()
  })

  it('decodes a grant whose provider comes back as a bare address', async () => {
    vi.mocked(readContract).mockResolvedValue([
      {
        id: 'grant-1',
        request_id: 'req-1',
        provider: MOCK_PROVIDERS.lab.address,
        scopes: ['lab-result'],
        granted_at: 1_784_721_720n,
        expires_at: null,
        revoked_at: null,
        status: 'active',
      },
    ])

    const [grant] = await client().listConsentGrants(PATIENT)
    expect(grant).toEqual({
      id: 'grant-1',
      requestId: 'req-1',
      provider: { address: MOCK_PROVIDERS.lab.address, name: MOCK_PROVIDERS.lab.address, kind: 'other', verified: false },
      scopes: ['lab-result'],
      grantedAt: '2026-07-22T12:02:00.000Z',
      expiresAt: null,
      revokedAt: null,
      status: 'active',
    })
  })

  it('never reads an unrecognised status as live access', async () => {
    vi.mocked(readContract).mockResolvedValue([{ id: 'grant-1', status: 'Suspended_By_Contract' }])

    const [grant] = await client().listConsentGrants(PATIENT)
    expect(grant.status).toBe('expired')
  })

  it('reads the passport back when the register call returns void', async () => {
    vi.mocked(invokeContract).mockResolvedValue(undefined)
    vi.mocked(readContract).mockResolvedValue({ id: 'passport-1', owner: PATIENT, display_name: 'Amara Okafor' })

    await expect(
      client().registerPassport({ owner: PATIENT, identityCommitment: 'AB'.repeat(32) }),
    ).resolves.toMatchObject({ id: 'passport-1', displayName: 'Amara Okafor' })
    // The commitment goes on-chain lower-cased, so the same identity always hashes alike.
    expect(lastArgs(invokeContract)).toEqual([PATIENT, 'ab'.repeat(32), null, null])
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: 'C_PATIENT', method: 'get_passport' }),
    )
  })

  it('decodes audit events, defaulting the actor label to the actor address', async () => {
    vi.mocked(readContract).mockResolvedValue([
      {
        id: 'evt-1',
        event_type: 'access_approved',
        actor: PATIENT,
        subject_id: 'grant-1',
        occurred_at: 1_784_721_720n,
        ledger: 1_261_882n,
        tx_hash: 'ab12',
      },
    ])

    const [event] = await client().listAuditEvents(PATIENT)
    expect(event).toEqual({
      id: 'evt-1',
      kind: 'access-approved',
      actor: PATIENT,
      actorLabel: PATIENT,
      subjectId: 'grant-1',
      occurredAt: '2026-07-22T12:02:00.000Z',
      ledger: 1_261_882,
      txHash: 'ab12',
    })
  })
})
