import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import DisplayPortal from './pages/DisplayPortal.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DisplayPortal />
  </StrictMode>,
);
