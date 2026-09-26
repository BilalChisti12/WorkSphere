import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { getMyOutgoingRequests } from '../../lib/api/users';
import { getImageUrl } from '../../lib/api/client';
import styles from './connections.module.css';

const STATUS_LABELS = {
  null: { label: 'Pending', class: 'badge-warning' },
  true: { label: 'Connected', class: 'badge-success' },
  false: { label: 'Declined', class: 'badge-danger' },
};

export default function ConnectionsPage() {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | pending | accepted | rejected

  useEffect(() => {
    setIsLoading(true);
    getMyOutgoingRequests()
      .then((data) => setRequests(data.reqs || []))
      .catch((err) => toast.error(err.message || 'Failed to load connections'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    if (filter === 'pending') return r.status_accepted === null;
    if (filter === 'accepted') return r.status_accepted === true;
    if (filter === 'rejected') return r.status_accepted === false;
    return true;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status_accepted === null).length,
    accepted: requests.filter((r) => r.status_accepted === true).length,
    rejected: requests.filter((r) => r.status_accepted === false).length,
  };

  return (
    <>
      <Head>
        <title>My Connections — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>My Connections</h1>
              <p className={styles.subtitle}>Track your outgoing connection requests</p>
            </div>
            <div className={styles.headerActions}>
              <Link href="/connections/requests" className="btn btn-secondary btn-sm">
                Incoming requests
              </Link>
              <Link href="/people" className="btn btn-primary btn-sm">
                Find people
              </Link>
            </div>
          </div>

          {/* Filter tabs */}
          <div className={styles.filters}>
            {['all', 'pending', 'accepted', 'rejected'].map((f) => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className={styles.filterCount}>{counts[f]}</span>
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading ? (
            <div className={styles.list}>
              {[...Array(4)].map((_, i) => <ConnectionSkeleton key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <NetworkIcon className="empty-state-icon" />
              <h3 className="empty-state-title">
                {filter === 'all' ? 'No connections yet' : `No ${filter} requests`}
              </h3>
              <p className="empty-state-desc">
                {filter === 'all' ? 'Start connecting with people in your network.' : ''}
              </p>
              {filter === 'all' && (
                <Link href="/people" className="btn btn-primary">Find people</Link>
              )}
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((req) => {
                const person = req.connectionId;
                const pic = person?.profilePicture ? getImageUrl(person.profilePicture) : null;
                const initials = person?.name?.slice(0, 2).toUpperCase() || '??';
                const status = STATUS_LABELS[req.status_accepted];

                return (
                  <div key={req._id} className={styles.card}>
                    <Link href={`/profile/${person?._id}`} className={styles.cardAvatar}>
                      {pic ? (
                        <img src={pic} alt={initials} className="avatar avatar-md" />
                      ) : (
                        <div className={styles.avatarFallback}>{initials}</div>
                      )}
                    </Link>
                    <div className={styles.cardInfo}>
                      <Link href={`/profile/${person?._id}`} className={styles.cardName}>
                        {person?.name || 'Unknown'}
                      </Link>
                      <span className={styles.cardUsername}>@{person?.username}</span>
                    </div>
                    <span className={`badge ${status.class}`}>
                      {status.label}
                    </span>
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

function ConnectionSkeleton() {
  return (
    <div className={styles.card}>
      <div className="skeleton skeleton-avatar" style={{ width: 44, height: 44 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton skeleton-text" style={{ width: '35%', marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '25%' }} />
      </div>
    </div>
  );
}

function NetworkIcon({ className }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M12 8v5M5 16l5-3M19 16l-5-3" />
    </svg>
  );
}
