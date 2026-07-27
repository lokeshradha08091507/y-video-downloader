import React from 'react';
import { Clock, User, Film } from 'lucide-react';

export default function MetadataCard({ metadata }) {
  if (!metadata) return null;

  const formatDuration = (seconds) => {
    if (!seconds) return 'Live / Unknown';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="metadata-card">
      <div className="thumbnail-wrapper">
        <img
          src={metadata.thumbnail}
          alt={metadata.title}
          className="thumbnail-img"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80';
          }}
        />
        <div className="duration-badge">
          <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
          {formatDuration(metadata.duration)}
        </div>
      </div>

      <div className="metadata-info">
        <h3 className="video-title">{metadata.title}</h3>
        <div className="video-author">
          <User size={14} />
          <span>{metadata.author || 'Unknown Creator'}</span>
          <span style={{ margin: '0 0.3rem', opacity: 0.4 }}>•</span>
          <Film size={14} />
          <span>{metadata.formats?.length || 0} Download Options</span>
        </div>
      </div>
    </div>
  );
}
