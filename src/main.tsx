import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setupServiceWorker } from './registerSW';
import { startNativeReminders } from './native/reminders';
import './styles/global.css';

const stopReminders = startNativeReminders();
if (import.meta.hot) import.meta.hot.dispose(stopReminders);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

setupServiceWorker();
