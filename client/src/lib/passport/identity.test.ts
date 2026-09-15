// @vitest-environment node
// Pure helpers — no DOM involved.
import { describe, expect, it } from 'vitest'
import {
  generateIdentityCommitment,
  isValidIdentityCommitment,
  isValidStellarAddress,
  normalizeIdentityCommitment,
  validateIdentityCommitment,
  validateRecoveryAddress,
} from './identity'
import { MOCK_PATIENT_ADDRESS } from '../soroban'

describe('generateIdentityCommitment', () => {
  it('produces 32 bytes of lower-case hex', () => {
    expect(generateIdentityCommitment()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces a different commitment every time', () => {
    const commitments = new Set(Array.from({ length: 20 }, generateIdentityCommitment))
    expect(commitments.size).toBe(20)
  })
})

describe('normalizeIdentityCommitment', () => {
  it('trims, drops a pasted 0x prefix, and lower-cases', () => {
    expect(normalizeIdentityCommitment(`  0x${'AB'.repeat(32)}  `)).toBe('ab'.repeat(32))
  })
})

describe('isValidIdentityCommitment', () => {
  it.each([['a'.repeat(64)], ['A'.repeat(64)], [`0x${'f'.repeat(64)}`]])('accepts %s', (value) => {
    expect(isValidIdentityCommitment(value)).toBe(true)
  })

  it.each([[''], ['a'.repeat(63)], ['a'.repeat(65)], [`${'g'.repeat(64)}`], ['not hex at all']])(
    'rejects %s',
    (value) => {
      expect(isValidIdentityCommitment(value)).toBe(false)
    },
  )
})

describe('isValidStellarAddress', () => {
  it('accepts a StrKey-encoded account address, ignoring surrounding space', () => {
    expect(isValidStellarAddress(` ${MOCK_PATIENT_ADDRESS} `)).toBe(true)
  })

  it.each([
    ['', 'empty'],
    ['0x0000000000000000000000000000000000000000', 'an EVM address'],
    ['GABC', 'a truncated key'],
    ['CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5', 'a contract id'],
    ['SAQXWZQFA6ZQFBQJ2SBQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQ', 'a secret-looking key'],
  ])('rejects %s (%s)', (value) => {
    expect(isValidStellarAddress(value)).toBe(false)
  })
})

describe('validateIdentityCommitment', () => {
  it('passes a generated commitment', () => {
    expect(validateIdentityCommitment(generateIdentityCommitment())).toBeNull()
  })

  it('explains what is missing or malformed', () => {
    expect(validateIdentityCommitment('  ')).toMatch(/required/i)
    expect(validateIdentityCommitment('abc')).toMatch(/64 characters/i)
  })
})

describe('validateRecoveryAddress', () => {
  it('passes a Stellar account address', () => {
    expect(validateRecoveryAddress(MOCK_PATIENT_ADDRESS)).toBeNull()
  })

  it('explains what is missing or malformed', () => {
    expect(validateRecoveryAddress('   ')).toMatch(/required/i)
    expect(validateRecoveryAddress('0xdeadbeef')).toMatch(/starting with G/i)
  })
})
