/**
 * `LockaContractClient` backed by the deployed Soroban contracts: reads go
 * through `readContract` (simulation only), writes through `invokeContract`
 * (simulate → sign with Freighter → submit → poll).
 *
 * The contract method names in `METHODS` and the field names the decoders
 * accept are provisional — locka-contracts has not published bindings yet,
 * which is exactly why `createMockClient()` exists. When the bindings land,
 * this file is the only one that changes: the interface, the mock, and every
 * feature built on top stay as they are. Decoding is deliberately tolerant
 * (snake_case or camelCase, ledger seconds or ISO strings) so a naming
 * mismatch degrades a field rather than crashing a page.
 */
import { nativeToScVal, xdr } from '@stellar/stellar-sdk'
import { invokeContract, readContract } from './client'
import { getContractId } from './contracts'
import { SorobanError } from './errors'
import type {
  AccessRequest,
  AccessRequestStatus,
  ApproveAccessRequestInput,
  AuditEvent,
  AuditEventKind,
  ConsentGrant,
  ConsentGrantStatus,
  DenyAccessRequestInput,
  LockaContractClient,
  MedicalRecord,
  Passport,
  PassportStatus,
  Provider,
  ProviderKind,
  RecordCategory,
  RegisterPassportInput,
  RevokeConsentGrantInput,
} from './types'

/** Contract-side method names, in one place so bindings changes stay local. */
const METHODS = {
  getPassport: 'get_passport',
  registerPassport: 'register_passport',
  getProvider: 'get_provider',
  listAccessRequests: 'list_access_requests',
  approveAccessRequest: 'approve_access_request',
  denyAccessRequest: 'deny_access_request',
  listConsentGrants: 'list_consent_grants',
  revokeConsentGrant: 'revoke_consent_grant',
  listRecords: 'list_records',
  getRecord: 'get_record',
  listAuditEvents: 'list_audit_events',
} as const

const PROVIDER_KINDS: readonly ProviderKind[] = ['hospital', 'clinic', 'lab', 'pharmacy', 'insurer', 'other']
const RECORD_CATEGORIES: readonly RecordCategory[] = [
  'lab-result',
  'imaging',
  'prescription',
  'treatment-note',
  'immunization',
  'allergy',
  'other',
]
const ACCESS_REQUEST_STATUSES: readonly AccessRequestStatus[] = ['pending', 'approved', 'denied', 'expired']
const CONSENT_GRANT_STATUSES: readonly ConsentGrantStatus[] = ['active', 'revoked', 'expired']
const PASSPORT_STATUSES: readonly PassportStatus[] = ['active', 'suspended']
const AUDIT_EVENT_KINDS: readonly AuditEventKind[] = [
  'passport-registered',
  'access-requested',
  'access-approved',
  'access-denied',
  'access-revoked',
  'record-anchored',
  'record-viewed',
  'other',
]

// --- argument encoding -------------------------------------------------------

function addressArg(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: 'address' })
}

function stringArg(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: 'string' })
}

function optionalStringArg(value: string | null | undefined): xdr.ScVal {
  return value == null ? xdr.ScVal.scvVoid() : stringArg(value)
}

function scopesArg(scopes: readonly RecordCategory[]): xdr.ScVal {
  return xdr.ScVal.scvVec(scopes.map((scope) => stringArg(scope)))
}

/** Contracts take ledger time in whole seconds; the app speaks ISO 8601. */
function optionalTimestampArg(iso: string | null | undefined): xdr.ScVal {
  if (iso == null) {
    return xdr.ScVal.scvVoid()
  }
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) {
    throw new SorobanError('simulation', `'${iso}' is not a valid ISO 8601 timestamp.`)
  }
  return nativeToScVal(BigInt(Math.floor(parsed / 1000)), { type: 'u64' })
}

// --- result decoding ---------------------------------------------------------

type RawStruct = Record<string, unknown>

function asStruct(value: unknown): RawStruct | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as RawStruct) : null
}

/** Reads the first present key, so snake_case and camelCase both decode. */
function pick(raw: RawStruct, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) {
      return raw[key]
    }
  }
  return undefined
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }
  return fallback
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function flag(value: unknown): boolean {
  return value === true
}

function count(value: unknown): number {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const candidate = typeof value === 'string' ? value.toLowerCase().replaceAll('_', '-') : ''
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback
}

const EPOCH = new Date(0).toISOString()

/** Ledger timestamps arrive as u64 seconds; ISO strings pass straight through. */
function timestamp(value: unknown): string {
  if (typeof value === 'bigint' || typeof value === 'number') {
    const seconds = Number(value)
    return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : EPOCH
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (value.trim() !== '' && Number.isFinite(numeric)) {
      return new Date(numeric * 1000).toISOString()
    }
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }
  return EPOCH
}

function optionalTimestamp(value: unknown): string | null {
  return value == null ? null : timestamp(value)
}

function scopes(value: unknown): RecordCategory[] {
  return list(value).map((scope) => oneOf(scope, RECORD_CATEGORIES, 'other'))
}

/** Providers come back either as a struct or as a bare account address. */
function toProvider(value: unknown): Provider {
  if (typeof value === 'string') {
    return { address: value, name: value, kind: 'other', verified: false }
  }
  const raw = asStruct(value)
  if (!raw) {
    return { address: '', name: 'Unknown provider', kind: 'other', verified: false }
  }
  const address = text(pick(raw, 'address', 'account', 'provider', 'id'))
  return {
    address,
    name: text(pick(raw, 'name', 'display_name', 'displayName'), address || 'Unknown provider'),
    kind: oneOf(pick(raw, 'kind', 'provider_kind', 'providerKind', 'type'), PROVIDER_KINDS, 'other'),
    verified: flag(pick(raw, 'verified', 'is_verified', 'isVerified')),
  }
}

function toPassport(value: unknown): Passport | null {
  const raw = asStruct(value)
  if (!raw) {
    return null
  }
  return {
    id: text(pick(raw, 'id', 'passport_id', 'passportId')),
    owner: text(pick(raw, 'owner', 'patient', 'address')),
    identityCommitment: text(pick(raw, 'identity_commitment', 'identityCommitment', 'commitment')),
    displayName: optionalText(pick(raw, 'display_name', 'displayName', 'name')),
    registeredAt: timestamp(pick(raw, 'registered_at', 'registeredAt', 'created_at')),
    // An unrecognised status is treated as suspended — never as more access than we can confirm.
    status: oneOf(pick(raw, 'status'), PASSPORT_STATUSES, 'suspended'),
    recoveryAddress: optionalText(pick(raw, 'recovery_address', 'recoveryAddress', 'recovery')),
  }
}

function toAccessRequest(value: unknown): AccessRequest {
  const raw = asStruct(value) ?? {}
  return {
    id: text(pick(raw, 'id', 'request_id', 'requestId')),
    provider: toProvider(pick(raw, 'provider', 'requester', 'provider_address')),
    scopes: scopes(pick(raw, 'scopes', 'categories')),
    reason: text(pick(raw, 'reason', 'purpose')),
    requestedAt: timestamp(pick(raw, 'requested_at', 'requestedAt', 'created_at')),
    expiresAt: timestamp(pick(raw, 'expires_at', 'expiresAt')),
    status: oneOf(pick(raw, 'status'), ACCESS_REQUEST_STATUSES, 'expired'),
  }
}

function toConsentGrant(value: unknown): ConsentGrant {
  const raw = asStruct(value) ?? {}
  return {
    id: text(pick(raw, 'id', 'grant_id', 'grantId')),
    requestId: optionalText(pick(raw, 'request_id', 'requestId')),
    provider: toProvider(pick(raw, 'provider', 'grantee', 'provider_address')),
    scopes: scopes(pick(raw, 'scopes', 'categories')),
    grantedAt: timestamp(pick(raw, 'granted_at', 'grantedAt', 'created_at')),
    expiresAt: optionalTimestamp(pick(raw, 'expires_at', 'expiresAt')),
    revokedAt: optionalTimestamp(pick(raw, 'revoked_at', 'revokedAt')),
    // An unrecognised status is treated as expired — it must not read as live access.
    status: oneOf(pick(raw, 'status'), CONSENT_GRANT_STATUSES, 'expired'),
  }
}

function toRecord(value: unknown): MedicalRecord {
  const raw = asStruct(value) ?? {}
  return {
    id: text(pick(raw, 'id', 'record_id', 'recordId')),
    title: text(pick(raw, 'title', 'label')),
    category: oneOf(pick(raw, 'category', 'kind'), RECORD_CATEGORIES, 'other'),
    commitment: text(pick(raw, 'commitment', 'hash', 'digest')),
    storageUri: text(pick(raw, 'storage_uri', 'storageUri', 'uri', 'pointer')),
    issuedBy: toProvider(pick(raw, 'issued_by', 'issuedBy', 'provider')),
    issuedAt: timestamp(pick(raw, 'issued_at', 'issuedAt')),
    anchoredAt: timestamp(pick(raw, 'anchored_at', 'anchoredAt', 'created_at')),
  }
}

function toAuditEvent(value: unknown): AuditEvent {
  const raw = asStruct(value) ?? {}
  const actor = text(pick(raw, 'actor', 'account', 'address'))
  return {
    id: text(pick(raw, 'id', 'event_id', 'eventId')),
    kind: oneOf(pick(raw, 'kind', 'event_type', 'eventType', 'type'), AUDIT_EVENT_KINDS, 'other'),
    actor,
    actorLabel: text(pick(raw, 'actor_label', 'actorLabel', 'actor_name'), actor),
    subjectId: optionalText(pick(raw, 'subject_id', 'subjectId', 'subject')),
    occurredAt: timestamp(pick(raw, 'occurred_at', 'occurredAt', 'timestamp')),
    ledger: count(pick(raw, 'ledger', 'ledger_seq', 'ledgerSeq')),
    txHash: text(pick(raw, 'tx_hash', 'txHash', 'transaction_hash')),
  }
}

// --- client ------------------------------------------------------------------

export function createRealClient(): LockaContractClient {
  const identityRegistry = () => getContractId('patientIdentityRegistry')
  const providerRegistry = () => getContractId('providerRegistry')
  const consentControl = () => getContractId('consentAccessControl')
  const recordRegistry = () => getContractId('recordCommitmentRegistry')
  const auditEmitter = () => getContractId('auditEventEmitter')

  async function getPassport(owner: string): Promise<Passport | null> {
    const raw = await readContract({
      contractId: identityRegistry(),
      method: METHODS.getPassport,
      args: [addressArg(owner)],
    })
    return toPassport(raw)
  }

  async function listAccessRequests(patient: string): Promise<AccessRequest[]> {
    const raw = await readContract({
      contractId: consentControl(),
      method: METHODS.listAccessRequests,
      args: [addressArg(patient)],
    })
    return list(raw).map(toAccessRequest)
  }

  async function listConsentGrants(patient: string): Promise<ConsentGrant[]> {
    const raw = await readContract({
      contractId: consentControl(),
      method: METHODS.listConsentGrants,
      args: [addressArg(patient)],
    })
    return list(raw).map(toConsentGrant)
  }

  return {
    getPassport,
    listAccessRequests,
    listConsentGrants,

    async registerPassport({
      owner,
      identityCommitment,
      recoveryAddress = null,
      displayName = null,
    }: RegisterPassportInput): Promise<Passport> {
      const raw = await invokeContract({
        contractId: identityRegistry(),
        method: METHODS.registerPassport,
        args: [
          addressArg(owner),
          stringArg(identityCommitment.toLowerCase()),
          optionalStringArg(recoveryAddress),
          optionalStringArg(displayName),
        ],
      })
      // Contracts that return void still wrote the passport — read it back.
      const passport = toPassport(raw) ?? (await getPassport(owner))
      if (!passport) {
        throw new SorobanError('contract', `Registered a passport for ${owner} but could not read it back.`)
      }
      return passport
    },

    async getProvider(address: string): Promise<Provider | null> {
      const raw = await readContract({
        contractId: providerRegistry(),
        method: METHODS.getProvider,
        args: [addressArg(address)],
      })
      return raw == null ? null : toProvider(raw)
    },

    async approveAccessRequest({
      patient,
      requestId,
      expiresAt = null,
      scopes: requestedScopes,
    }: ApproveAccessRequestInput): Promise<ConsentGrant> {
      const raw = await invokeContract({
        contractId: consentControl(),
        method: METHODS.approveAccessRequest,
        args: [
          addressArg(patient),
          stringArg(requestId),
          optionalTimestampArg(expiresAt),
          requestedScopes ? scopesArg(requestedScopes) : xdr.ScVal.scvVoid(),
        ],
      })
      if (asStruct(raw)) {
        return toConsentGrant(raw)
      }
      const grant = (await listConsentGrants(patient)).find((candidate) => candidate.requestId === requestId)
      if (!grant) {
        throw new SorobanError('contract', `Approved request '${requestId}' but could not read the grant back.`)
      }
      return grant
    },

    async denyAccessRequest({ patient, requestId }: DenyAccessRequestInput): Promise<AccessRequest> {
      const raw = await invokeContract({
        contractId: consentControl(),
        method: METHODS.denyAccessRequest,
        args: [addressArg(patient), stringArg(requestId)],
      })
      if (asStruct(raw)) {
        return toAccessRequest(raw)
      }
      const request = (await listAccessRequests(patient)).find((candidate) => candidate.id === requestId)
      if (!request) {
        throw new SorobanError('contract', `Denied request '${requestId}' but could not read it back.`)
      }
      return request
    },

    async revokeConsentGrant({ patient, grantId }: RevokeConsentGrantInput): Promise<ConsentGrant> {
      const raw = await invokeContract({
        contractId: consentControl(),
        method: METHODS.revokeConsentGrant,
        args: [addressArg(patient), stringArg(grantId)],
      })
      if (asStruct(raw)) {
        return toConsentGrant(raw)
      }
      const grant = (await listConsentGrants(patient)).find((candidate) => candidate.id === grantId)
      if (!grant) {
        throw new SorobanError('contract', `Revoked grant '${grantId}' but could not read it back.`)
      }
      return grant
    },

    async listRecords(patient: string): Promise<MedicalRecord[]> {
      const raw = await readContract({
        contractId: recordRegistry(),
        method: METHODS.listRecords,
        args: [addressArg(patient)],
      })
      return list(raw).map(toRecord)
    },

    async getRecord(recordId: string): Promise<MedicalRecord | null> {
      const raw = await readContract({
        contractId: recordRegistry(),
        method: METHODS.getRecord,
        args: [stringArg(recordId)],
      })
      return asStruct(raw) ? toRecord(raw) : null
    },

    async listAuditEvents(patient: string): Promise<AuditEvent[]> {
      const raw = await readContract({
        contractId: auditEmitter(),
        method: METHODS.listAuditEvents,
        args: [addressArg(patient)],
      })
      return list(raw).map(toAuditEvent)
    },
  }
}
