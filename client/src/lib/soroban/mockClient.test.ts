// @vitest-environment node
// These tests never touch the DOM, so they skip the jsdom environment.
import { describe, expect, it, vi } from 'vitest'
import { StrKey } from '@stellar/stellar-sdk'
import { createMockClient } from './mockClient'
import { createRealClient } from './realClient'
import { MOCK_PATIENT_ADDRESS, MOCK_PROVIDERS } from './mockSeed'
import { SorobanError } from './errors'
import type { LockaContractClient } from './types'

/**
 * Every method of the interface. Typing this as a `Record` keyed by
 * `keyof LockaContractClient` makes the compiler reject the table if a method
 * is added to the interface and not listed here.
 */
const CLIENT_METHODS: Record<keyof LockaContractClient, true> = {
  getPassport: true,
  registerPassport: true,
  updateRecoveryAddress: true,
  getProvider: true,
  listAccessRequests: true,
  approveAccessRequest: true,
  denyAccessRequest: true,
  listConsentGrants: true,
  revokeConsentGrant: true,
  listRecords: true,
  getRecord: true,
  listAuditEvents: true,
}
const METHOD_NAMES = Object.keys(CLIENT_METHODS) as (keyof LockaContractClient)[]

const FIXED_NOW = new Date('2026-08-20T12:00:00.000Z')

function mock(options: { unregistered?: boolean } = {}): LockaContractClient {
  return createMockClient({ latencyMs: 0, now: () => FIXED_NOW, ...options })
}

async function catchError(promise: Promise<unknown>): Promise<SorobanError> {
  try {
    await promise
  } catch (err) {
    return err as SorobanError
  }
  throw new Error('Expected the promise to reject')
}

describe('createMockClient — interface conformance', () => {
  it('implements every method of LockaContractClient', () => {
    const client = mock()
    for (const method of METHOD_NAMES) {
      expect(typeof client[method], `${method} should be callable on the mock`).toBe('function')
    }
  })

  it('exposes exactly the same surface as the real Soroban client', () => {
    expect(Object.keys(mock()).sort()).toEqual(Object.keys(createRealClient()).sort())
  })

  it('resolves every read method without a wallet, RPC URL, or contract ID', async () => {
    const client = mock()
    await expect(client.getPassport(MOCK_PATIENT_ADDRESS)).resolves.not.toBeNull()
    await expect(client.getProvider(MOCK_PROVIDERS.lab.address)).resolves.not.toBeNull()
    await expect(client.listAccessRequests(MOCK_PATIENT_ADDRESS)).resolves.toBeInstanceOf(Array)
    await expect(client.listConsentGrants(MOCK_PATIENT_ADDRESS)).resolves.toBeInstanceOf(Array)
    await expect(client.listRecords(MOCK_PATIENT_ADDRESS)).resolves.toBeInstanceOf(Array)
    await expect(client.listAuditEvents(MOCK_PATIENT_ADDRESS)).resolves.toBeInstanceOf(Array)
  })
})

describe('createMockClient — seed data', () => {
  it('starts from a registered passport', async () => {
    await expect(mock().getPassport(MOCK_PATIENT_ADDRESS)).resolves.toEqual({
      id: 'passport-7f3a91',
      owner: MOCK_PATIENT_ADDRESS,
      identityCommitment: '51d0b0df0dfd814e68a3b87ccee4c0ca232e7e58cb7078fab676d2a3cbfa9b6e',
      displayName: 'Amara Okafor',
      registeredAt: '2026-03-04T09:12:00.000Z',
      status: 'active',
      recoveryAddress: MOCK_PROVIDERS.insurer.address,
    })
  })

  it('covers the states the UI has to render', async () => {
    const client = mock()
    const [requests, grants, records, events] = await Promise.all([
      client.listAccessRequests(MOCK_PATIENT_ADDRESS),
      client.listConsentGrants(MOCK_PATIENT_ADDRESS),
      client.listRecords(MOCK_PATIENT_ADDRESS),
      client.listAuditEvents(MOCK_PATIENT_ADDRESS),
    ])

    expect(requests.filter((request) => request.status === 'pending').length).toBeGreaterThanOrEqual(1)
    expect(grants.filter((grant) => grant.status === 'active').length).toBeGreaterThanOrEqual(1)
    expect(records.length).toBeGreaterThanOrEqual(2)
    expect(events.length).toBeGreaterThanOrEqual(3)

    // Revoked and expired grants are seeded too, so every badge state has data.
    expect(grants.map((grant) => grant.status)).toEqual(expect.arrayContaining(['active', 'revoked', 'expired']))
    expect(new Set(records.map((record) => record.category)).size).toBeGreaterThan(1)
  })

  it('returns the same data from two independently created clients', async () => {
    const [first, second] = [mock(), mock()]
    await expect(first.getPassport(MOCK_PATIENT_ADDRESS)).resolves.toEqual(
      await second.getPassport(MOCK_PATIENT_ADDRESS),
    )
    await expect(first.listAccessRequests(MOCK_PATIENT_ADDRESS)).resolves.toEqual(
      await second.listAccessRequests(MOCK_PATIENT_ADDRESS),
    )
    await expect(first.listConsentGrants(MOCK_PATIENT_ADDRESS)).resolves.toEqual(
      await second.listConsentGrants(MOCK_PATIENT_ADDRESS),
    )
    await expect(first.listRecords(MOCK_PATIENT_ADDRESS)).resolves.toEqual(await second.listRecords(MOCK_PATIENT_ADDRESS))
    await expect(first.listAuditEvents(MOCK_PATIENT_ADDRESS)).resolves.toEqual(
      await second.listAuditEvents(MOCK_PATIENT_ADDRESS),
    )
  })

  it('uses addresses that decode as real Stellar public keys', () => {
    expect(StrKey.isValidEd25519PublicKey(MOCK_PATIENT_ADDRESS)).toBe(true)
    for (const provider of Object.values(MOCK_PROVIDERS)) {
      expect(StrKey.isValidEd25519PublicKey(provider.address), provider.name).toBe(true)
    }
  })

  it('sorts every list newest first', async () => {
    const client = mock()
    const requestedAt = (await client.listAccessRequests(MOCK_PATIENT_ADDRESS)).map((r) => r.requestedAt)
    const grantedAt = (await client.listConsentGrants(MOCK_PATIENT_ADDRESS)).map((g) => g.grantedAt)
    const occurredAt = (await client.listAuditEvents(MOCK_PATIENT_ADDRESS)).map((e) => e.occurredAt)

    for (const timestamps of [requestedAt, grantedAt, occurredAt]) {
      expect(timestamps).toEqual([...timestamps].sort().reverse())
    }
  })

  it('answers for whichever address is asked about, so any wallet works', async () => {
    const otherAddress = MOCK_PROVIDERS.hospital.address
    const client = mock()

    await expect(client.getPassport(otherAddress)).resolves.toMatchObject({ owner: otherAddress })
    const events = await client.listAuditEvents(otherAddress)
    expect(events.filter((event) => event.actorLabel === 'You').every((event) => event.actor === otherAddress)).toBe(true)
  })

  it('looks up a single provider and record by id', async () => {
    const client = mock()
    await expect(client.getProvider(MOCK_PROVIDERS.clinic.address)).resolves.toEqual(MOCK_PROVIDERS.clinic)
    await expect(client.getProvider('GNOPE')).resolves.toBeNull()
    await expect(client.getRecord('rec-9f21')).resolves.toMatchObject({ title: 'Full blood count panel' })
    await expect(client.getRecord('rec-nope')).resolves.toBeNull()
  })

  it('hands out copies, so a caller mutating a result cannot corrupt the seed', async () => {
    const client = mock()
    const records = await client.listRecords(MOCK_PATIENT_ADDRESS)
    records.pop()
    records[0].title = 'tampered'

    const reread = await client.listRecords(MOCK_PATIENT_ADDRESS)
    expect(reread).toHaveLength(records.length + 1)
    expect(reread[0].title).not.toBe('tampered')
  })
})

describe('createMockClient — writes', () => {
  const pendingRequestId = 'req-1042'

  it('approves a pending request into an active grant and logs an audit event', async () => {
    const client = mock()
    const grant = await client.approveAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: pendingRequestId })

    expect(grant).toMatchObject({
      requestId: pendingRequestId,
      status: 'active',
      grantedAt: FIXED_NOW.toISOString(),
      revokedAt: null,
      provider: MOCK_PROVIDERS.hospital,
    })

    const requests = await client.listAccessRequests(MOCK_PATIENT_ADDRESS)
    expect(requests.find((request) => request.id === pendingRequestId)?.status).toBe('approved')

    const grants = await client.listConsentGrants(MOCK_PATIENT_ADDRESS)
    expect(grants.map((candidate) => candidate.id)).toContain(grant.id)

    const [latest] = await client.listAuditEvents(MOCK_PATIENT_ADDRESS)
    expect(latest).toMatchObject({ kind: 'access-approved', subjectId: grant.id, actor: MOCK_PATIENT_ADDRESS })
  })

  it('narrows a grant to a subset of the requested scopes', async () => {
    const client = mock()
    const grant = await client.approveAccessRequest({
      patient: MOCK_PATIENT_ADDRESS,
      requestId: pendingRequestId,
      scopes: ['lab-result'],
      expiresAt: '2026-09-20T12:00:00.000Z',
    })

    expect(grant.scopes).toEqual(['lab-result'])
    expect(grant.expiresAt).toBe('2026-09-20T12:00:00.000Z')
  })

  it('refuses to grant a scope the provider never asked for', async () => {
    const client = mock()
    await expect(
      client.approveAccessRequest({
        patient: MOCK_PATIENT_ADDRESS,
        requestId: pendingRequestId,
        scopes: ['prescription'],
      }),
    ).rejects.toThrow(/did not ask for/i)
  })

  it('denies a pending request and logs it', async () => {
    const client = mock()
    const request = await client.denyAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: pendingRequestId })

    expect(request.status).toBe('denied')
    const [latest] = await client.listAuditEvents(MOCK_PATIENT_ADDRESS)
    expect(latest).toMatchObject({ kind: 'access-denied', subjectId: pendingRequestId })
  })

  it('revokes an active grant and logs it', async () => {
    const client = mock()
    const grant = await client.revokeConsentGrant({ patient: MOCK_PATIENT_ADDRESS, grantId: 'grant-508' })

    expect(grant).toMatchObject({ status: 'revoked', revokedAt: FIXED_NOW.toISOString() })
    const [latest] = await client.listAuditEvents(MOCK_PATIENT_ADDRESS)
    expect(latest).toMatchObject({ kind: 'access-revoked', subjectId: 'grant-508' })
  })

  it('registers a passport when started unregistered', async () => {
    const client = mock({ unregistered: true })
    await expect(client.getPassport(MOCK_PATIENT_ADDRESS)).resolves.toBeNull()

    const passport = await client.registerPassport({
      owner: MOCK_PATIENT_ADDRESS,
      identityCommitment: 'A'.repeat(64),
      recoveryAddress: null,
    })

    expect(passport).toMatchObject({
      owner: MOCK_PATIENT_ADDRESS,
      // Commitments are normalised to lower case, whichever way they were typed.
      identityCommitment: 'a'.repeat(64),
      displayName: null,
      status: 'active',
      registeredAt: FIXED_NOW.toISOString(),
    })
    await expect(client.getPassport(MOCK_PATIENT_ADDRESS)).resolves.toMatchObject({ id: passport.id })
    const [latest] = await client.listAuditEvents(MOCK_PATIENT_ADDRESS)
    expect(latest).toMatchObject({ kind: 'passport-registered', subjectId: passport.id })
  })

  it('updates the recovery address on an existing passport', async () => {
    const client = mock()
    const newRecovery = MOCK_PROVIDERS.hospital.address

    const passport = await client.updateRecoveryAddress({
      owner: MOCK_PATIENT_ADDRESS,
      recoveryAddress: newRecovery,
    })

    expect(passport.recoveryAddress).toBe(newRecovery)
    await expect(client.getPassport(MOCK_PATIENT_ADDRESS)).resolves.toMatchObject({
      recoveryAddress: newRecovery,
    })
  })

  it('keeps each client instance isolated', async () => {
    const [first, second] = [mock(), mock()]
    await first.denyAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: pendingRequestId })

    const untouched = await second.listAccessRequests(MOCK_PATIENT_ADDRESS)
    expect(untouched.find((request) => request.id === pendingRequestId)?.status).toBe('pending')
  })
})

describe('createMockClient — failure modes', () => {
  it('rejects with a contract-stage SorobanError for an unknown request', async () => {
    const error = await catchError(
      mock().approveAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: 'req-nope' }),
    )

    expect(error).toBeInstanceOf(SorobanError)
    expect(error.stage).toBe('contract')
  })

  it('rejects a request that was already settled', async () => {
    const client = mock()
    await client.denyAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: 'req-1042' })

    await expect(
      client.approveAccessRequest({ patient: MOCK_PATIENT_ADDRESS, requestId: 'req-1042' }),
    ).rejects.toThrow(/already denied/i)
  })

  it('rejects revoking a grant that is not active', async () => {
    await expect(
      mock().revokeConsentGrant({ patient: MOCK_PATIENT_ADDRESS, grantId: 'grant-455' }),
    ).rejects.toThrow(/already revoked/i)
  })

  it('rejects registering a second passport', async () => {
    await expect(
      mock().registerPassport({ owner: MOCK_PATIENT_ADDRESS, identityCommitment: 'a'.repeat(64) }),
    ).rejects.toThrow(/already registered/i)
  })

  it('rejects an identity commitment that is not 32 hex-encoded bytes', async () => {
    await expect(
      mock({ unregistered: true }).registerPassport({ owner: MOCK_PATIENT_ADDRESS, identityCommitment: 'nope' }),
    ).rejects.toThrow(/32 hex-encoded bytes/i)
  })

  it('rejects updating the recovery address when there is no passport', async () => {
    await expect(
      mock({ unregistered: true }).updateRecoveryAddress({
        owner: MOCK_PATIENT_ADDRESS,
        recoveryAddress: MOCK_PROVIDERS.hospital.address,
      }),
    ).rejects.toThrow(/no passport is registered/i)
  })

  it('rejects setting the recovery address to the one already on file', async () => {
    const client = mock()
    const passport = await client.getPassport(MOCK_PATIENT_ADDRESS)

    await expect(
      client.updateRecoveryAddress({ owner: MOCK_PATIENT_ADDRESS, recoveryAddress: passport!.recoveryAddress! }),
    ).rejects.toThrow(/already the recovery address/i)
  })
})

describe('createMockClient — artificial latency', () => {
  it('waits the configured delay before resolving', async () => {
    vi.useFakeTimers()
    try {
      const client = createMockClient({ latencyMs: 250 })
      let settled = false
      const pending = client.listRecords(MOCK_PATIENT_ADDRESS).then(() => {
        settled = true
      })

      await vi.advanceTimersByTimeAsync(249)
      expect(settled).toBe(false)

      await vi.advanceTimersByTimeAsync(1)
      await pending
      expect(settled).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
