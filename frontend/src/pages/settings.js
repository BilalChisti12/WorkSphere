import { useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { connectSlack, disconnectSlack } from '../lib/api/slack';
import { getBackendUrl } from '../lib/api/client';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { token, currentUser, slackConnected, refreshCurrentUser } = useAuth();
  const toast = useToast();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleSlackConnect = () => {
    if (!token) return;
    connectSlack(token);
    // No API to verify connection. Mark locally as connected.
    // User must close the Slack window once connected.
    toast.info('Complete the Slack authorization in the opened window, then click "Mark as connected" below.');
  };

  const handleMarkConnected = async () => {
    try {
      await refreshCurrentUser();
      toast.success('Verified connection status from backend.');
    } catch {
      toast.error('Failed to verify connection status.');
    }
  };

  const handleSlackDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectSlack();
      await refreshCurrentUser();
      toast.success('Slack disconnected successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to disconnect Slack');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleOpenBullBoard = () => {
    window.open(`${getBackendUrl()}/admin/queues`, '_blank');
  };

  const backendUrl = getBackendUrl();

  return (
    <>
      <Head>
        <title>Settings — WorkSphere</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Settings</h1>

          {/* Profile quick link */}
          <section className="card">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconWrap} style={{ background: 'var(--color-primary-light)' }}>
                <ProfileIcon />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Profile Settings</h2>
                <p className={styles.sectionDesc}>Update your personal information, bio, experience, and profile picture.</p>
              </div>
            </div>
            <a href="/profile/edit" className="btn btn-secondary btn-sm">
              Go to profile settings →
            </a>
          </section>

          {/* Slack Integration */}
          <section className="card">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconWrap} style={{ background: 'rgba(74, 21, 75, 0.2)' }}>
                <SlackIcon />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Slack Integration</h2>
                <p className={styles.sectionDesc}>
                  Connect your Slack account to receive notifications when scheduled posts exceed the hourly rate limit.
                </p>
              </div>
            </div>

            <div className={styles.slackStatus}>
              <span className={`badge ${slackConnected ? 'badge-success' : 'badge-neutral'}`}>
                {slackConnected ? <><DotIcon color="#22c55e" /> Connected</> : <><DotIcon color="#5c6880" /> Not connected</>}
              </span>
            </div>

            <div className={styles.warningBox}>
              <InfoIcon />
              <span>
                Your Slack connection status is synced with the backend automatically.
              </span>
            </div>

            <div className={styles.slackActions}>
              {!slackConnected ? (
                <>
                  <button className="btn btn-primary" onClick={handleSlackConnect}>
                    <SlackLogoIcon /> Connect Slack
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleMarkConnected}>
                    Already connected? Mark as connected
                  </button>
                </>
              ) : (
                <button
                  className={`btn btn-danger ${isDisconnecting ? 'btn-loading' : ''}`}
                  onClick={handleSlackDisconnect}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? '' : 'Disconnect Slack'}
                </button>
              )}
            </div>

            <div className={styles.slackInfo}>
              <h3 className={styles.slackInfoTitle}>How Slack notifications work</h3>
              <ul className={styles.slackInfoList}>
                <li>Connect your Slack account using the button above</li>
                <li>When you schedule posts and exceed the hourly limit, you&apos;ll receive a Slack DM</li>
                <li>Notifications are deduplicated once per hour per user</li>
              </ul>
            </div>
          </section>

          {/* Bull Board */}
          <section className="card">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconWrap} style={{ background: 'var(--color-warning-light)' }}>
                <QueueIcon />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Job Queue Dashboard</h2>
                <p className={styles.sectionDesc}>
                  Monitor the post scheduling queue (PostQueue) via Bull Board. Opens the backend dashboard in a new tab.
                </p>
              </div>
            </div>

            <div className={styles.warningBox} style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              <WarningIcon />
              <span>
                Bull Board has <strong>no authentication</strong>. It is accessible to anyone with the backend URL.
                Do not deploy to production without adding protection middleware.
              </span>
            </div>

            <div className={styles.bullBoardInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>URL</span>
                <code className={styles.infoValue}>{backendUrl}/admin/queues</code>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Queues</span>
                <span className={styles.infoValue}>PostQueue (ElasticQueue not registered)</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Auth</span>
                <span className={`badge badge-danger`}>None — unprotected</span>
              </div>
            </div>

            <button className="btn btn-secondary" onClick={handleOpenBullBoard}>
              <ExternalLinkIcon /> Open Bull Board
            </button>
          </section>

          {/* Session / account danger zone */}
          <section className="card">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionIconWrap} style={{ background: 'var(--color-danger-light)' }}>
                <ShieldIcon />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Account Info</h2>
                <p className={styles.sectionDesc}>Your current session and account details.</p>
              </div>
            </div>
            <div className={styles.accountInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{currentUser?.userId?.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{currentUser?.userId?.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Username</span>
                <span className={styles.infoValue}>@{currentUser?.userId?.username}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Session</span>
                <span className="badge badge-success">Active · 7 day JWT</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// Icons
function ProfileIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function SlackIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e879f9" strokeWidth="2"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg>;
}
function SlackLogoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="4"/><path d="M8 13h8M12 9v6"/></svg>;
}
function QueueIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
}
function ShieldIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function InfoIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
}
function WarningIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function ExternalLinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
}
function DotIcon({ color }) {
  return <svg width="8" height="8" viewBox="0 0 8 8" style={{flexShrink:0}}><circle cx="4" cy="4" r="4" fill={color}/></svg>;
}
