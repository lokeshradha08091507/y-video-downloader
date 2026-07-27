import React, { useState } from 'react';
import { Clipboard, Search, Loader2, Sparkles, X } from 'lucide-react';

export default function UrlInputSection({ onAnalyze, isLoading, samples = [] }) {
  const [url, setUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePaste = async () => {
    try {
      if (window.api && window.api.getClipboardText) {
        const text = await window.api.getClipboardText();
        if (text && text.trim()) {
          setUrl(text.trim());
          setErrorMsg('');
        }
      }
    } catch (e) {
      console.error('Failed to paste from clipboard:', e);
    }
  };

  const handleClear = () => {
    setUrl('');
    setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url || !url.trim()) {
      setErrorMsg('Please paste a valid video URL or select a sample video.');
      return;
    }
    setErrorMsg('');
    onAnalyze(url.trim());
  };

  const handleSampleClick = (sampleUrl) => {
    setUrl(sampleUrl);
    setErrorMsg('');
    onAnalyze(sampleUrl);
  };

  return (
    <div className="input-group">
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="url-box">
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="url-input"
            placeholder="Paste video URL (YouTube, Vimeo, MP4 stream, or choose sample below)..."
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErrorMsg(''); }}
          />

          {url && (
            <button type="button" className="btn-icon" style={{ width: 28, height: 28 }} onClick={handleClear}>
              <X size={14} />
            </button>
          )}

          <button type="button" className="btn-secondary" onClick={handlePaste} title="Paste from Clipboard">
            <Clipboard size={15} />
            <span>Paste</span>
          </button>

          <button type="submit" className="btn-primary" disabled={isLoading || !url.trim()}>
            {isLoading ? <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
            <span>{isLoading ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </div>
      </form>

      {errorMsg && (
        <div style={{ color: 'var(--error-color)', fontSize: '0.82rem', paddingLeft: '0.5rem', fontWeight: 500 }}>
          {errorMsg}
        </div>
      )}

      {samples.length > 0 && (
        <div className="samples-bar">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} /> Test Authorized Samples:
          </span>
          {samples.map((s) => (
            <button
              key={s.id}
              type="button"
              className="sample-chip"
              onClick={() => handleSampleClick(s.url)}
              title={s.title}
            >
              {s.title.split(' ')[0]} Movie
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
