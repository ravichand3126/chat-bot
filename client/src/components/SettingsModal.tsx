import React, { useEffect, useState } from 'react';
import { ModelOption, Settings } from '../types/chat';
import { fetchModels, checkServerHealth, clearAllConversations } from '../lib/api';
import { X, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdateSettings: (newSettings: Settings) => void;
  onConversationsCleared: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onConversationsCleared,
}) => {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [keyConfigured, setKeyConfigured] = useState<boolean | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchModels().then(setModels);
      checkServerHealth().then((health) => {
        setKeyConfigured(health.geminiKeyConfigured);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = async () => {
    await clearAllConversations();
    onConversationsCleared();
    setConfirmClear(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Settings</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gemini API Key Status */}
          <div className="form-group">
            <label className="form-label">Backend API Status</label>
            <div className="status-badge">
              {keyConfigured === true ? (
                <>
                  <CheckCircle size={14} />
                  <span>Gemini API Key is configured on server</span>
                </>
              ) : keyConfigured === false ? (
                <>
                  <AlertCircle size={14} />
                  <span>Gemini API Key missing in server/.env</span>
                </>
              ) : (
                <span>Checking server status...</span>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="form-group">
            <label className="form-label">Gemini AI Model</label>
            <select
              className="form-select"
              value={settings.selectedModel}
              onChange={(e) =>
                onUpdateSettings({ ...settings, selectedModel: e.target.value })
              }
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {models.find((m) => m.id === settings.selectedModel)?.description}
            </span>
          </div>

          {/* Clear Conversations */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Data Management</label>
            {confirmClear ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Are you sure?</span>
                <button className="btn-sm btn-primary" onClick={handleClear}>
                  Yes, Clear All
                </button>
                <button className="btn-sm btn-outline" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn-sm btn-outline"
                onClick={() => setConfirmClear(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}
              >
                <Trash2 size={14} />
                <span>Clear All Conversations</span>
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-sm btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
