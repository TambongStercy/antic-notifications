// In your React app, replace hardcoded VITE_API_URL with:

// Option A: Read from window object (set by nginx template)
const API_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000';
const WEBSOCKET_URL = window.APP_CONFIG?.WEBSOCKET_URL || 'http://localhost:3002';

// Option B: Fetch from a config endpoint
const getConfig = async () => {
  try {
    const response = await fetch('/config.json');
    return await response.json();
  } catch {
    return {
      API_URL: 'http://localhost:3000',
      WEBSOCKET_URL: 'http://localhost:3002'
    };
  }
};