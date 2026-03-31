import { useState } from 'react';
import type { CaptureMethod, DraftReviewStatus } from '@bakki/domain';
import { localAssetUrls } from '@bakki/domain';
import { InlineStatusBanner } from '@bakki/ui';
import {
  usePendingDraftsQuery,
  useReviewDraftMutation,
  usePromoteDraftMutation,
  useDeleteDraftMutation,
  type PendingDraft,
} from '@/queries/drafts';

interface DraftReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatCaptureMethod(method: CaptureMethod): string {
  return method === 'boundary_walk' ? 'Boundary Walk' : 'Point by Point';
}

function formatReviewStatus(status: DraftReviewStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
  }
}

function getStatusBadgeClass(status: DraftReviewStatus): string {
  switch (status) {
    case 'pending':
      return 'draft-status-badge draft-status-pending';
    case 'approved':
      return 'draft-status-badge draft-status-approved';
    case 'rejected':
      return 'draft-status-badge draft-status-rejected';
  }
}

function DraftCard({
  draft,
  onApprove,
  onReject,
  onPromote,
  onDelete,
  isProcessing,
}: {
  draft: PendingDraft;
  onApprove: () => void;
  onReject: (notes?: string) => void;
  onPromote: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const handleReject = () => {
    if (showRejectForm) {
      onReject(rejectNotes.trim() || undefined);
      setShowRejectForm(false);
      setRejectNotes('');
    } else {
      setShowRejectForm(true);
    }
  };

  return (
    <div className="draft-review-card">
      <div className="draft-review-header">
        <div className="draft-review-title">
          <h4>{draft.draftName}</h4>
          <span className={getStatusBadgeClass(draft.reviewStatus)}>
            {formatReviewStatus(draft.reviewStatus)}
          </span>
        </div>
        <div className="draft-review-meta">
          <span>Zone: {draft.zoneName}</span>
          <span>•</span>
          <span>{(draft.areaHectaresEstimate ?? 0).toFixed(2)} ha</span>
          <span>•</span>
          <span>{formatCaptureMethod(draft.captureMethod)}</span>
        </div>
      </div>

      <div className="draft-review-details">
        <div className="draft-review-detail-row">
          <span className="draft-review-label">Captured by:</span>
          <span>{draft.creatorUsername ?? `User #${draft.creatorUserId}`}</span>
        </div>
        <div className="draft-review-detail-row">
          <span className="draft-review-label">GPS Accuracy:</span>
          <span>±{draft.averageGpsAccuracy.toFixed(1)}m</span>
        </div>
        <div className="draft-review-detail-row">
          <span className="draft-review-label">Captured:</span>
          <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
        </div>
        {draft.reviewerUserId !== null && (
          <div className="draft-review-detail-row">
            <span className="draft-review-label">Reviewed by:</span>
            <span>User #{draft.reviewerUserId}</span>
          </div>
        )}
        {draft.reviewerNotes && (
          <div className="draft-review-detail-row draft-rejection-reason">
            <span className="draft-review-label">Rejection reason:</span>
            <span>{draft.reviewerNotes}</span>
          </div>
        )}
      </div>

      {showRejectForm && (
        <div className="draft-reject-form">
          <textarea
            className="draft-reject-textarea"
            placeholder="Reason for rejection (optional)..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={2}
          />
        </div>
      )}

      <div className="draft-review-actions">
        {draft.reviewStatus === 'pending' && (
          <>
            <button
              className="draft-action-btn draft-action-approve"
              onClick={onApprove}
              disabled={isProcessing}
              type="button"
            >
              Approve
            </button>
            <button
              className="draft-action-btn draft-action-reject"
              onClick={handleReject}
              disabled={isProcessing}
              type="button"
            >
              {showRejectForm ? 'Confirm Reject' : 'Reject'}
            </button>
            {showRejectForm && (
              <button
                className="draft-action-btn draft-action-cancel"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectNotes('');
                }}
                disabled={isProcessing}
                type="button"
              >
                Cancel
              </button>
            )}
          </>
        )}
        {draft.reviewStatus === 'approved' && (
          <button
            className="draft-action-btn draft-action-promote"
            onClick={onPromote}
            disabled={isProcessing}
            type="button"
          >
            Promote to Area
          </button>
        )}
        <button
          className="draft-action-btn draft-action-delete"
          onClick={onDelete}
          disabled={isProcessing}
          type="button"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export function DraftReviewModal({ isOpen, onClose }: DraftReviewModalProps) {
  const pendingDraftsQuery = usePendingDraftsQuery();
  const reviewMutation = useReviewDraftMutation();
  const promoteMutation = usePromoteDraftMutation();
  const deleteMutation = useDeleteDraftMutation();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (draftId: string) => {
    setProcessingId(draftId);
    try {
      await reviewMutation.mutateAsync({ draftId, approved: true });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (draftId: string, notes?: string) => {
    setProcessingId(draftId);
    try {
      await reviewMutation.mutateAsync({ draftId, approved: false, notes });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePromote = async (draftId: string) => {
    setProcessingId(draftId);
    try {
      await promoteMutation.mutateAsync(draftId);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }
    setProcessingId(draftId);
    try {
      await deleteMutation.mutateAsync(draftId);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const drafts = pendingDraftsQuery.data ?? [];

  return (
    <div className="map-task-modal-shell" id="draft-review-modal">
      <div className="map-task-modal-backdrop" onClick={onClose} />
      <section className="map-task-figma-card draft-review-card-shell" role="dialog" aria-modal="true" aria-labelledby="draft-review-modal-title">
        <header className="map-task-figma-header">
          <div className="map-task-figma-heading">
            <h2 id="draft-review-modal-title">Mobile Area Drafts</h2>
            <p>Review and approve area boundaries captured from mobile devices</p>
          </div>
          <button className="map-task-figma-close" aria-label="Close draft review" onClick={onClose} type="button">
            <img src={localAssetUrls.close} alt="" />
          </button>
        </header>

        <div className="map-task-figma-body draft-review-body">
          {pendingDraftsQuery.isPending && (
            <div className="draft-review-loading">
              Loading drafts...
            </div>
          )}

          {pendingDraftsQuery.isError && (
            <InlineStatusBanner
              heading="Failed to load drafts"
              message="The pending drafts could not be loaded. Please try again."
              tone="error"
            />
          )}

          {pendingDraftsQuery.isSuccess && drafts.length === 0 && (
            <div className="draft-review-empty">
              <p><strong>No pending drafts from mobile devices.</strong></p>
              <p className="draft-review-empty-hint">
                Area drafts captured on the mobile app will appear here for review.
              </p>
            </div>
          )}

          {pendingDraftsQuery.isSuccess && drafts.length > 0 && (
            <div className="draft-review-list">
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.draftRef}
                  draft={draft}
                  onApprove={() => handleApprove(draft.draftRef)}
                  onReject={(notes) => handleReject(draft.draftRef, notes)}
                  onPromote={() => handlePromote(draft.draftRef)}
                  onDelete={() => handleDelete(draft.draftRef)}
                  isProcessing={processingId === draft.draftRef}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="map-task-figma-footer">
          <div />
          <div className="map-task-figma-actions">
            <button className="map-task-figma-cancel" onClick={onClose} type="button">Close</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
