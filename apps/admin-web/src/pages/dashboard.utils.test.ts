import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardFixture } from '@bakki/domain';
import {
  hasDashboardProgramItems,
  resolveDashboardGreetingName,
  resolveDashboardRenderState,
} from './dashboard.utils';

test('resolveDashboardRenderState returns loading only when the page is pending without data', () => {
  assert.equal(resolveDashboardRenderState(undefined, true), 'loading');
  assert.equal(resolveDashboardRenderState(dashboardFixture, true), 'ready');
});

test('resolveDashboardRenderState returns unavailable when there is no data and no initial pending load', () => {
  assert.equal(resolveDashboardRenderState(undefined, false), 'unavailable');
  assert.equal(resolveDashboardRenderState(null, false), 'unavailable');
});

test('resolveDashboardRenderState returns ready when dashboard data exists', () => {
  assert.equal(resolveDashboardRenderState(dashboardFixture, false), 'ready');
});

test('hasDashboardProgramItems reflects whether the daily program is empty', () => {
  assert.equal(hasDashboardProgramItems(dashboardFixture), true);
  assert.equal(
    hasDashboardProgramItems({
      ...dashboardFixture,
      programItems: [],
    }),
    false,
  );
});

test('resolveDashboardGreetingName prefers the authenticated session first name', () => {
  assert.equal(
    resolveDashboardGreetingName(dashboardFixture, {
      authenticated: true,
      issuedAt: '2026-03-28T12:00:00.000Z',
      expiresAt: '2026-03-28T20:00:00.000Z',
      user: {
        id: 'user-profile-1',
        displayName: 'Bjorn Sig',
        username: 'bjorn.sig',
        role: 'owner',
        mobileAccessEnabled: true,
        canResetCredentials: true,
        activePlantingPhaseId: null,
      },
    }),
    'Bjorn',
  );
});

test('resolveDashboardGreetingName falls back to the dashboard summary when no session name exists', () => {
  assert.equal(resolveDashboardGreetingName(dashboardFixture, null), dashboardFixture.greetingName);
  assert.equal(
    resolveDashboardGreetingName(dashboardFixture, {
      authenticated: true,
      issuedAt: '2026-03-28T12:00:00.000Z',
      expiresAt: '2026-03-28T20:00:00.000Z',
      user: {
        id: 'user-profile-1',
        displayName: '   ',
        username: 'bjorn.sig',
        role: 'owner',
        mobileAccessEnabled: true,
        canResetCredentials: true,
        activePlantingPhaseId: null,
      },
    }),
    dashboardFixture.greetingName,
  );
});
