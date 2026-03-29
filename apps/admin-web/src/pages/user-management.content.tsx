import {
  localAssetUrls,
  type CreateUserResponse,
  type UpdateUserStatusResponse,
  type UserManagementData,
  type UserRecord,
  type UserRoleDesignation,
} from '@bakki/domain';
import {
  ActionButton,
  EmptyStatePanel,
  FormFieldGrid,
  InlineStatusBanner,
  SurfaceCard,
  TableSurface,
} from '@bakki/ui';
import {
  OwnerIcon,
  TreePlanterIcon,
  UserRow,
} from './user-management.sections';

interface UserManagementContentProps {
  canCreateUser: boolean;
  createErrorMessage: string | null;
  data: UserManagementData;
  firstName: string;
  isCreatingUser: boolean;
  lastCreatedUser: CreateUserResponse | null;
  lastName: string;
  lastStatusChange: UpdateUserStatusResponse | null;
  onCreateUser: () => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onOpenCredentialModal: (user: UserRecord) => void;
  onOpenStatusModal: (user: UserRecord) => void;
  onRoleSelect: (role: UserRoleDesignation) => void;
  previewPassword: string;
  previewUsername: string;
  selectedRole: UserRoleDesignation;
}

export function UserManagementContent({
  canCreateUser,
  createErrorMessage,
  data,
  firstName,
  isCreatingUser,
  lastCreatedUser,
  lastName,
  lastStatusChange,
  onCreateUser,
  onFirstNameChange,
  onLastNameChange,
  onOpenCredentialModal,
  onOpenStatusModal,
  onRoleSelect,
  previewPassword,
  previewUsername,
  selectedRole,
}: UserManagementContentProps) {
  return (
    <div className="page-content users-figma-page" data-node-id="60:4285">
      {createErrorMessage ? (
        <InlineStatusBanner
          className="bakki-page-inline-state"
          heading="User creation failed"
          message={createErrorMessage}
          tone="error"
        />
      ) : null}
      {lastCreatedUser ? (
        <InlineStatusBanner
          className="bakki-page-inline-state"
          heading="Personnel added"
          message={`Created ${lastCreatedUser.createdUser.fullName}. Login: ${lastCreatedUser.generatedUsername}. Temporary password: ${lastCreatedUser.temporaryPassword}.`}
          tone="neutral"
        />
      ) : null}
      {lastStatusChange ? (
        <InlineStatusBanner
          className="bakki-page-inline-state"
          heading="User status updated"
          message={`${lastStatusChange.updatedUser.fullName} is now ${lastStatusChange.updatedUser.isActive ? 'active' : 'inactive'}.`}
          tone="neutral"
        />
      ) : null}

      <header className="users-figma-heading">
        <h1>User Management</h1>
      </header>

      <div className="users-figma-grid">
        <SurfaceCard as="section" className="users-figma-onboard-card">
          <div className="users-figma-card-title">
            <img src={localAssetUrls.onboard} alt="" />
            <h2>Onboard New Personnel</h2>
          </div>

          <FormFieldGrid className="users-figma-form-grid">
            <label className="users-figma-field">
              <span>First Name</span>
              <input
                className="users-figma-input users-figma-input-control"
                onChange={(event) => onFirstNameChange(event.target.value)}
                placeholder={data.firstNamePlaceholder}
                type="text"
                value={firstName}
              />
            </label>
            <label className="users-figma-field">
              <span>Last Name</span>
              <input
                className="users-figma-input users-figma-input-control"
                onChange={(event) => onLastNameChange(event.target.value)}
                placeholder={data.lastNamePlaceholder}
                type="text"
                value={lastName}
              />
            </label>
          </FormFieldGrid>

          <div className="users-figma-role-block">
            <div className="users-figma-label">Role Designation</div>
            <div className="users-figma-role-grid">
              {data.roleOptions.map((role) => (
                <button
                  className={`users-figma-role-card${selectedRole === role.id ? ' is-active' : ''}`}
                  key={role.id}
                  onClick={() => onRoleSelect(role.id)}
                  type="button"
                >
                  <span className="users-figma-role-icon" aria-hidden="true">
                    {role.id === 'planter' ? <TreePlanterIcon /> : <OwnerIcon />}
                  </span>
                  <strong>{role.label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="users-figma-preview-card">
            <div className="users-figma-preview-head">
              <span>Auto-Generation Preview</span>
              <img src={localAssetUrls.preview} alt="" />
            </div>
            <div className="users-figma-preview-grid">
              <div>
                <small>Generated Login</small>
                <strong>{previewUsername || data.previewUsernamePlaceholder}</strong>
              </div>
              <div>
                <small>Temporary Password</small>
                <strong>{previewPassword}</strong>
              </div>
            </div>
          </div>

          <div className="users-figma-primary-wrap">
            <ActionButton
              aria-label="Add User"
              className="users-figma-primary"
              disabled={!canCreateUser}
              label={isCreatingUser ? 'Adding User...' : 'Add User'}
              labelClassName="users-figma-primary-label"
              onClick={onCreateUser}
              trailingClassName="users-figma-primary-icon"
              trailingVisual={
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M8 3L13 8L8 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </SurfaceCard>

        <SurfaceCard as="aside" className="users-figma-permissions-card">
          <div className="users-figma-card-title">
            <img src={localAssetUrls.permissions} alt="" />
            <h2>{data.permissionsTitle}</h2>
          </div>

          {data.permissionGroups.map((group) => (
            <div className="users-figma-permission-group" key={group.id}>
              <div className="users-figma-permission-eyebrow">{group.eyebrow}</div>
              {group.items.map((item) => (
                <div className="users-figma-permission-row" key={item.label}>
                  <span>{item.label}</span>
                  <span className={`users-figma-check${item.checked ? ' is-checked' : ''}`} />
                </div>
              ))}
            </div>
          ))}

          <div className="users-figma-note">
            <img src={localAssetUrls.note} alt="" />
            <p>{data.permissionsNote}</p>
          </div>
        </SurfaceCard>
      </div>

      <TableSurface
        cardClassName="users-figma-table-card"
        className="users-figma-registry-shell"
        footer={
          <footer className="users-figma-table-footer">
            <span>Showing {data.registryUsers.length} personnel</span>
            <div className="users-figma-pagination">
              <button aria-label="Previous page" type="button">
                <img src={localAssetUrls.chevronLeft} alt="" />
              </button>
              <button aria-label="Next page" type="button">
                <img src={localAssetUrls.chevronRight} alt="" />
              </button>
            </div>
          </footer>
        }
        header={
          <div className="users-figma-registry-head">
            <div>
              <h2>{data.registryTitle}</h2>
              <p>{data.registrySubtitle}</p>
            </div>
            <div className="users-figma-search">
              <img src={localAssetUrls.search} alt="" />
              <span>Filter agents...</span>
            </div>
          </div>
        }
      >
        <table className="users-figma-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Login</th>
              <th>Role</th>
              <th>Mobile Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.registryUsers.length > 0 ? (
              data.registryUsers.map((user) => (
                <UserRow
                  key={user.id}
                  onToggleActive={() => onOpenStatusModal(user)}
                  onReveal={() => onOpenCredentialModal(user)}
                  user={user}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyStatePanel
                    className="bakki-table-empty-state"
                    heading="No personnel records"
                    message="Create the first owner or planter to populate the registry."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableSurface>
    </div>
  );
}
