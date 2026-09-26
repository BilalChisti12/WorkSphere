import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getComments, addComment, deleteComment } from '../../lib/api/comments';
import { getImageUrl } from '../../lib/api/client';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from './CommentsModal.module.css';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentsModal({ post, onClose }) {
  const { currentUser } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // comment object

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getComments(post._id)
      .then((data) => {
        if (!cancelled) setComments(data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load comments');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [post._id]);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment(post._id, commentText.trim());
      // Re-fetch to get new comment with user data
      const updated = await getComments(post._id);
      setComments(updated);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.message || 'Could not add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (comment) => {
    setDeletingId(comment._id);
    try {
      await deleteComment(post._id, comment._id);
      setComments((prev) => prev.filter((c) => c._id !== comment._id));
      toast.success('Comment deleted');
    } catch (err) {
      toast.error(err.message || 'Could not delete comment');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const canDeleteComment = (comment) => {
    if (!currentUser) return false;
    const myId = currentUser.userId._id;
    // Comment owner OR post owner can delete
    return comment.userId?._id === myId || post.userId?._id === myId;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal modal-lg ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Comments</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Post preview */}
        <div className={styles.postPreview}>
          <p className={styles.postBody}>{post.body}</p>
        </div>

        {/* Comments list */}
        <div className={styles.commentsList}>
          {isLoading ? (
            <div className={styles.loading}>
              {[...Array(3)].map((_, i) => (
                <CommentSkeleton key={i} />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className={styles.empty}>
              <CommentBubbleIcon />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((c) => {
              const pic = c.userId?.profilePicture ? getImageUrl(c.userId.profilePicture) : null;
              const initials = c.userId?.name?.slice(0, 2).toUpperCase() || '?';
              return (
                <div key={c._id} className={styles.comment}>
                  <Link href={`/profile/${c.userId?._id}`} className={styles.commentAvatar}>
                    {pic ? (
                      <img src={pic} alt={initials} className="avatar avatar-sm" />
                    ) : (
                      <div className={`${styles.commentAvatarFallback} avatar avatar-sm`}>{initials}</div>
                    )}
                  </Link>
                  <div className={styles.commentContent}>
                    <div className={styles.commentHeader}>
                      <Link href={`/profile/${c.userId?._id}`} className={styles.commentAuthor}>
                        {c.userId?.name || 'Unknown'}
                      </Link>
                      <span className={styles.commentTime}>{timeAgo(c.createdAt)}</span>
                      {canDeleteComment(c) && (
                        <button
                          className={styles.commentDelete}
                          onClick={() => setConfirmDelete(c)}
                          disabled={deletingId === c._id}
                          aria-label="Delete comment"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                    <p className={styles.commentBody}>{c.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add comment */}
        <form className={styles.addComment} onSubmit={handleSubmit}>
          <div className={styles.addCommentInner}>
            {currentUser?.userId?.profilePicture ? (
              <img
                src={getImageUrl(currentUser.userId.profilePicture)}
                alt=""
                className="avatar avatar-sm"
              />
            ) : (
              <div className={`${styles.commentAvatarFallback} avatar avatar-sm`}>
                {currentUser?.userId?.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              className={`form-input ${styles.commentInput}`}
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isSubmitting}
              maxLength={1000}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? <SpinnerIcon /> : 'Post'}
            </button>
          </div>
        </form>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete comment?"
          description="This comment will be permanently deleted."
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={deletingId === confirmDelete._id}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function CommentSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px 0' }}>
      <div className="skeleton skeleton-avatar" style={{ width: 36, height: 36 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton skeleton-text" style={{ width: '30%' }} />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <span style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      border: '2px solid transparent',
      borderTopColor: 'currentColor',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
    }} />
  );
}

function CommentBubbleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3 }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
