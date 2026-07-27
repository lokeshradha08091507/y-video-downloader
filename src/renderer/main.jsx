import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { webApiBridge } from './utils/webApiBridge';
import './index.css';

// Inject Web API Bridge fallback if running inside standard web browser
if (!window.api) {
  window.api = webApiBridge;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
