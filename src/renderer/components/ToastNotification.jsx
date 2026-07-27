import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastNotification({ toasts = [], onCloseToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type || 'info'}`}>
          {t.type === 'success' && <CheckCircle2 size={18} style={{ color: 'var(--success-color)' }} />}
          {t.type === 'error' && <AlertCircle size={18} style={{ color: 'var(--error-color)' }} />}
          {t.type === 'info' && <Info size={18} style={{ color: 'var(--accent-primary)' }} />}

          <span style={{ flex: 1 }}>{t.message}</span>

          <button 
            type="button" 
            className="btn-icon" 
            style={{ width: 22, height: 22, border: 'none', background: 'transparent' }}
            onClick={() => onCloseToast(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
