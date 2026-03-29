import { useMemo, useState } from 'react';
import {
  buildGeneratedUserLoginCandidate,
  type CreateUserResponse,
  type ResetUserPasswordResponse,
  type UpdateUserStatusResponse,
  type UserRecord,
  type UserRoleDesignation,
} from '@bakki/domain';
import { useResetUserPasswordMutation, useSessionStatus } from '@/queries/auth';
import {
  useCreateUserMutation,
  useUpdateUserStatusMutation,
  useUserManagementData,
} from '@/queries/users';
import {
  buildPreviewPassword,
  canCreateUser as canCreateUserHelper,
  canSubmitCredentialReset,
  resolveUserManagementRenderState,
} from './user-management.utils';

function generatePreviewPassword() {
  return buildPreviewPassword();
}

export function useUserManagementPageState() {
  const [selectedRole, setSelectedRole] = useState<UserRoleDesignation>('planter');
  const { data, error, isPending, refetch } = useUserManagementData(selectedRole);
  const {
    mutateAsync,
    isPending: isCreatingUser,
    isError: isCreateError,
    error: createError,
    reset: resetCreateUser,
  } = useCreateUserMutation();
  const {
    mutateAsync: updateUserStatus,
    isPending: isUpdatingUserStatus,
    isError: isUpdateUserStatusError,
    error: updateUserStatusError,
    reset: resetUpdateUserStatus,
  } = useUpdateUserStatusMutation();
  const sessionQuery = useSessionStatus();
  const {
    mutateAsync: resetUserPassword,
    isPending: isResettingPassword,
    isError: isResetPasswordError,
    error: resetPasswordError,
    reset: resetPasswordMutation,
  } = useResetUserPasswordMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [previewPassword, setPreviewPassword] = useState(() => generatePreviewPassword());
  const [lastCreatedUser, setLastCreatedUser] = useState<CreateUserResponse | null>(null);
  const [credentialTarget, setCredentialTarget] = useState<UserRecord | null>(null);
  const [credentialReason, setCredentialReason] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [resetCredentials, setResetCredentials] = useState<ResetUserPasswordResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserRecord | null>(null);
  const [lastStatusChange, setLastStatusChange] = useState<UpdateUserStatusResponse | null>(null);
  const previewUsername = useMemo(
    () =>
      firstName.trim() || lastName.trim()
        ? buildGeneratedUserLoginCandidate(firstName, lastName)
        : '',
    [firstName, lastName],
  );
  const canCreateUser = useMemo(
    () => canCreateUserHelper(firstName, lastName, isCreatingUser),
    [firstName, isCreatingUser, lastName],
  );
  const canResetCredentials = Boolean(sessionQuery.data?.session?.user.canResetCredentials);
  const renderState = resolveUserManagementRenderState(data, isPending);
  const errorMessage = error instanceof Error
    ? error.message
    : 'The personnel registry could not be loaded.';
  const createErrorMessage = isCreateError
    ? createError instanceof Error
      ? createError.message
      : 'The user could not be created.'
    : null;
  const statusErrorMessage = isUpdateUserStatusError
    ? updateUserStatusError instanceof Error
      ? updateUserStatusError.message
      : 'The user status could not be updated.'
    : null;
  const credentialErrorMessage = isResetPasswordError
    ? resetPasswordError instanceof Error
      ? resetPasswordError.message
      : 'Password could not be reset.'
    : null;

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    setLastCreatedUser(null);
    if (isCreateError) {
      resetCreateUser();
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    setLastCreatedUser(null);
    if (isCreateError) {
      resetCreateUser();
    }
  };

  const handleCredentialReasonChange = (value: string) => {
    setCredentialReason(value);
    setCopyFeedback(null);
    setResetCredentials(null);
    if (isResetPasswordError) {
      resetPasswordMutation();
    }
  };

  const openCredentialModal = (user: UserRecord) => {
    setCredentialTarget(user);
    setCredentialReason('');
    setCopyFeedback(null);
    setResetCredentials(null);
    resetPasswordMutation();
  };

  const closeCredentialModal = () => {
    setCredentialTarget(null);
    setCredentialReason('');
    setCopyFeedback(null);
    setResetCredentials(null);
    resetPasswordMutation();
  };

  const openStatusModal = (user: UserRecord) => {
    setStatusTarget(user);
    setLastStatusChange(null);
    if (isUpdateUserStatusError) {
      resetUpdateUserStatus();
    }
  };

  const closeStatusModal = () => {
    setStatusTarget(null);
    if (isUpdateUserStatusError) {
      resetUpdateUserStatus();
    }
  };

  const submitCreateUser = async () => {
    if (!canCreateUser) {
      return;
    }

    const result = await mutateAsync({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: selectedRole,
      temporaryPassword: previewPassword,
    });

    setLastCreatedUser(result);
    setFirstName('');
    setLastName('');
    setPreviewPassword(generatePreviewPassword());
  };

  const submitCredentialReset = async () => {
    if (
      !credentialTarget
      || !canSubmitCredentialReset(credentialReason, canResetCredentials, isResettingPassword)
    ) {
      return;
    }

    const result = await resetUserPassword({
      targetUserId: credentialTarget.id,
      reason: credentialReason.trim(),
    });

    setResetCredentials(result);
    setCopyFeedback(null);
  };

  const handleCopyCredentials = async () => {
    if (!credentialTarget || !resetCredentials || credentialReason.trim().length < 4) {
      return;
    }

    const clipboardPayload = `Login: ${resetCredentials.username}\nTemporary password: ${resetCredentials.temporaryPassword}`;
    await navigator.clipboard.writeText(clipboardPayload);
    setCopyFeedback('Temporary password copied.');
  };

  const submitUserStatusChange = async () => {
    if (!statusTarget || isUpdatingUserStatus) {
      return;
    }

    const result = await updateUserStatus({
      userId: statusTarget.id,
      payload: {
        active: !statusTarget.isActive,
      },
    });

    setLastStatusChange(result);
    setStatusTarget(null);
  };

  return {
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
    sessionPending: sessionQuery.isPending,
    setSelectedRole,
    statusErrorMessage,
    statusTarget,
    submitCreateUser,
    submitCredentialReset,
    submitUserStatusChange,
  };
}
