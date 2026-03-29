import {
  localAssetUrls,
  type ResetUserPasswordResponse,
  type UserRecord,
} from '@bakki/domain';
import { ActionButton, InlineStatusBanner } from '@bakki/ui';
import {
  buildUserStatusCopy,
  canSubmitCredentialReset,
  getCredentialHelperMessage,
} from './user-management.utils';

export function UserRow({
  onToggleActive,
  onReveal,
  user,
}: {
  onToggleActive: () => void;
  onReveal: () => void;
  user: UserRecord;
}) {
  return (
    <tr className={user.isActive ? '' : 'users-figma-row-inactive'}>
      <td>
        <div className="users-figma-person-cell">
          <img src={user.avatarUrl} alt={user.fullName} />
          <div className="users-figma-person-copy">
            <strong>{user.fullName}</strong>
            {!user.isActive ? <span className="users-figma-user-state">Inactive</span> : null}
          </div>
        </div>
      </td>
      <td><code>{user.username}</code></td>
      <td>
        <span className={`users-figma-role-tag${user.isOwner ? ' users-figma-role-tag-owner' : ''}`}>
          {user.roleLabel}
        </span>
      </td>
      <td>
        <span className={`users-figma-access ${user.mobileAccessEnabled ? 'users-figma-access-enabled' : 'users-figma-access-disabled'}`}>
          <img
            src={
              user.mobileAccessEnabled
                ? localAssetUrls.accessEnabled
                : localAssetUrls.accessDisabled
            }
            alt=""
          />
          {user.mobileAccessEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td>
        <div className="users-figma-action-stack">
          <ActionButton className="users-figma-action" label="Reset Password" onClick={onReveal} />
          <ActionButton
            className={`users-figma-action ${user.isActive ? 'users-figma-action-danger' : 'users-figma-action-success'}`}
            label={user.isActive ? 'Deactivate' : 'Reactivate'}
            onClick={onToggleActive}
          />
        </div>
      </td>
    </tr>
  );
}

export function UserStatusModal({
  errorMessage,
  isPending,
  onClose,
  onSubmit,
  targetUser,
}: {
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  targetUser: UserRecord;
}) {
  return (
    <div className="bakki-modal-shell" role="presentation">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="user-status-title"
        aria-modal="true"
        className="bakki-modal-card users-figma-credential-modal users-figma-status-modal"
        role="dialog"
      >
        <header className="users-figma-credential-head">
          <div>
            <h2 id="user-status-title">{targetUser.isActive ? 'Deactivate User' : 'Reactivate User'}</h2>
            <p>{targetUser.fullName}</p>
          </div>
          <button aria-label="Close user status dialog" className="users-figma-credential-close" onClick={onClose} type="button">
            <img src={localAssetUrls.close} alt="" />
          </button>
        </header>

        <p className="users-figma-credential-copy">{buildUserStatusCopy(targetUser.isActive)}</p>

        {errorMessage ? (
          <InlineStatusBanner
            heading="Status change failed"
            message={errorMessage}
            tone="error"
          />
        ) : null}

        <footer className="users-figma-credential-actions">
          <button className="users-figma-credential-cancel" onClick={onClose} type="button">Cancel</button>
          <button
            className="users-figma-credential-submit"
            disabled={isPending}
            onClick={onSubmit}
            type="button"
          >
            {isPending ? 'Saving...' : targetUser.isActive ? 'Deactivate User' : 'Reactivate User'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function CredentialResetModal({
  canResetCredentials,
  copyFeedback,
  errorMessage,
  isCopying,
  isPending,
  onCopy,
  onChangeReason,
  onClose,
  onSubmit,
  reason,
  resetCredentials,
  sessionPending,
  targetUser,
}: {
  canResetCredentials: boolean;
  copyFeedback: string | null;
  errorMessage: string | null;
  isCopying: boolean;
  isPending: boolean;
  onCopy: () => void;
  onChangeReason: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  reason: string;
  resetCredentials: ResetUserPasswordResponse | null;
  sessionPending: boolean;
  targetUser: UserRecord;
}) {
  const helperMessage = getCredentialHelperMessage(sessionPending, canResetCredentials);

  return (
    <div className="bakki-modal-shell" role="presentation">
      <div className="bakki-modal-backdrop" onClick={onClose} />
      <section
        aria-labelledby="credential-reset-title"
        aria-modal="true"
        className="bakki-modal-card users-figma-credential-modal"
        role="dialog"
      >
        <header className="users-figma-credential-head">
          <div>
            <h2 id="credential-reset-title">Reset Password</h2>
            <p>{targetUser.fullName}</p>
          </div>
          <button aria-label="Close password reset" className="users-figma-credential-close" onClick={onClose} type="button">
            <img src={localAssetUrls.close} alt="" />
          </button>
        </header>

        <p className="users-figma-credential-copy">{helperMessage}</p>

        {errorMessage ? (
          <InlineStatusBanner
            heading="Password reset failed"
            message={errorMessage}
            tone="error"
          />
        ) : null}

        {resetCredentials ? (
          <InlineStatusBanner
            heading="Temporary password generated"
            message={`Login: ${resetCredentials.username} | Temporary password: ${resetCredentials.temporaryPassword}`}
            tone="neutral"
          />
        ) : null}
        {copyFeedback ? (
          <InlineStatusBanner
            heading="Temporary password copied"
            message={copyFeedback}
            tone="neutral"
          />
        ) : null}

        <label className="users-figma-field">
          <span>Reason</span>
          <textarea
            className="users-figma-credential-textarea"
            onChange={(event) => onChangeReason(event.target.value)}
            placeholder="Why does this user need a reset and new temporary password?"
            value={reason}
          />
        </label>

        <footer className="users-figma-credential-actions">
          <button className="users-figma-credential-cancel" onClick={onClose} type="button">Cancel</button>
          <button
            className="users-figma-credential-cancel"
            disabled={!resetCredentials || isCopying}
            onClick={onCopy}
            type="button"
          >
            {isCopying ? 'Copying...' : 'Copy Temporary Password'}
          </button>
          <button
            className="users-figma-credential-submit"
            disabled={!canSubmitCredentialReset(reason, canResetCredentials, isPending)}
            onClick={onSubmit}
            type="button"
          >
            {isPending ? 'Resetting...' : 'Reset Password'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function TreePlanterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7.25 10.5V8.75C7.25 6.12665 9.37665 4 12 4C14.6234 4 16.75 6.12665 16.75 8.75V10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.75 10.5H18.25L17.35 14.7C17.03 16.19 15.71 17.25 14.18 17.25H9.82C8.29 17.25 6.97 16.19 6.65 14.7L5.75 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.1 13.25H13.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function OwnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M14.5 9.75A3.25 3.25 0 1 1 8 9.75A3.25 3.25 0 0 1 14.5 9.75Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.75 18.25C5.52 15.69 7.74 14.25 10.75 14.25C12.09 14.25 13.22 14.54 14.14 15.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.25 12.25L19.5 15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.25 15.5H19.5V18.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
