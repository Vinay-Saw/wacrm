import { describe, it, expect } from 'vitest'
import {
  roleRank,
  hasMinRole,
  isAccountRole,
  canManageMembers,
  canEditSettings,
  canSendMessages,
  canViewOnly,
  canDeleteAccount,
  canTransferOwnership,
  ACCOUNT_ROLES,
  type AccountRole,
} from './roles'

// ---------------------------------------------------------
// roleRank
// ---------------------------------------------------------
describe('roleRank', () => {
  it('returns 4 for owner', () => expect(roleRank('owner')).toBe(4))
  it('returns 3 for admin', () => expect(roleRank('admin')).toBe(3))
  it('returns 2 for agent', () => expect(roleRank('agent')).toBe(2))
  it('returns 1 for viewer', () => expect(roleRank('viewer')).toBe(1))
})

// ---------------------------------------------------------
// hasMinRole — exhaustive 4 × 4 matrix
// ---------------------------------------------------------
describe('hasMinRole', () => {
  const cases: [AccountRole, AccountRole, boolean][] = [
    // [role, min, expected]
    ['owner', 'owner', true],
    ['owner', 'admin', true],
    ['owner', 'agent', true],
    ['owner', 'viewer', true],
    ['admin', 'owner', false],
    ['admin', 'admin', true],
    ['admin', 'agent', true],
    ['admin', 'viewer', true],
    ['agent', 'owner', false],
    ['agent', 'admin', false],
    ['agent', 'agent', true],
    ['agent', 'viewer', true],
    ['viewer', 'owner', false],
    ['viewer', 'admin', false],
    ['viewer', 'agent', false],
    ['viewer', 'viewer', true],
  ]

  it.each(cases)('hasMinRole(%s, %s) → %s', (role, min, expected) => {
    expect(hasMinRole(role, min)).toBe(expected)
  })
})

// ---------------------------------------------------------
// isAccountRole — type narrowing
// ---------------------------------------------------------
describe('isAccountRole', () => {
  it.each(ACCOUNT_ROLES)('accepts "%s"', (role) => {
    expect(isAccountRole(role)).toBe(true)
  })

  it.each([
    'superadmin', 'user', 'moderator', '', 'OWNER', 'Admin',
  ])('rejects invalid string "%s"', (val) => {
    expect(isAccountRole(val)).toBe(false)
  })

  it.each([null, undefined, 42, true, {}, []])('rejects non-string %p', (val) => {
    expect(isAccountRole(val)).toBe(false)
  })
})

// ---------------------------------------------------------
// Capability predicates — each role × each predicate
// ---------------------------------------------------------
describe('capability predicates', () => {
  const expectations: Record<AccountRole, {
    canManageMembers: boolean
    canEditSettings: boolean
    canSendMessages: boolean
    canViewOnly: boolean
    canDeleteAccount: boolean
    canTransferOwnership: boolean
  }> = {
    owner: {
      canManageMembers: true,
      canEditSettings: true,
      canSendMessages: true,
      canViewOnly: false,
      canDeleteAccount: true,
      canTransferOwnership: true,
    },
    admin: {
      canManageMembers: true,
      canEditSettings: true,
      canSendMessages: true,
      canViewOnly: false,
      canDeleteAccount: false,
      canTransferOwnership: false,
    },
    agent: {
      canManageMembers: false,
      canEditSettings: false,
      canSendMessages: true,
      canViewOnly: false,
      canDeleteAccount: false,
      canTransferOwnership: false,
    },
    viewer: {
      canManageMembers: false,
      canEditSettings: false,
      canSendMessages: false,
      canViewOnly: true,
      canDeleteAccount: false,
      canTransferOwnership: false,
    },
  }

  for (const role of ACCOUNT_ROLES) {
    const exp = expectations[role]
    describe(`role: ${role}`, () => {
      it(`canManageMembers → ${exp.canManageMembers}`, () =>
        expect(canManageMembers(role)).toBe(exp.canManageMembers))
      it(`canEditSettings → ${exp.canEditSettings}`, () =>
        expect(canEditSettings(role)).toBe(exp.canEditSettings))
      it(`canSendMessages → ${exp.canSendMessages}`, () =>
        expect(canSendMessages(role)).toBe(exp.canSendMessages))
      it(`canViewOnly → ${exp.canViewOnly}`, () =>
        expect(canViewOnly(role)).toBe(exp.canViewOnly))
      it(`canDeleteAccount → ${exp.canDeleteAccount}`, () =>
        expect(canDeleteAccount(role)).toBe(exp.canDeleteAccount))
      it(`canTransferOwnership → ${exp.canTransferOwnership}`, () =>
        expect(canTransferOwnership(role)).toBe(exp.canTransferOwnership))
    })
  }
})
