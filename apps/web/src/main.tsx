import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerServiceWorker } from './pwa';
import './app/styles/globals.css';

const root = document.getElementById('root');

if (!root) throw new Error('Application root element "#root" was not found.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerServiceWorker(import.meta.env.PROD && import.meta.env.VITE_ENABLE_PWA === 'true');
