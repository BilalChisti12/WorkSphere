import { apiClient, getBackendUrl } from './client';

// GET /slack/connect - Start Slack OAuth
// MUST use window.open() - this is a redirect flow, not a JSON API
export const connectSlack = (token) => {
  const url = `${getBackendUrl()}/slack/connect?token=${token}`;
  window.open(url, '_blank', 'width=600,height=700');
};

// POST /slack/disconnect
export const disconnectSlack = () =>
  apiClient('/slack/disconnect', { method: 'POST' });
