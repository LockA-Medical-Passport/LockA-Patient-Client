/**
 * Deterministic seed data for the in-memory mock contract client.
 *
 * Every value here is a literal — no `Date.now()`, no randomness — so two mock
 * clients created from this seed always answer identically, and tests can
 * assert on exact values. Addresses are real StrKey-encoded Stellar public
 * keys (they decode cleanly) but belong to no funded account.
 */
import type {
  AccessRequest,
  AuditEvent,
  ConsentGrant,
  MedicalRecord,
  Passport,
  Provider,
} from './types'

/** The patient the seed data belongs to. */
export const MOCK_PATIENT_ADDRESS = 'GB6YGPCU5VORFBS7DOTSQTYBMCYWKDQPNAVUVGD3XOXEVUUWQOCMDRIW'

export const MOCK_PROVIDERS: Record<string, Provider> = {
  hospital: {
    address: 'GD3VGFDEWHOR37ZXX4PKQDNED7LKNMAJ4UT47KTH2SLLLJCM62JTWDUY',
    name: 'Lagos General Hospital',
    kind: 'hospital',
    verified: true,
  },
  lab: {
    address: 'GDTFWVT53GCM5WZGDHPYHD7VMAZ6UH3OTE4U7BR6P4XXAZ53QEBXJRDY',
    name: 'Zenith Diagnostics Lab',
    kind: 'lab',
    verified: true,
  },
  clinic: {
    address: 'GDB72YHHL6U66RRF6TYRXJ3DCVF7IBP3Y6HRMHL33XN34WVDRMJ46J66',
    name: 'Harmony Family Clinic',
    kind: 'clinic',
    verified: true,
  },
  pharmacy: {
    address: 'GCCFJBJQ34V2QIWOARMM26GUFBK2ZGW6FUS5Z75GOHHPL3RCULXBU2J3',
    name: 'MedPlus Pharmacy',
    kind: 'pharmacy',
    verified: false,
  },
  insurer: {
    address: 'GCI6NBWX2WPVWBR7QBDMDQ54BYFUNC3VCM5ZRH24QDEQNKSNOQPIKYEC',
    name: 'Sterling Health Insurance',
    kind: 'insurer',
    verified: true,
  },
}

const MOCK_PASSPORT: Passport = {
  id: 'passport-7f3a91',
  owner: MOCK_PATIENT_ADDRESS,
  identityCommitment: '51d0b0df0dfd814e68a3b87ccee4c0ca232e7e58cb7078fab676d2a3cbfa9b6e',
  displayName: 'Amara Okafor',
  registeredAt: '2026-03-04T09:12:00.000Z',
  status: 'active',
  recoveryAddress: 'GCI6NBWX2WPVWBR7QBDMDQ54BYFUNC3VCM5ZRH24QDEQNKSNOQPIKYEC',
}

/** Two pending requests plus the settled ones behind the current grants. */
const MOCK_ACCESS_REQUESTS: AccessRequest[] = [
  {
    id: 'req-1042',
    provider: MOCK_PROVIDERS.hospital,
    scopes: ['lab-result', 'imaging', 'treatment-note'],
    reason: 'Pre-operative assessment ahead of scheduled surgery on 4 September.',
    requestedAt: '2026-08-18T14:30:00.000Z',
    expiresAt: '2026-08-25T14:30:00.000Z',
    status: 'pending',
  },
  {
    id: 'req-1041',
    provider: MOCK_PROVIDERS.pharmacy,
    scopes: ['prescription', 'allergy'],
    reason: 'Dispensing check for a repeat prescription filed this morning.',
    requestedAt: '2026-08-17T08:05:00.000Z',
    expiresAt: '2026-08-24T08:05:00.000Z',
    status: 'pending',
  },
  {
    id: 'req-1036',
    provider: MOCK_PROVIDERS.lab,
    scopes: ['lab-result'],
    reason: "Comparing this quarter's panel against last year's baseline.",
    requestedAt: '2026-07-22T11:45:00.000Z',
    expiresAt: '2026-07-29T11:45:00.000Z',
    status: 'approved',
  },
  {
    id: 'req-1030',
    provider: MOCK_PROVIDERS.clinic,
    scopes: ['treatment-note', 'immunization'],
    reason: 'Annual check-up follow-up and vaccination schedule review.',
    requestedAt: '2026-06-11T16:20:00.000Z',
    expiresAt: '2026-06-18T16:20:00.000Z',
    status: 'approved',
  },
  {
    id: 'req-1024',
    provider: MOCK_PROVIDERS.insurer,
    scopes: ['lab-result', 'imaging', 'prescription', 'treatment-note'],
    reason: 'Claim review for policy LK-88214.',
    requestedAt: '2026-05-02T10:00:00.000Z',
    expiresAt: '2026-05-09T10:00:00.000Z',
    status: 'denied',
  },
]

/** Two live grants, one revoked, one lapsed — enough to render every badge state. */
const MOCK_CONSENT_GRANTS: ConsentGrant[] = [
  {
    id: 'grant-508',
    requestId: 'req-1036',
    provider: MOCK_PROVIDERS.lab,
    scopes: ['lab-result'],
    grantedAt: '2026-07-22T12:02:00.000Z',
    expiresAt: '2026-10-22T12:02:00.000Z',
    revokedAt: null,
    status: 'active',
  },
  {
    id: 'grant-497',
    requestId: 'req-1030',
    provider: MOCK_PROVIDERS.clinic,
    scopes: ['treatment-note', 'immunization'],
    grantedAt: '2026-06-11T17:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    status: 'active',
  },
  {
    id: 'grant-455',
    requestId: null,
    provider: MOCK_PROVIDERS.hospital,
    scopes: ['imaging'],
    grantedAt: '2026-04-19T09:30:00.000Z',
    expiresAt: '2026-10-19T09:30:00.000Z',
    revokedAt: '2026-05-30T18:41:00.000Z',
    status: 'revoked',
  },
  {
    id: 'grant-402',
    requestId: null,
    provider: MOCK_PROVIDERS.pharmacy,
    scopes: ['prescription'],
    grantedAt: '2026-02-14T13:15:00.000Z',
    expiresAt: '2026-05-14T13:15:00.000Z',
    revokedAt: null,
    status: 'expired',
  },
]

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-9f21',
    title: 'Full blood count panel',
    category: 'lab-result',
    commitment: 'f28c4849b948e22742fa40d46037e37be97b9cd272175b1839b7c552336e8149',
    storageUri: 'locka://records/9f21',
    issuedBy: MOCK_PROVIDERS.lab,
    issuedAt: '2026-07-20T10:15:00.000Z',
    anchoredAt: '2026-07-20T10:22:00.000Z',
  },
  {
    id: 'rec-8c04',
    title: 'Chest X-ray report',
    category: 'imaging',
    commitment: 'c9015b4c9e71553f93d149e7258486f6fcb02d0f6d6edffd2899f28c78c6af64',
    storageUri: 'locka://records/8c04',
    issuedBy: MOCK_PROVIDERS.hospital,
    issuedAt: '2026-06-28T15:40:00.000Z',
    anchoredAt: '2026-06-28T15:51:00.000Z',
  },
  {
    id: 'rec-7b55',
    title: 'Amoxicillin 500mg — 7 day course',
    category: 'prescription',
    commitment: 'dd4450daa790e88fadf612b39783d942f04ce7d69ba2fae91dbb038385c3a477',
    storageUri: 'locka://records/7b55',
    issuedBy: MOCK_PROVIDERS.clinic,
    issuedAt: '2026-06-11T17:10:00.000Z',
    anchoredAt: '2026-06-11T17:14:00.000Z',
  },
  {
    id: 'rec-6a18',
    title: 'Tetanus booster',
    category: 'immunization',
    commitment: 'bf8b06c9c864d65e492e16135a0c59ce9986ade254f300f081ce37ff1d16af5d',
    storageUri: 'locka://records/6a18',
    issuedBy: MOCK_PROVIDERS.clinic,
    issuedAt: '2026-03-09T11:00:00.000Z',
    anchoredAt: '2026-03-09T11:06:00.000Z',
  },
]

const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'evt-3311',
    kind: 'access-requested',
    actor: MOCK_PROVIDERS.hospital.address,
    actorLabel: MOCK_PROVIDERS.hospital.name,
    subjectId: 'req-1042',
    occurredAt: '2026-08-18T14:30:00.000Z',
    ledger: 1_284_907,
    txHash: '3fef68e205fbe06bc6240bde9b2061216860cc6a9f3f4018411b46cce4899702',
  },
  {
    id: 'evt-3308',
    kind: 'access-requested',
    actor: MOCK_PROVIDERS.pharmacy.address,
    actorLabel: MOCK_PROVIDERS.pharmacy.name,
    subjectId: 'req-1041',
    occurredAt: '2026-08-17T08:05:00.000Z',
    ledger: 1_282_140,
    txHash: 'e39bf8562366bb901c3c6875eeff2eb9b89cef297474e7dbe77ddb93debf759a',
  },
  {
    id: 'evt-3295',
    kind: 'record-viewed',
    actor: MOCK_PROVIDERS.lab.address,
    actorLabel: MOCK_PROVIDERS.lab.name,
    subjectId: 'rec-9f21',
    occurredAt: '2026-07-23T09:18:00.000Z',
    ledger: 1_263_004,
    txHash: '349bf0db385de364070b70229dd49bc0665a5ca7a89ce120e95186997eeb3e9f',
  },
  {
    id: 'evt-3291',
    kind: 'access-approved',
    actor: MOCK_PATIENT_ADDRESS,
    actorLabel: 'You',
    subjectId: 'grant-508',
    occurredAt: '2026-07-22T12:02:00.000Z',
    ledger: 1_261_882,
    txHash: '17023656bf2180232e4b7a4237ec0074967f38580ae446f0e07acff7e5eb1906',
  },
  {
    id: 'evt-3287',
    kind: 'record-anchored',
    actor: MOCK_PROVIDERS.lab.address,
    actorLabel: MOCK_PROVIDERS.lab.name,
    subjectId: 'rec-9f21',
    occurredAt: '2026-07-20T10:22:00.000Z',
    ledger: 1_259_431,
    txHash: '9bba3d52d907bcbe4adad2168c9ed629b9fa367c7f45f08b62182a33e169b4de',
  },
  {
    id: 'evt-3244',
    kind: 'access-revoked',
    actor: MOCK_PATIENT_ADDRESS,
    actorLabel: 'You',
    subjectId: 'grant-455',
    occurredAt: '2026-05-30T18:41:00.000Z',
    ledger: 1_198_776,
    txHash: '93745b965ad5ee31aef6564cfdac63431b67af650403175920c24271df0f6726',
  },
  {
    id: 'evt-3102',
    kind: 'passport-registered',
    actor: MOCK_PATIENT_ADDRESS,
    actorLabel: 'You',
    subjectId: 'passport-7f3a91',
    occurredAt: '2026-03-04T09:12:00.000Z',
    ledger: 1_090_233,
    txHash: '83b6f676288199da5189340acc45110caeacede15ebd680c1b2d74e25f9cb340',
  },
]

/** Mutable working copy of the seed, owned by one mock client instance. */
export interface MockState {
  passport: Passport | null
  providers: Provider[]
  accessRequests: AccessRequest[]
  consentGrants: ConsentGrant[]
  records: MedicalRecord[]
  auditEvents: AuditEvent[]
  /** Highest ledger sequence handed out so far; new writes land above it. */
  ledger: number
}

export interface CreateMockStateOptions {
  /** Start with no passport, to exercise the registration flow. */
  unregistered?: boolean
}

/**
 * Builds a fresh, independent copy of the seed. Mutating a returned state never
 * affects the constants above or any other mock client.
 */
export function createMockState({ unregistered = false }: CreateMockStateOptions = {}): MockState {
  return structuredClone({
    passport: unregistered ? null : MOCK_PASSPORT,
    providers: Object.values(MOCK_PROVIDERS),
    accessRequests: MOCK_ACCESS_REQUESTS,
    consentGrants: MOCK_CONSENT_GRANTS,
    records: MOCK_RECORDS,
    auditEvents: MOCK_AUDIT_EVENTS,
    ledger: 1_284_907,
  })
}
