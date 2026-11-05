import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './fonts.css';
import './index.css';
import { MotionConfig } from 'framer-motion';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
);
