import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { PostHogProvider } from '@posthog/react';
import { initializeAnalytics } from './analytics';
import './style.css';
import './memes.css';
const analytics = initializeAnalytics();
createRoot(document.getElementById('root')!).render(<React.StrictMode>{analytics ? <PostHogProvider client={analytics}><App /></PostHogProvider> : <App />}</React.StrictMode>);
