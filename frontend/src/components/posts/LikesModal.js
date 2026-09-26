import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getLikes } from '../../lib/api/likes';
import { getImageUrl } from '../../lib/api/client';
import styles from './LikesModal.module.css';

export default function LikesModal({ post, onClose }) {
  const [likesData, setLikesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLikes() {
      try {
        const data = await getLikes(post._id);
        setLikesData(data);
      } catch (err) {
        setError(err.message || 'Failed to load likes');
      } finally {
        setIsLoading(false);
      }
    }
    fetchLikes();
  }, [post._id]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Likes</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.center}>
              <div className="spinner" />
            </div>
          ) : error ? (
            <div className={styles.center}>
              <span className="form-error">{error}</span>
            </div>
          ) : likesData?.likes?.length === 0 ? (
            <div className={styles.center}>
              <p className={styles.emptyText}>No likes yet.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {likesData.likes.map((like) => {
                const authorPic = like.userId?.profilePicture
                  ? getImageUrl(like.userId.profilePicture)
                  : null;
                const authorInitials = like.userId?.name
                  ? like.userId.name.slice(0, 2).toUpperCase()
                  : '??';

                return (
                  <Link href={`/profile/${like.userId?._id}`} key={like._id} className={styles.userCard} onClick={onClose}>
                    {authorPic ? (
                      <img src={authorPic} alt={authorInitials} className={`avatar avatar-md`} />
                    ) : (
                      <div className={`avatar avatar-md ${styles.avatarFallback}`}>{authorInitials}</div>
                    )}
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{like.userId?.name}</span>
                      <span className={styles.userRole}>@{like.userId?.username}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
