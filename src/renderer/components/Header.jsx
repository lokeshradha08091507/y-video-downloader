import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Download, Sun, Moon, Settings, ShieldCheck } from 'lucide-react';

export default function Header({ onOpenSettings, activeCount = 0 }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="header">
      <div className="logo-group">
        <div className="logo-icon" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 'none' }}>
          <img src="/logo.png" alt="Video Downloader Logo" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', boxShadow: '0 0 12px rgba(124, 58, 237, 0.4)' }} />
        </div>
        <div>
          <h1 className="logo-title">Video Downloader</h1>
        </div>
      </div>

      <div className="header-actions">
        {activeCount > 0 && (
          <div className="sample-chip" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }}></span>
            {activeCount} Downloading
          </div>
        )}

        <button 
          className="btn-icon" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button 
          className="btn-icon" 
          onClick={onOpenSettings} 
          title="Application Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
