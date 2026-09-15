/**
 * In-memory implementation of `LockaContractClient` for local development.
 *
 * It never touches the network, the Freighter wallet, or a contract ID — it
 * answers from the seed in `mockSeed.ts` after an artificial delay, and applies
 * writes to its own copy of that seed so approve/deny/revoke flows behave like
 * the real thing within a session. Reload the page and you are back to the seed.
 *
 * The mock is single-patient: it answers for whatever address you ask about,
 * rewriting the seeded patient's address to the one you passed, so any
 * Freighter account works without reseeding.
 */
import { SorobanError } from './errors'
import { createMockState, MOCK_PATIENT_ADDRESS, type MockState } from './mockSeed'
import type {
  AccessRequest,
  ApproveAccessRequestInput,
  AuditEvent,
  AuditEventKind,
  ConsentGrant,
  DenyAccessRequestInput,
  LockaContractClient,
  MedicalRecord,
  Passport,
  Provider,
  RegisterPassportInput,
  RevokeConsentGrantInput,
} from './types'

/** Stands in for a Soroban round trip so loading states are visible in the UI. */
export const DEFAULT_MOCK_LATENCY_MS = 350

export interface MockClientOptions {
  /** Artificial per-call delay in ms. Pass 0 in tests to skip the timer. */
  latencyMs?: number
  /** Start with no registered passport, to exercise the onboarding flow. */
  unregistered?: boolean
  /** Clock for timestamps the mock writes. Inject a fixed one for deterministic tests. */
  now?: () => Date
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

/** Newest first, by ISO timestamp. */
function descending(a: string, b: string): number {
  return b.localeCompare(a)
}

export function createMockClient(options: MockClientOptions = {}): LockaContractClient {
  const { latencyMs = DEFAULT_MOCK_LATENCY_MS, unregistered = false, now = () => new Date() } = options

  const state: MockState = createMockState({ unregistered })
  let nextGrantSeq = 600
  let nextEventSeq = 4000
  let nextPassportSeq = 1

  /** Every call goes through here, so all of them share the artificial latency. */
  async function call<T>(run: () => T): Promise<T> {
    await delay(latencyMs)
    return run()
  }

  function timestamp(): string {
    return now().toISOString()
  }

  function recordAuditEvent(kind: AuditEventKind, subjectId: string, actor: string, actorLabel: string): void {
    state.ledger += 1
    state.auditEvents.unshift({
      id: `evt-${nextEventSeq++}`,
      kind,
      actor,
      actorLabel,
      subjectId,
      occurredAt: timestamp(),
      ledger: state.ledger,
      // Deterministic stand-in for a transaction hash — not a real one.
      txHash: `mock${String(state.ledger).padStart(60, '0')}`,
    })
  }

  /** Rewrites the seeded patient's address to the one the caller asked about. */
  function personalise<T extends { actor: string }>(event: T, patient: string): T {
    return event.actor === MOCK_PATIENT_ADDRESS ? { ...event, actor: patient } : event
  }

  function findRequest(requestId: string): AccessRequest {
    const request = state.accessRequests.find((candidate) => candidate.id === requestId)
    if (!request) {
      throw new SorobanError('contract', `No access request with id '${requestId}'.`)
    }
    return request
  }

  function findGrant(grantId: string): ConsentGrant {
    const grant = state.consentGrants.find((candidate) => candidate.id === grantId)
    if (!grant) {
      throw new SorobanError('contract', `No consent grant with id '${grantId}'.`)
    }
    return grant
  }

  return {
    getPassport(owner: string): Promise<Passport | null> {
      return call(() => (state.passport ? clone({ ...state.passport, owner }) : null))
    },

    registerPassport({
      owner,
      identityCommitment,
      recoveryAddress = null,
      displayName = null,
    }: RegisterPassportInput): Promise<Passport> {
      return call(() => {
        if (state.passport) {
          throw new SorobanError('contract', 'A passport is already registered for this account.')
        }
        if (!/^[0-9a-f]{64}$/i.test(identityCommitment)) {
          throw new SorobanError('contract', 'An identity commitment must be 32 hex-encoded bytes.')
        }
        state.passport = {
          id: `passport-mock-${nextPassportSeq++}`,
          owner,
          identityCommitment: identityCommitment.toLowerCase(),
          displayName,
          registeredAt: timestamp(),
          status: 'active',
          recoveryAddress,
        }
        recordAuditEvent('passport-registered', state.passport.id, owner, 'You')
        return clone(state.passport)
      })
    },

    getProvider(address: string): Promise<Provider | null> {
      return call(() => {
        const provider = state.providers.find((candidate) => candidate.address === address)
        return provider ? clone(provider) : null
      })
    },

    listAccessRequests(): Promise<AccessRequest[]> {
      return call(() =>
        clone(state.accessRequests).sort((a, b) => descending(a.requestedAt, b.requestedAt)),
      )
    },

    approveAccessRequest({ patient, requestId, expiresAt = null, scopes }: ApproveAccessRequestInput): Promise<ConsentGrant> {
      return call(() => {
        const request = findRequest(requestId)
        if (request.status !== 'pending') {
          throw new SorobanError('contract', `Access request '${requestId}' is already ${request.status}.`)
        }
        const grantedScopes = scopes ?? request.scopes
        const unrequested = grantedScopes.filter((scope) => !request.scopes.includes(scope))
        if (unrequested.length > 0) {
          throw new SorobanError(
            'contract',
            `Access request '${requestId}' did not ask for: ${unrequested.join(', ')}.`,
          )
        }

        request.status = 'approved'
        const grant: ConsentGrant = {
          id: `grant-${nextGrantSeq++}`,
          requestId,
          provider: clone(request.provider),
          scopes: [...grantedScopes],
          grantedAt: timestamp(),
          expiresAt,
          revokedAt: null,
          status: 'active',
        }
        state.consentGrants.unshift(grant)
        recordAuditEvent('access-approved', grant.id, patient, 'You')
        return clone(grant)
      })
    },

    denyAccessRequest({ patient, requestId }: DenyAccessRequestInput): Promise<AccessRequest> {
      return call(() => {
        const request = findRequest(requestId)
        if (request.status !== 'pending') {
          throw new SorobanError('contract', `Access request '${requestId}' is already ${request.status}.`)
        }
        request.status = 'denied'
        recordAuditEvent('access-denied', request.id, patient, 'You')
        return clone(request)
      })
    },

    listConsentGrants(): Promise<ConsentGrant[]> {
      return call(() => clone(state.consentGrants).sort((a, b) => descending(a.grantedAt, b.grantedAt)))
    },

    revokeConsentGrant({ patient, grantId }: RevokeConsentGrantInput): Promise<ConsentGrant> {
      return call(() => {
        const grant = findGrant(grantId)
        if (grant.status !== 'active') {
          throw new SorobanError('contract', `Consent grant '${grantId}' is already ${grant.status}.`)
        }
        grant.status = 'revoked'
        grant.revokedAt = timestamp()
        recordAuditEvent('access-revoked', grant.id, patient, 'You')
        return clone(grant)
      })
    },

    listRecords(): Promise<MedicalRecord[]> {
      return call(() => clone(state.records).sort((a, b) => descending(a.issuedAt, b.issuedAt)))
    },

    getRecord(recordId: string): Promise<MedicalRecord | null> {
      return call(() => {
        const record = state.records.find((candidate) => candidate.id === recordId)
        return record ? clone(record) : null
      })
    },

    listAuditEvents(patient: string): Promise<AuditEvent[]> {
      return call(() =>
        clone(state.auditEvents)
          .map((event) => personalise(event, patient))
          .sort((a, b) => descending(a.occurredAt, b.occurredAt)),
      )
    },
  }
}
