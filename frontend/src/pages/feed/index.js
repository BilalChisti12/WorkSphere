import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getFeed } from '../../lib/api/posts';
import { useToast } from '../../context/ToastContext';
import PostCard from '../../components/posts/PostCard';
import styles from './feed.module.css';

const LIMIT = 10;

function PostSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonHeader}>
        <div className="skeleton skeleton-avatar" style={{ width: 44, height: 44 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: '25%' }} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="skeleton skeleton-text" style={{ width: '100%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

export default function FeedPage() {
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const loadFeed = useCallback(async (pageNum, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await getFeed(pageNum, LIMIT);
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      setError(err.message || 'Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(1);
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await loadFeed(nextPage, true);
  };

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  return (
    <>
      <Head>
        <title>Feed — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.layout}>
          {/* Main feed */}
          <div className={styles.feed}>
            {/* Create post CTA */}
            <Link href="/posts/create" className={styles.createCta}>
              <div className={styles.createCtaInner}>
                <div className={styles.createCtaAvatar}>
                  <PencilIcon />
                </div>
                <span className={styles.createCtaText}>What&apos;s on your mind?</span>
                <span className={`btn btn-primary btn-sm ${styles.createCtaBtn}`}>Post</span>
              </div>
            </Link>

            {/* Loading state */}
            {isLoading && (
              <div className={styles.postList}>
                {[...Array(3)].map((_, i) => <PostSkeleton key={i} />)}
              </div>
            )}

            {/* Error state */}
            {!isLoading && error && (
              <div className={styles.errorState}>
                <ErrorIcon />
                <h3>Failed to load feed</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => loadFeed(1)}>
                  Try again
                </button>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && posts.length === 0 && (
              <div className="empty-state">
                <RssIcon className="empty-state-icon" />
                <h3 className="empty-state-title">Your feed is empty</h3>
                <p className="empty-state-desc">
                  Connect with people to see their posts here, or create your first post.
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <Link href="/people" className="btn btn-primary">Find people</Link>
                  <Link href="/posts/create" className="btn btn-secondary">Create post</Link>
                </div>
              </div>
            )}

            {/* Posts */}
            {!isLoading && posts.length > 0 && (
              <div className={styles.postList}>
                {posts.map((post) => (
                  <PostCard key={post._id} post={post} onDelete={handleDelete} />
                ))}
              </div>
            )}

            {/* Load more */}
            {!isLoading && hasMore && posts.length > 0 && (
              <div className={styles.loadMore}>
                <button
                  className={`btn btn-secondary ${isLoadingMore ? 'btn-loading' : ''}`}
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? '' : 'Load more'}
                </button>
              </div>
            )}

            {/* End of feed */}
            {!isLoading && !hasMore && posts.length > 0 && (
              <div className={styles.endMessage}>You&apos;re all caught up ✓</div>
            )}
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <div className="card">
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '12px' }}>
                Quick links
              </h3>
              <nav className={styles.sidebarNav}>
                <Link href="/posts/create" className={styles.sidebarLink}>
                  <PlusIcon /> Create post
                </Link>
                <Link href="/posts/create?schedule=1" className={styles.sidebarLink}>
                  <ClockIcon /> Schedule post
                </Link>
                <Link href="/people" className={styles.sidebarLink}>
                  <PeopleIcon /> Find people
                </Link>
                <Link href="/connections/requests" className={styles.sidebarLink}>
                  <ConnectionIcon /> Requests
                </Link>
                <Link href="/search" className={styles.sidebarLink}>
                  <SearchIcon /> Search posts
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

// Icons
function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function RssIcon({ className }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
