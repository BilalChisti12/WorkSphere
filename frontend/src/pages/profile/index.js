import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getMyPosts } from '../../lib/api/posts';
import { downloadResume } from '../../lib/api/users';
import { getImageUrl } from '../../lib/api/client';
import PostCard from '../../components/posts/PostCard';
import styles from './profile.module.css';

const LIMIT = 10;

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className="skeleton skeleton-avatar" style={{ width: 96, height: 96 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: 24, marginBottom: 12 }} />
            <div className="skeleton skeleton-text" style={{ width: '25%', marginBottom: 8 }} />
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const { currentUser, isLoading: authLoading, refreshCurrentUser } = useAuth();
  const toast = useToast();

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const loadPosts = useCallback(async (pageNum, append = false) => {
    if (append) setIsLoadingMore(true);
    else setPostsLoading(true);
    try {
      const data = await getMyPosts(pageNum, LIMIT);
      setPosts((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
    } catch (err) {
      toast.error(err.message || 'Could not load posts');
    } finally {
      setPostsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) loadPosts(1);
  }, [authLoading]);

  const loadMorePosts = async () => {
    const next = page + 1;
    setPage(next);
    await loadPosts(next, true);
  };

  const handleDeletePost = (id) => setPosts((prev) => prev.filter((p) => p._id !== id));

  if (authLoading) return <ProfileSkeleton />;
  if (!currentUser) return null;

  const user = currentUser.userId;
  const profile = currentUser;
  const avatarUrl = user.profilePicture ? getImageUrl(user.profilePicture) : null;
  const initials = user.name?.slice(0, 2).toUpperCase() || '??';

  return (
    <>
      <Head>
        <title>{user.name} — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Profile Header */}
          <div className={`card ${styles.profileHeader}`}>
            <div className={styles.headerMain}>
              <div className={styles.avatarWrap}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={initials} className={`avatar avatar-3xl ${styles.avatar}`} />
                ) : (
                  <div className={`${styles.avatarFallback} avatar-3xl`}>{initials}</div>
                )}
              </div>

              <div className={styles.headerInfo}>
                <div className={styles.nameRow}>
                  <h1 className={styles.name}>{user.name}</h1>
                  <div className={styles.headerActions}>
                    <Link href="/profile/edit" className="btn btn-secondary btn-sm">
                      <EditIcon /> Edit profile
                    </Link>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => downloadResume(user._id)}
                      title="Download resume PDF"
                    >
                      <DownloadIcon /> Resume
                    </button>
                  </div>
                </div>
                <p className={styles.username}>@{user.username}</p>
                {profile.currentPost && (
                  <p className={styles.currentPost}>{profile.currentPost}</p>
                )}
                {profile.bio && (
                  <p className={styles.bio}>{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{posts.length}{hasMore ? '+' : ''}</span>
                <span className={styles.statLabel}>Posts</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.skills?.length || 0}</span>
                <span className={styles.statLabel}>Skills</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{profile.pastWork?.length || 0}</span>
                <span className={styles.statLabel}>Positions</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'about' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('about')}
            >
              About
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'posts' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts ({posts.length}{hasMore ? '+' : ''})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'about' && (
              <div className={styles.aboutGrid}>
                {/* Skills */}
                {profile.skills?.length > 0 && (
                  <div className="card">
                    <h3 className={styles.sectionTitle}>Skills</h3>
                    <div className={styles.skills}>
                      {[...profile.skills]
                        .sort((a, b) => b.priority - a.priority)
                        .map((s) => (
                          <span key={s._id} className="badge badge-primary">{s.skill}</span>
                        ))}
                    </div>
                  </div>
                )}

                {/* Current position */}
                {profile.currentPost && (
                  <div className="card">
                    <h3 className={styles.sectionTitle}>Current position</h3>
                    <p className={styles.currentPostFull}>{profile.currentPost}</p>
                  </div>
                )}

                {/* Past Work */}
                {profile.pastWork?.length > 0 && (
                  <div className="card">
                    <h3 className={styles.sectionTitle}>Experience</h3>
                    <div className={styles.timeline}>
                      {profile.pastWork.map((w) => (
                        <div key={w._id} className={styles.timelineItem}>
                          <div className={styles.timelineDot} />
                          <div>
                            <div className={styles.timelineTitle}>{w.position}</div>
                            <div className={styles.timelineSub}>{w.company} · {w.years}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {profile.education?.length > 0 && (
                  <div className="card">
                    <h3 className={styles.sectionTitle}>Education</h3>
                    <div className={styles.timeline}>
                      {profile.education.map((e) => (
                        <div key={e._id} className={styles.timelineItem}>
                          <div className={styles.timelineDot} />
                          <div>
                            <div className={styles.timelineTitle}>{e.school}</div>
                            <div className={styles.timelineSub}>{e.degree} · {e.fieldOfStudy}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!profile.bio && !profile.currentPost && profile.skills?.length === 0 && profile.pastWork?.length === 0 && profile.education?.length === 0 && (
                  <div className="empty-state">
                    <ProfileIcon className="empty-state-icon" />
                    <h3 className="empty-state-title">Profile incomplete</h3>
                    <p className="empty-state-desc">Add your bio, skills, and experience.</p>
                    <Link href="/profile/edit" className="btn btn-primary">Edit profile</Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className={styles.postSection}>
                {postsLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="card" style={{ padding: '20px' }}>
                        <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
                        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                      </div>
                    ))}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="empty-state">
                    <PostIcon className="empty-state-icon" />
                    <h3 className="empty-state-title">No posts yet</h3>
                    <p className="empty-state-desc">Share your first post with the network.</p>
                    <Link href="/posts/create" className="btn btn-primary">Create post</Link>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {posts.map((p) => (
                        <PostCard key={p._id} post={p} onDelete={handleDeletePost} />
                      ))}
                    </div>
                    {hasMore && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <button
                          className={`btn btn-secondary ${isLoadingMore ? 'btn-loading' : ''}`}
                          onClick={loadMorePosts}
                          disabled={isLoadingMore}
                        >
                          {isLoadingMore ? '' : 'Load more'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ProfileIcon({ className }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PostIcon({ className }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
