import { useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import { searchPosts } from '../lib/api/search';
import styles from './search.module.css';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const handleSearch = useCallback(async (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setIsLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchPosts(q);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <>
      <Head>
        <title>Search Posts — WorkSphere</title>
        <meta name="description" content="Full-text search across all WorkSphere posts powered by Elasticsearch" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Search Posts</h1>
            <p className={styles.subtitle}>Full-text search powered by Elasticsearch</p>
          </div>

          {/* Search form */}
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchInputWrap}>
              <SearchIcon className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                className={`form-input ${styles.searchInput}`}
                placeholder="Search posts by keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  className={styles.clearBtn}
                  onClick={handleClear}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? <SpinnerIcon /> : 'Search'}
            </button>
          </form>

          {/* Note about Elasticsearch results */}
          {!searched && (
            <div className={styles.infoBox}>
              <InfoIcon />
              <span>
                Search queries are matched against post content using Elasticsearch relevance scoring.
                Results are not paginated (max 10 per search). The author name is not available in search results due to a backend limitation.
              </span>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className={styles.resultsList}>
              {[...Array(4)].map((_, i) => <SearchResultSkeleton key={i} />)}
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className={styles.errorBox}>
              <ErrorIcon />
              <div>
                <strong>Search failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Empty */}
          {!isLoading && searched && !error && results.length === 0 && (
            <div className="empty-state">
              <SearchEmptyIcon className="empty-state-icon" />
              <h3 className="empty-state-title">No results for &ldquo;{query}&rdquo;</h3>
              <p className="empty-state-desc">Try different keywords or check your spelling.</p>
            </div>
          )}

          {/* Results */}
          {!isLoading && results.length > 0 && (
            <>
              <div className={styles.resultsHeader}>
                <span className={styles.resultsCount}>
                  {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
                </span>
                <span className={styles.resultsNote}>Sorted by relevance</span>
              </div>
              <div className={styles.resultsList}>
                {results.map((post) => (
                  <div key={post._id} className={styles.resultCard}>
                    <div className={styles.resultMeta}>
                      {/* userId is raw string in search results — author name unavailable per spec */}
                      <span className={styles.resultAuthorNote}>Post</span>
                      {post.publishedAt && (
                        <span className={styles.resultTime}>{timeAgo(post.publishedAt)}</span>
                      )}
                    </div>
                    <p className={styles.resultBody}>{post.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SearchResultSkeleton() {
  return (
    <div className={styles.resultCard} style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div className="skeleton skeleton-text" style={{ width: '15%' }} />
        <div className="skeleton skeleton-text" style={{ width: '10%' }} />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '100%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '80%', marginBottom: 8 }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
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
function SpinnerIcon() {
  return <span style={{ display:'inline-block', width:16, height:16, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />;
}
function InfoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function ErrorIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0, color:'var(--color-danger)'}}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
}
function SearchEmptyIcon({ className }) {
  return <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>;
}
