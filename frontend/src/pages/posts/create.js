import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createPost, schedulePost } from '../../lib/api/posts';
import { useToast } from '../../context/ToastContext';
import styles from './create.module.css';

export default function CreatePostPage() {
  const router = useRouter();
  const toast = useToast();
  const isScheduleMode = router.query.schedule === '1';

  const [mode, setMode] = useState(isScheduleMode ? 'schedule' : 'immediate');
  const [body, setBody] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bodyError, setBodyError] = useState('');
  const [timeError, setTimeError] = useState('');

  useEffect(() => {
    if (isScheduleMode) setMode('schedule');
  }, [isScheduleMode]);

  // Set minimum scheduledTime to 2 minutes from now
  const getMinDateTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const validate = () => {
    let valid = true;
    if (!body.trim() && !mediaFile) {
      setBodyError('Post content or media is required');
      valid = false;
    } else {
      setBodyError('');
    }
    if (mode === 'schedule') {
      if (!scheduledTime) {
        setTimeError('Scheduled time is required');
        valid = false;
      } else if (new Date(scheduledTime) <= new Date()) {
        setTimeError('Scheduled time must be in the future');
        valid = false;
      } else {
        setTimeError('');
      }
    }
    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (mode === 'immediate') {
        const res = await createPost(body.trim(), mediaFile);
        if (res.message && res.message.includes('delayed')) {
          toast.warning(res.message, 6000);
        } else {
          toast.success(res.message || 'Post published!');
        }
        router.push('/feed');
      } else {
        const res = await schedulePost(body.trim(), new Date(scheduledTime).toISOString(), mediaFile);
        if (res.message && res.message.includes('delayed')) {
          toast.warning(res.message, 6000);
        } else {
          toast.success(res.message || 'Post scheduled successfully!');
        }
        router.push('/feed');
      }
    } catch (err) {
      toast.error(err.message || 'Could not create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Post — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => router.back()}
              aria-label="Go back"
            >
              <BackIcon /> Back
            </button>
            <h1 className={styles.title}>Create Post</h1>
          </div>

          <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
            {/* Mode toggle */}
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${mode === 'immediate' ? styles.modeActive : ''}`}
                onClick={() => setMode('immediate')}
                type="button"
              >
                <PublishIcon />
                Post now
              </button>
              <button
                className={`${styles.modeBtn} ${mode === 'schedule' ? styles.modeActive : ''}`}
                onClick={() => setMode('schedule')}
                type="button"
              >
                <ClockIcon />
                Schedule
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Body */}
              <div className="form-group">
                <label className="form-label" htmlFor="body">
                  {mode === 'schedule' ? 'Post content' : "What's on your mind?"}
                </label>
                <textarea
                  id="body"
                  className={`form-input form-textarea ${bodyError ? 'error' : ''}`}
                  placeholder="Share something professional or interesting..."
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (bodyError) setBodyError('');
                  }}
                  rows={6}
                  maxLength={3000}
                  disabled={isSubmitting}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {bodyError && <span className="form-error">{bodyError}</span>}
                  <span className="form-hint" style={{ marginLeft: 'auto' }}>
                    {body.length}/3000
                  </span>
                </div>
              </div>

              {/* Media Upload */}
              <div className="form-group">
                <label className="form-label">Attach Media (Optional)</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  {mediaPreview ? (
                    <div style={{ position: 'relative', width: 'fit-content' }}>
                      {mediaFile.type.startsWith('video/') ? (
                        <video src={mediaPreview} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      ) : (
                        <img src={mediaPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
                        style={{
                          position: 'absolute', top: 5, right: 5, background: 'var(--color-surface)',
                          border: 'none', borderRadius: '50%', padding: 4, cursor: 'pointer'
                        }}
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*,video/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setMediaFile(file);
                          setMediaPreview(URL.createObjectURL(file));
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                </div>
              </div>

              {/* Scheduled time */}
              {mode === 'schedule' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="scheduledTime">
                    Schedule for
                  </label>
                  <input
                    id="scheduledTime"
                    type="datetime-local"
                    className={`form-input ${timeError ? 'error' : ''}`}
                    min={getMinDateTime()}
                    value={scheduledTime}
                    onChange={(e) => {
                      setScheduledTime(e.target.value);
                      if (timeError) setTimeError('');
                    }}
                    disabled={isSubmitting}
                  />
                  {timeError && <span className="form-error">{timeError}</span>}
                  <span className="form-hint">
                    If you exceed the hourly post limit, your post will be delayed and you&apos;ll receive a Slack notification.
                  </span>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${isSubmitting ? 'btn-loading' : ''}`}
                  disabled={isSubmitting || (!body.trim() && !mediaFile)}
                >
                  {isSubmitting ? '' : mode === 'schedule' ? 'Schedule post' : 'Publish now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function PublishIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
