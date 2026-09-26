import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { getMyIncomingRequests, respondToRequest } from '../../lib/api/users';
import { getImageUrl } from '../../lib/api/client';
import styles from './requests.module.css';

export default function RequestsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const loadRequests = () => {
    setIsLoading(true);
    getMyIncomingRequests()
      .then((data) => {
        // Only show pending requests (null = pending)
        setRequests(data.filter((r) => r.status_accepted === null));
      })
      .catch((err) => toast.error(err.message || 'Failed to load requests'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const handleRespond = async (requestId, action) => {
    setRespondingId(requestId);
    try {
      await respondToRequest(requestId, action);
      // Backend returns same message for accept/reject - use action we sent
      const label = action === 'accept' ? 'accepted' : 'declined';
      toast.success(`Connection request ${label}`);
      // Remove from pending list
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (err) {
      toast.error(err.message || 'Could not respond to request');
    } finally {
      setRespondingId(null);
    }
  };

  const pendingCount = requests.length;

  return (
    <>
      <Head>
        <title>Connection Requests — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>
                Incoming Requests
                {pendingCount > 0 && (
                  <span className={styles.badge}>{pendingCount}</span>
                )}
              </h1>
              <p className={styles.subtitle}>People who want to connect with you</p>
            </div>
            <Link href="/connections" className="btn btn-secondary btn-sm">
              My connections
            </Link>
          </div>

          {isLoading ? (
            <div className={styles.list}>
              {[...Array(3)].map((_, i) => <RequestSkeleton key={i} />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <InboxIcon className="empty-state-icon" />
              <h3 className="empty-state-title">No pending requests</h3>
              <p className="empty-state-desc">You&apos;re all caught up. No connection requests waiting.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {requests.map((req) => {
                const person = req.userId;
                const pic = person?.profilePicture ? getImageUrl(person.profilePicture) : null;
                const initials = person?.name?.slice(0, 2).toUpperCase() || '??';
                const isResponding = respondingId === req._id;

                return (
                  <div key={req._id} className={styles.card}>
                    <Link href={`/profile/${person?._id}`} className={styles.cardLeft}>
                      {pic ? (
                        <img src={pic} alt={initials} className="avatar avatar-md" />
                      ) : (
                        <div className={styles.avatarFallback}>{initials}</div>
                      )}
                      <div className={styles.cardInfo}>
                        <span className={styles.cardName}>{person?.name || 'Unknown'}</span>
                        <span className={styles.cardUsername}>@{person?.username}</span>
                      </div>
                    </Link>

                    <div className={styles.cardActions}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRespond(req._id, 'reject')}
                        disabled={isResponding}
                      >
                        {isResponding ? <SpinnerIcon /> : 'Decline'}
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRespond(req._id, 'accept')}
                        disabled={isResponding}
                      >
                        {isResponding ? <SpinnerIcon /> : 'Accept'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function RequestSkeleton() {
  return (
    <div className={styles.card} style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <div className="skeleton skeleton-avatar" style={{ width: 44, height: 44 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '35%', marginBottom: 8 }} />
          <div className="skeleton skeleton-text" style={{ width: '20%' }} />
        </div>
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid transparent', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />;
}

function InboxIcon({ className }) {
  return <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}
