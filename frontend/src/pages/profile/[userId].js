import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getUserProfile, sendConnectionRequest, downloadResume } from '../../lib/api/users';
import { getImageUrl } from '../../lib/api/client';
import styles from './userProfile.module.css';

export default function UserProfilePage() {
  const router = useRouter();
  const { userId } = router.query;
  const { currentUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    getUserProfile(userId)
      .then(setProfile)
      .catch((err) => {
        if (err.status === 404) setError('Profile not found');
        else setError(err.message || 'Failed to load profile');
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  const isOwnProfile = currentUser?.userId?._id === userId;

  const handleConnect = async () => {
    setIsSendingRequest(true);
    try {
      await sendConnectionRequest(userId);
      setRequestSent(true);
      toast.success('Connection request sent!');
    } catch (err) {
      if (err.message?.includes('already sent')) {
        setRequestSent(true);
        toast.info('Request already sent');
      } else {
        toast.error(err.message || 'Could not send request');
      }
    } finally {
      setIsSendingRequest(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeletonHeader}>
            <div className="skeleton skeleton-avatar" style={{ width: 96, height: 96 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton skeleton-text" style={{ width: '40%', height: 24, marginBottom: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '60%' }} />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginTop: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className="empty-state">
            <ErrorIcon className="empty-state-icon" />
            <h2 className="empty-state-title">{error}</h2>
            <button className="btn btn-secondary" onClick={() => router.back()}>Go back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const user = profile.userId;
  const avatarUrl = user.profilePicture ? getImageUrl(user.profilePicture) : null;
  const initials = user.name?.slice(0, 2).toUpperCase() || '??';

  return (
    <>
      <Head>
        <title>{user.name} — WorkSphere</title>
        <meta name="description" content={profile.bio || `${user.name}'s profile on WorkSphere`} />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={`card ${styles.profileHeader}`}>
            <div className={styles.headerMain}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={initials} className={`avatar avatar-3xl ${styles.avatar}`} />
              ) : (
                <div className={`${styles.avatarFallback}`}>{initials}</div>
              )}

              <div className={styles.headerInfo}>
                <h1 className={styles.name}>{user.name}</h1>
                <p className={styles.username}>@{user.username}</p>
                {profile.currentPost && (
                  <p className={styles.currentPost}>{profile.currentPost}</p>
                )}
                {profile.bio && (
                  <p className={styles.bio}>{profile.bio}</p>
                )}

                {/* Actions */}
                {!isOwnProfile && (
                  <div className={styles.actions}>
                    {!requestSent ? (
                      <button
                        className={`btn btn-primary ${isSendingRequest ? 'btn-loading' : ''}`}
                        onClick={handleConnect}
                        disabled={isSendingRequest}
                      >
                        {isSendingRequest ? '' : <><ConnectIcon /> Connect</>}
                      </button>
                    ) : (
                      <span className="badge badge-primary">
                        <CheckIcon /> Request sent
                      </span>
                    )}
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => downloadResume(user._id)}
                    >
                      <DownloadIcon /> Download resume
                    </button>
                  </div>
                )}

                {isOwnProfile && (
                  <div className={styles.actions}>
                    <Link href="/profile/edit" className="btn btn-secondary btn-sm">
                      Edit profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="card">
              <h2 className={styles.sectionTitle}>Skills</h2>
              <div className={styles.skills}>
                {[...profile.skills]
                  .sort((a, b) => b.priority - a.priority)
                  .map((s) => (
                    <span key={s._id} className="badge badge-primary">{s.skill}</span>
                  ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {profile.pastWork?.length > 0 && (
            <div className="card">
              <h2 className={styles.sectionTitle}>Experience</h2>
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
              <h2 className={styles.sectionTitle}>Education</h2>
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

          {/* Note: cannot show other user's posts - /user/posts only returns own posts */}
        </div>
      </div>
    </>
  );
}

function ConnectIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}
function ErrorIcon({ className }) {
  return <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
