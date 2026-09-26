import { useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useToast } from '../context/ToastContext';
import { searchUsers } from '../lib/api/users';
import { sendConnectionRequest } from '../lib/api/users';
import { getImageUrl } from '../lib/api/client';
import styles from './people.module.css';

const LIMIT = 12;

function useDebounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function PeoplePage() {
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sentRequests, setSentRequests] = useState({}); // { userId: true }
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q, pageNum = 1, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setSearched(true);
    try {
      const data = await searchUsers(q, pageNum, LIMIT);
      setResults((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === LIMIT);
      setPage(pageNum);
    } catch (err) {
      toast.error(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch(query.trim());
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length === 0) {
      // Reset on clear
      setResults([]);
      setSearched(false);
    }
  };

  const loadMore = () => doSearch(query.trim(), page + 1, true);

  // Load all users on mount
  const handleShowAll = () => {
    setQuery('');
    doSearch('', 1);
  };

  const handleConnect = async (userId, e) => {
    e.preventDefault();
    try {
      await sendConnectionRequest(userId);
      setSentRequests((prev) => ({ ...prev, [userId]: true }));
      toast.success('Connection request sent!');
    } catch (err) {
      if (err.message?.includes('already sent')) {
        setSentRequests((prev) => ({ ...prev, [userId]: true }));
        toast.info('Request already sent');
      } else {
        toast.error(err.message || 'Could not send request');
      }
    }
  };

  return (
    <>
      <Head>
        <title>Find People — WorkSphere</title>
        <meta name="description" content="Discover and connect with professionals on WorkSphere" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>Find People</h1>
            <p className={styles.subtitle}>Discover professionals and grow your network</p>
          </div>

          {/* Search form */}
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchInputWrap}>
              <SearchIcon className={styles.searchIcon} />
              <input
                type="text"
                className={`form-input ${styles.searchInput}`}
                placeholder="Search by name or username..."
                value={query}
                onChange={handleInputChange}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? <SpinnerIcon /> : 'Search'}
            </button>
          </form>

          {/* Browse all CTA */}
          {!searched && (
            <div className={styles.browseAll}>
              <button className="btn btn-secondary" onClick={handleShowAll} disabled={isLoading}>
                Browse all members
              </button>
            </div>
          )}

          {/* Results */}
          {isLoading && (
            <div className={styles.grid}>
              {[...Array(6)].map((_, i) => <PersonSkeleton key={i} />)}
            </div>
          )}

          {!isLoading && searched && results.length === 0 && (
            <div className="empty-state">
              <SearchEmptyIcon className="empty-state-icon" />
              <h3 className="empty-state-title">No results found</h3>
              <p className="empty-state-desc">
                Try a different name or username.
              </p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              <div className={styles.resultsInfo}>
                {results.length} result{results.length !== 1 ? 's' : ''}{hasMore ? '+' : ''}
              </div>
              <div className={styles.grid}>
                {results.map((profile) => {
                  const user = profile.userId;
                  const pic = user?.profilePicture ? getImageUrl(user.profilePicture) : null;
                  const initials = user?.name?.slice(0, 2).toUpperCase() || '??';
                  const alreadySent = sentRequests[user?._id];

                  return (
                    <div key={profile._id} className={styles.personCard}>
                      <Link href={`/profile/${user?._id}`} className={styles.personAvatar}>
                        {pic ? (
                          <img src={pic} alt={initials} className={`avatar avatar-2xl ${styles.avatar}`} />
                        ) : (
                          <div className={styles.avatarFallback}>{initials}</div>
                        )}
                      </Link>

                      <Link href={`/profile/${user?._id}`} className={styles.personName}>
                        {user?.name || 'Unknown'}
                      </Link>
                      <span className={styles.personUsername}>@{user?.username}</span>

                      {profile.currentPost && (
                        <span className={styles.personRole}>{profile.currentPost}</span>
                      )}

                      {profile.skills?.length > 0 && (
                        <div className={styles.personSkills}>
                          {profile.skills.slice(0, 3).map((s) => (
                            <span key={s._id} className="badge badge-neutral">{s.skill}</span>
                          ))}
                        </div>
                      )}

                      <div className={styles.personActions}>
                        {alreadySent ? (
                          <span className="badge badge-primary" style={{ padding: '6px 14px' }}>
                            <CheckIcon /> Requested
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => handleConnect(user?._id, e)}
                          >
                            <ConnectIcon /> Connect
                          </button>
                        )}
                        <Link href={`/profile/${user?._id}`} className="btn btn-ghost btn-sm">
                          View profile
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
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
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PersonSkeleton() {
  return (
    <div className={styles.personCard} style={{ pointerEvents: 'none' }}>
      <div className="skeleton skeleton-avatar" style={{ width: 72, height: 72, marginBottom: 12 }} />
      <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '40%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '70%' }} />
    </div>
  );
}

// Icons
function SearchIcon({ className }) {
  return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
}
function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function ConnectIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
}
function CheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
}
function SpinnerIcon() {
  return <span style={{ display:'inline-block', width:16, height:16, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />;
}
function SearchEmptyIcon({ className }) {
  return <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
}
