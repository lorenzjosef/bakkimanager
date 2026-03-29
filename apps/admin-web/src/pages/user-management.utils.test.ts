import type { UserManagementData } from '@bakki/domain';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPreviewPassword,
  buildUserStatusCopy,
  canCreateUser,
  canSubmitCredentialReset,
  getCredentialHelperMessage,
  resolveUserManagementRenderState,
} from './user-management.utils';

const userManagementData: UserManagementData = {
  firstNamePlaceholder: 'e.g. Aris',
  lastNamePlaceholder: 'e.g. Magnusson',
  previewUsernamePlaceholder: 'new.user@bakki.example',
  roleOptions: [
    { id: 'planter', label: 'Planter' },
    { id: 'owner', label: 'Owner' },
  ],
  permissionsTitle: 'Permissions Panel',
  permissionGroups: [],
  permissionsNote: 'Owner permissions include ranch administration.',
  registryTitle: 'Personnel Registry',
  registrySubtitle: '0 active, 0 inactive, 0 total synced personnel.',
  registryUsers: [],
};

test('resolveUserManagementRenderState distinguishes loading, unavailable, and ready states', () => {
  assert.equal(resolveUserManagementRenderState(undefined, true), 'loading');
  assert.equal(resolveUserManagementRenderState(undefined, false), 'unavailable');
  assert.equal(resolveUserManagementRenderState(userManagementData, false), 'ready');
});

test('canCreateUser requires both names and an idle mutation state', () => {
  assert.equal(canCreateUser('', 'Ng', false), false);
  assert.equal(canCreateUser('Ada', '', false), false);
  assert.equal(canCreateUser('Ada', 'Ng', true), false);
  assert.equal(canCreateUser('Ada', 'Ng', false), true);
});

test('buildPreviewPassword formats the generated temporary password deterministically', () => {
  const randomValues = [0.123456, 0.654321];
  let callIndex = 0;
  const random = () => randomValues[callIndex++] ?? 0.5;

  assert.equal(buildPreviewPassword(random), 'BK-1F9A-A781');
});

test('getCredentialHelperMessage reflects session and permission state', () => {
  assert.equal(
    getCredentialHelperMessage(true, false),
    'Checking session permissions...',
  );
  assert.equal(
    getCredentialHelperMessage(false, true),
    'This action is audited. A new temporary password will replace the current one.',
  );
  assert.equal(
    getCredentialHelperMessage(false, false),
    'An active owner session is required to reset passwords.',
  );
});

test('buildUserStatusCopy reflects the target status transition', () => {
  assert.equal(
    buildUserStatusCopy(true),
    'This will set the account to inactive. Deactivated users lose access on their next authenticated request.',
  );
  assert.equal(
    buildUserStatusCopy(false),
    'This will set the account to active. Deactivated users lose access on their next authenticated request.',
  );
});

test('canSubmitCredentialReset requires owner permission, a reason, and no pending mutation', () => {
  assert.equal(canSubmitCredentialReset('', true, false), false);
  assert.equal(canSubmitCredentialReset('abc', true, false), false);
  assert.equal(canSubmitCredentialReset('valid reason', false, false), false);
  assert.equal(canSubmitCredentialReset('valid reason', true, true), false);
  assert.equal(canSubmitCredentialReset('valid reason', true, false), true);
});
