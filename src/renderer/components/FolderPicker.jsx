import React from 'react';
import { Folder, FolderOpen } from 'lucide-react';

export default function FolderPicker({ currentFolder, onChangeFolder, onOpenFolder }) {
  return (
    <div className="folder-section">
      <div className="folder-info">
        <span className="folder-label">Destination Folder</span>
        <span className="folder-path" title={currentFolder || 'Default Downloads Folder'}>
          {currentFolder || 'Default Downloads Folder'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={onChangeFolder}
          title="Change destination folder"
        >
          <Folder size={15} />
          <span>Change</span>
        </button>

        {currentFolder && (
          <button
            type="button"
            className="btn-icon"
            onClick={() => onOpenFolder(currentFolder)}
            title="Open folder in Explorer"
          >
            <FolderOpen size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
