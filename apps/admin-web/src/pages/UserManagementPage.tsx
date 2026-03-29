import { PageStatePanel } from '@bakki/ui';
import {
  CredentialResetModal,
  UserStatusModal,
} from './user-management.sections';
import { UserManagementContent } from './user-management.content';
import { useUserManagementPageState } from './user-management.page-state';

export function UserManagementPage() {
  const {
    canCreateUser,
    canResetCredentials,
    closeCredentialModal,
    closeStatusModal,
    copyFeedback,
    createErrorMessage,
    credentialErrorMessage,
    credentialReason,
    credentialTarget,
    data,
    errorMessage,
    firstName,
    handleCopyCredentials,
    handleCredentialReasonChange,
    handleFirstNameChange,
    handleLastNameChange,
    isCreatingUser,
    isResettingPassword,
    isUpdatingUserStatus,
    lastCreatedUser,
    lastName,
    lastStatusChange,
    openCredentialModal,
    openStatusModal,
    previewPassword,
    previewUsername,
    refetch,
    renderState,
    resetCredentials,
    selectedRole,
    sessionPending,
    setSelectedRole,
    statusErrorMessage,
    statusTarget,
    submitCreateUser,
    submitCredentialReset,
    submitUserStatusChange,
  } = useUserManagementPageState();

  if (renderState === 'loading') {
    return (
      <section className="view is-active" id="view-users">
        <div className="page-content users-figma-page" data-node-id="60:4285">
          <PageStatePanel
            eyebrow="User Management"
            heading="Loading personnel data"
            message="Loading personnel, roles, and permission defaults."
          />
        </div>
      </section>
    );
  }

  if (renderState === 'unavailable') {
    return (
      <section className="view is-active" id="view-users">
        <div className="page-content users-figma-page" data-node-id="60:4285">
          <PageStatePanel
            action={{ label: 'Retry', onAction: () => void refetch() }}
            eyebrow="User Management"
            heading="User data unavailable"
            message={errorMessage}
            tone="error"
          />
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <section className="view is-active" id="view-users">
      <UserManagementContent
        canCreateUser={canCreateUser}
        createErrorMessage={createErrorMessage}
        data={data}
        firstName={firstName}
        isCreatingUser={isCreatingUser}
        lastCreatedUser={lastCreatedUser}
        lastName={lastName}
        lastStatusChange={lastStatusChange}
        onCreateUser={() => void submitCreateUser()}
        onFirstNameChange={handleFirstNameChange}
        onLastNameChange={handleLastNameChange}
        onOpenCredentialModal={openCredentialModal}
        onOpenStatusModal={openStatusModal}
        onRoleSelect={setSelectedRole}
        previewPassword={previewPassword}
        previewUsername={previewUsername}
        selectedRole={selectedRole}
      />
      {credentialTarget ? (
        <CredentialResetModal
          canResetCredentials={canResetCredentials}
          copyFeedback={copyFeedback}
          errorMessage={credentialErrorMessage}
          isCopying={false}
          isPending={isResettingPassword}
          onCopy={() => void handleCopyCredentials()}
          onChangeReason={handleCredentialReasonChange}
          onClose={closeCredentialModal}
          onSubmit={() => void submitCredentialReset()}
          reason={credentialReason}
          resetCredentials={resetCredentials}
          sessionPending={sessionPending}
          targetUser={credentialTarget}
        />
      ) : null}
      {statusTarget ? (
        <UserStatusModal
          errorMessage={statusErrorMessage}
          isPending={isUpdatingUserStatus}
          onClose={closeStatusModal}
          onSubmit={() => void submitUserStatusChange()}
          targetUser={statusTarget}
        />
      ) : null}
    </section>
  );
}
