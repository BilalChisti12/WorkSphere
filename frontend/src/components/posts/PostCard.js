import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { likePost } from '../../lib/api/likes';
import { deletePost as deletePostApi } from '../../lib/api/posts';
import { getComments, addComment, deleteComment } from '../../lib/api/comments';
import { getImageUrl } from '../../lib/api/client';
import { getLikes } from '../../lib/api/likes';
import CommentsModal from './CommentsModal';
import LikesModal from './LikesModal';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from './PostCard.module.css';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, onDelete }) {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [likesCount, setLikesCount] = useState(0);
  const [showLikesModal, setShowLikesModal] = useState(false);

  // Fetch initial likes count
  useEffect(() => {
    getLikes(post._id).then((data) => {
      setLikesCount(data.count || 0);
      // If current user is in the likes list, mark as liked locally
      if (data.likes?.some(l => l.userId?._id === currentUser?.userId?._id)) {
        setLiked(true);
      }
    }).catch(console.error);
  }, [post._id, currentUser]);

  const isOwner = currentUser?.userId?._id === post.userId?._id;

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

  const authorPic = post.userId?.profilePicture
    ? getImageUrl(post.userId.profilePicture)
    : null;

  const authorInitials = post.userId?.name
    ? post.userId.name.slice(0, 2).toUpperCase()
    : '??';

  const handleLike = async () => {
    if (liked || isLiking) return;
    setIsLiking(true);
    try {
      await likePost(post._id);
      setLiked(true);
      setLikesCount(prev => prev + 1);
      toast.success('Post liked');
    } catch (err) {
      // 400 "already liked" = already liked
      if (err.status === 400 && err.message?.includes('already liked')) {
        setLiked(true);
      } else {
        toast.error(err.message || 'Could not like post');
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePostApi(post._id);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch (err) {
      toast.error(err.message || 'Could not delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const mediaUrl = post.media ? `${backendUrl}/${post.media}` : null;
  const isVideo = post.fileType && ['mp4', 'webm', 'mov'].includes(post.fileType.toLowerCase());

  return (
    <>
      <article className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <Link href={`/profile/${post.userId?._id}`} className={styles.authorLink}>
            {authorPic ? (
              <img src={authorPic} alt={authorInitials} className={`avatar avatar-md ${styles.avatar}`} />
            ) : (
              <div className={`${styles.avatarFallback} avatar avatar-md`}>{authorInitials}</div>
            )}
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>{post.userId?.name || 'Unknown'}</span>
              <span className={styles.authorMeta}>
                @{post.userId?.username || 'unknown'} · {timeAgo(post.createdAt)}
              </span>
            </div>
          </Link>

          {isOwner && (
            <button
              className={`btn btn-ghost btn-icon ${styles.deleteBtn}`}
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete post"
              aria-label="Delete post"
            >
              <TrashIcon />
            </button>
          )}
        </div>

        {/* Content */}
        {post.body && (
          <div className={styles.body}>
            <p className={styles.bodyText}>{post.body}</p>
          </div>
        )}

        {/* Media */}
        {mediaUrl && (
          <div className={styles.media}>
            {isVideo ? (
              <video controls className={styles.mediaElement} preload="metadata">
                <source src={mediaUrl} />
                Your browser does not support this video.
              </video>
            ) : (
              <img src={mediaUrl} alt="Post media" className={styles.mediaElement} loading="lazy" />
            )}
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
              onClick={handleLike}
              disabled={liked || isLiking}
              aria-label={liked ? 'Liked' : 'Like post'}
            >
              <HeartIcon filled={liked} />
              <span>{liked ? 'Liked' : 'Like'}</span>
            </button>
            
            {likesCount > 0 && (
              <button 
                className={styles.likesCountBtn} 
                onClick={() => setShowLikesModal(true)}
                title="View likes"
              >
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </button>
            )}
          </div>

          <button
            className={styles.actionBtn}
            onClick={() => setShowComments(true)}
            aria-label="View comments"
          >
            <CommentIcon />
            <span>Comment</span>
          </button>
        </div>
      </article>

      {/* Comments Modal */}
      {showComments && (
        <CommentsModal
          post={post}
          onClose={() => setShowComments(false)}
        />
      )}

      {/* Likes Modal */}
      {showLikesModal && (
        <LikesModal
          post={post}
          onClose={() => setShowLikesModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete post?"
          description="This action cannot be undone. The post and all its comments will be permanently deleted."
          confirmLabel="Delete"
          confirmVariant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}
