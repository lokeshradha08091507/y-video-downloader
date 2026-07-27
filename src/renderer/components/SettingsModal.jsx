import React, { useState, useEffect } from 'react';
import { X, Folder, ShieldAlert, Check } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings, onChangeFolder }) {
  const [downloadDir, setDownloadDir] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState(3);
  const [rememberFolder, setRememberFolder] = useState(true);

  useEffect(() => {
    if (settings) {
      setDownloadDir(settings.downloadDir || '');
      setMaxConcurrent(settings.maxConcurrentDownloads || 3);
      setRememberFolder(settings.rememberFolder !== false);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      downloadDir,
      maxConcurrentDownloads: Number(maxConcurrent),
      rememberFolder
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Application Settings</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Download Directory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Save Folder</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="url-input"
                style={{ background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-color)', flex: 1 }}
                value={downloadDir}
                readOnly
              />
              <button type="button" className="btn-secondary" onClick={async () => {
                const folder = await onChangeFolder();
                if (folder) setDownloadDir(folder);
              }}>
                <Folder size={15} />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Concurrent downloads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Max Concurrent Downloads</label>
            <select
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-color)',
                outline: 'none'
              }}
            >
              <option value={1}>1 download at a time</option>
              <option value={2}>2 downloads at a time</option>
              <option value={3}>3 downloads at a time (Recommended)</option>
              <option value={5}>5 downloads at a time</option>
            </select>
          </div>

          {/* Remember Folder Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem' }}>
            <input
              type="checkbox"
              checked={rememberFolder}
              onChange={(e) => setRememberFolder(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)', width: 16, height: 16 }}
            />
            <span>Remember previously selected download folder</span>
          </label>

          {/* Legal / Authorization Compliance Notice */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 10,
            padding: '0.75rem',
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'flex-start'
          }}>
            <ShieldAlert size={18} style={{ color: 'var(--warning-color)', flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: 'var(--warning-color)' }}>Legal Usage Notice:</strong> This application is intended solely for downloading content where downloading is authorized by the content owner or rights holder.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            <Check size={16} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
