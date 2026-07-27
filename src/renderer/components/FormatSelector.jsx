import React, { useState, useEffect } from 'react';
import { Download, Music, Video, HardDrive } from 'lucide-react';

export default function FormatSelector({ formats = [], onDownloadStart, isDownloading }) {
  const [selectedFormat, setSelectedFormat] = useState(null);

  useEffect(() => {
    if (formats && formats.length > 0) {
      setSelectedFormat(formats[0]);
    }
  }, [formats]);

  if (!formats || formats.length === 0) return null;

  return (
    <div className="format-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Select Quality & Format:
        </label>
        {selectedFormat && (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <HardDrive size={13} /> Est. ~{selectedFormat.estimatedSizeMb} MB
          </span>
        )}
      </div>

      <div className="format-grid">
        {formats.map((fmt, idx) => {
          const isSelected = selectedFormat?.formatId === fmt.formatId;
          const isAudio = fmt.type === 'audio';

          return (
            <div
              key={fmt.formatId || idx}
              className={`format-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setSelectedFormat(fmt)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="format-res" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {isAudio ? <Music size={14} style={{ color: '#F59E0B' }} /> : <Video size={14} style={{ color: '#6366F1' }} />}
                  {fmt.resolution}
                </span>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}>
                  {fmt.container}
                </span>
              </div>
              <span className="format-meta">{fmt.note || (isAudio ? 'Audio Stream' : 'Video Stream')}</span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-primary"
        style={{ width: '100%', marginTop: '0.5rem' }}
        onClick={() => selectedFormat && onDownloadStart(selectedFormat)}
        disabled={!selectedFormat || isDownloading}
      >
        <Download size={18} />
        <span>Start Download</span>
      </button>
    </div>
  );
}
