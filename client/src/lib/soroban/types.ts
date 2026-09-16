/**
 * Domain types for the LockA contract client.
 *
 * These describe what the *app* works with, not what the contracts return —
 * ledger-native shapes (ScVal structs, u64 ledger timestamps, snake_case keys)
 * are decoded into these by the real client, and produced directly by the mock
 * client. Timestamps are ISO 8601 strings so components can format them without
 * knowing where they came from.
 *
 * Medical data itself is never on-chain: records here are commitments plus a
 * pointer to the encrypted off-chain blob.
 */

/** A patient's on-chain identity in the PatientIdentityRegistry. */
export interface Passport {
  /** Registry-assigned passport identifier — not the wallet address. */
  id: string
  /** Stellar account that owns the passport. */
  owner: string
  /**
   * Hex-encoded 32-byte commitment anchoring the patient's identity. It is
   * blinded: nothing about the person can be read off it.
   */
  identityCommitment: string
  /** Optional label for the UI. Null when the patient registered without one. */
  displayName: string | null
  registeredAt: string
  status: PassportStatus
  /** Guardian/recovery account configured at registration, if any. */
  recoveryAddress: string | null
}

export type PassportStatus = 'active' | 'suspended'

export type ProviderKind = 'hospital' | 'clinic' | 'lab' | 'pharmacy' | 'insurer' | 'other'

/** A healthcare organisation from the ProviderRegistry. */
export interface Provider {
  /** Stellar account of the provider — the identifier used by every contract. */
  address: string
  name: string
  kind: ProviderKind
  /** Whether the registry has verified this provider's credentials. */
  verified: boolean
}

export type RecordCategory =
  | 'lab-result'
  | 'imaging'
  | 'prescription'
  | 'treatment-note'
  | 'immunization'
  | 'allergy'
  | 'other'

export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'expired'

/** A provider asking the patient for read access to some of their records. */
export interface AccessRequest {
  id: string
  provider: Provider
  /** Record categories the provider is asking to read. */
  scopes: RecordCategory[]
  /** Why the provider says it needs access. */
  reason: string
  requestedAt: string
  /** When the request itself stops being actionable. */
  expiresAt: string
  status: AccessRequestStatus
}

export type ConsentGrantStatus = 'active' | 'revoked' | 'expired'

/** Access the patient has actually granted, in ConsentAccessControl. */
export interface ConsentGrant {
  id: string
  /** The request this grant came from, when it started as one. */
  requestId: string | null
  provider: Provider
  scopes: RecordCategory[]
  grantedAt: string
  /** Null means the grant runs until it is revoked. */
  expiresAt: string | null
  revokedAt: string | null
  status: ConsentGrantStatus
}

/**
 * A record commitment from the RecordCommitmentRegistry. The record's contents
 * live encrypted off-chain at `storageUri`; only `commitment` is anchored.
 */
export interface MedicalRecord {
  id: string
  title: string
  category: RecordCategory
  /** Hex-encoded SHA-256 of the encrypted record, anchored on-chain. */
  commitment: string
  /** Pointer to the encrypted blob in off-chain storage. */
  storageUri: string
  /** Provider that issued the record. */
  issuedBy: Provider
  issuedAt: string
  /** When the commitment was written to the ledger. */
  anchoredAt: string
}

export type AuditEventKind =
  | 'passport-registered'
  | 'access-requested'
  | 'access-approved'
  | 'access-denied'
  | 'access-revoked'
  | 'record-anchored'
  | 'record-viewed'
  | 'other'

/** An entry in the patient's access history, from the AuditEventEmitter. */
export interface AuditEvent {
  id: string
  kind: AuditEventKind
  /** Stellar account that triggered the event (patient or provider). */
  actor: string
  /** Human-readable name for `actor`, for display without a second lookup. */
  actorLabel: string
  /** Request, grant, or record id the event refers to, when it has one. */
  subjectId: string | null
  occurredAt: string
  /** Ledger sequence the event was emitted in. */
  ledger: number
  /** Hash of the transaction that emitted the event. */
  txHash: string
}

export interface RegisterPassportInput {
  owner: string
  /** Hex-encoded 32-byte identity commitment — see `Passport.identityCommitment`. */
  identityCommitment: string
  /** Account that can recover the passport; defaults to the owner on-chain. */
  recoveryAddress?: string | null
  displayName?: string | null
}

export interface UpdateRecoveryAddressInput {
  /** The passport's owner — the contract authorises the change against it. */
  owner: string
  recoveryAddress: string
}

export interface ApproveAccessRequestInput {
  /** Patient account approving — the contract authorises against it. */
  patient: string
  requestId: string
  /** Overrides the grant's expiry; null grants access until revoked. */
  expiresAt?: string | null
  /** Narrows the granted scopes; defaults to everything the request asked for. */
  scopes?: RecordCategory[]
}

export interface DenyAccessRequestInput {
  patient: string
  requestId: string
}

export interface RevokeConsentGrantInput {
  patient: string
  grantId: string
}

/**
 * The single interface every LockA feature talks to. Both the real Soroban
 * client and the in-memory mock implement it, so feature code never branches
 * on which one it got — see `getContractClient()`.
 */
export interface LockaContractClient {
  getPassport(owner: string): Promise<Passport | null>
  registerPassport(input: RegisterPassportInput): Promise<Passport>
  updateRecoveryAddress(input: UpdateRecoveryAddressInput): Promise<Passport>
  getProvider(address: string): Promise<Provider | null>
  /** All requests addressed to the patient, newest first — filter by status for the pending queue. */
  listAccessRequests(patient: string): Promise<AccessRequest[]>
  approveAccessRequest(input: ApproveAccessRequestInput): Promise<ConsentGrant>
  denyAccessRequest(input: DenyAccessRequestInput): Promise<AccessRequest>
  /** Every grant the patient has issued, newest first, including revoked and expired ones. */
  listConsentGrants(patient: string): Promise<ConsentGrant[]>
  revokeConsentGrant(input: RevokeConsentGrantInput): Promise<ConsentGrant>
  listRecords(patient: string): Promise<MedicalRecord[]>
  getRecord(recordId: string): Promise<MedicalRecord | null>
  /** The patient's access history, newest first. */
  listAuditEvents(patient: string): Promise<AuditEvent[]>
}
