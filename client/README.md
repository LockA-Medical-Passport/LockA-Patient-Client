# LockA Patient Client

Frontend for the LockA patient app: create a health passport, view records, approve/revoke
provider access, and share QR codes. Built with Vite, React, and TypeScript, targeting **Stellar
with Soroban smart contracts** and the **Freighter** wallet for signing. The UI follows the
visual design of a parallel EVM implementation of LockA ([locka.remixdapp.eth.limo](https://locka.remixdapp.eth.limo/))
— only its design system carries over, not its chain. See the root [README](../README.md) and
the [LockA documentation](https://github.com/LockA-Medical-Passport/LockA-Documentation/blob/main/Documentation.md)
for the full system design.

## Getting started

```bash
npm install
cp .env.example .env   # fill in Soroban RPC URL, network passphrase, API base URL, contract IDs
npm run dev
```

If locka-contracts has nothing deployed on the network you're targeting, set
`VITE_USE_MOCK_CONTRACTS=true` in `.env` and skip the contract IDs — see
[Mock contracts](#mock-contracts-local-development-without-a-deployment) below.

## Talking to contracts

Feature code never calls Soroban directly. It asks for the app's contract client and
calls domain methods on it:

```ts
import { getContractClient } from './lib/soroban'

const locka = getContractClient()
const passport = await locka.getPassport(address)
const pending = (await locka.listAccessRequests(address)).filter((r) => r.status === 'pending')
await locka.approveAccessRequest({ patient: address, requestId: pending[0].id })
```

`getContractClient()` returns something implementing `LockaContractClient`
([types.ts](src/lib/soroban/types.ts)) — either the real client, which simulates reads and
signs writes with Freighter ([realClient.ts](src/lib/soroban/realClient.ts)), or the mock
([mockClient.ts](src/lib/soroban/mockClient.ts)). Both satisfy the same interface, so no
feature code branches on which one it got. The low-level `readContract` / `invokeContract`
wrappers ([client.ts](src/lib/soroban/client.ts)) stay available for calls the interface
doesn't cover yet.

## Mock contracts (local development without a deployment)

```bash
VITE_USE_MOCK_CONTRACTS=true
```

With the flag on, the app runs entirely against in-memory seed data: no RPC server, no
contract IDs, no Freighter extension. Every call resolves after an artificial delay so
loading states behave like the real thing.

The seed ([mockSeed.ts](src/lib/soroban/mockSeed.ts)) covers:

- a registered passport for the patient, plus five providers (hospital, lab, clinic,
  pharmacy, insurer)
- two pending access requests, and the settled requests behind the current grants
- four consent grants — two active, one revoked, one expired
- four record commitments across lab result, imaging, prescription, and immunization
- seven audit events — requests, an approval, a revocation, a record anchor and view,
  and the original registration

Behaviour worth knowing:

- **Writes stick for the session.** Approving, denying, revoking, and registering mutate the
  in-memory copy and append audit events. A page reload puts the seed back.
- **Any wallet works.** The mock is single-patient: it answers for whichever address you pass
  and reports the seeded passport as owned by it, so you don't have to hold a specific key.
- **Failures are real errors.** Approving an unknown request, re-approving a settled one, or
  revoking an inactive grant rejects with a `SorobanError`, same as the contract-backed client.
- **Deterministic.** The seed contains no `Date.now()` and no randomness, so tests and demos
  see identical data every run.

Two optional variables tune it: `VITE_MOCK_CONTRACT_LATENCY_MS` (default `350`) and
`VITE_MOCK_UNREGISTERED_PASSPORT=true`, which starts with no passport for working on the
registration flow.

## QR code payload format

The passport view (`/passport`) shows a QR code a provider scans to start an access request
(`PassportQrCode`, encoded/decoded in `src/lib/qr/passportPayload.ts`). The code decodes to JSON:

```json
{ "type": "locka:passport-id", "v": 1, "passportId": "passport-7f3a91" }
```

`passportId` is the patient's `Passport.id` from PatientIdentityRegistry — not a short-lived
signed request token. LockA-Documentation's provider-access flow only specifies that a provider
"searches by QR code, patient passport ID, or patient-approved contact method"; it doesn't define
a signed-token contract, and neither locka-api nor locka-contracts currently expose one. If
locka-provider-client's scanning side wants a signed, time-limited token instead (so a
photographed/leaked code can't be replayed indefinitely), that's a cross-repo decision to make
with locka-api first — see the note in `passportPayload.ts` for what would need to change here.

## Scripts

- `npm run dev` — start the Vite dev server.
- `npm run build` — type-check (`tsc -b`) and produce a production build in `dist/`.
- `npm run preview` — serve the production build locally.
- `npm run lint` — lint with [oxlint](https://oxc.rs).
- `npm run test` — run the test suite with Vitest.

## Stack

- [Vite](https://vite.dev/) + React 19 + TypeScript (strict mode)
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) for tests
