import type { BakkiUserMirrorRecord } from './bakki-user-mirror.service';
import { toIsoString } from './query-date.utils';

export interface BakkiUserMirrorRow {
  active: boolean;
  display_name: string;
  id: number;
  last_sync_attempt_at: Date | string;
  last_synced_at: Date | string;
  login: string;
  mobile_access_enabled: boolean;
  odoo_user_id: number;
  role: BakkiUserMirrorRecord['role'];
  sync_error: string | null;
  sync_retry_count: number | string;
  sync_status: 'error' | 'ok';
}

export const BAKKI_USER_SELECT_FIELDS = `
  id,
  odoo_user_id,
  login,
  display_name,
  role,
  active,
  mobile_access_enabled,
  sync_status,
  sync_error,
  sync_retry_count,
  last_sync_attempt_at,
  last_synced_at
`;

export function mapBakkiUserMirrorRow(
  row: BakkiUserMirrorRow,
): BakkiUserMirrorRecord {
  return {
    id: Number(row.id),
    odooUserId: Number(row.odoo_user_id),
    login: row.login,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
    mobileAccessEnabled: row.mobile_access_enabled,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    syncRetryCount: Number(row.sync_retry_count ?? 0),
    lastSyncAttemptAt: toIsoString(row.last_sync_attempt_at) ?? new Date(0).toISOString(),
    lastSyncedAt: toIsoString(row.last_synced_at) ?? new Date(0).toISOString(),
  };
}
