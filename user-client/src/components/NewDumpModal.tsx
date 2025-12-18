/**
 * New Dump Modal
 * 
 * Modal for creating new dumps via text input or file upload
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { Input } from './ui/Input';
import { useAuth } from '../hooks/useAuth';
import { createDump, uploadDump } from '../services/dumps.service';

interface NewDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewDumpModal: React.FC<NewDumpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mode, setMode] = useState<'text' | 'file'>('text');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setTextContent('');
    setFile(null);
    setCaption('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError(t('newDumpModal.userNotAuthenticated'));
      return;
    }

    if (mode === 'text') {
      if (!textContent.trim()) {
        setError(t('newDumpModal.pleaseEnterText'));
        return;
      }

      try {
        setLoading(true);
        await createDump(user.id, textContent, 'text');
        handleReset();
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || t('newDumpModal.failedToCreateDump'));
      } finally {
        setLoading(false);
      }
    } else {
      if (!file) {
        setError(t('newDumpModal.pleaseSelectFile'));
        return;
      }

      try {
        setLoading(true);
        await uploadDump(user.id, file, caption);
        handleReset();
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || t('newDumpModal.failedToUploadFile'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('newDumpModal.title')}>
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-stone-100 rounded-charming">
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`flex-1 px-4 py-2 rounded-charming text-sm font-medium transition-all ${
              mode === 'text'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('newDumpModal.textInput')}
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex-1 px-4 py-2 rounded-charming text-sm font-medium transition-all ${
              mode === 'file'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t('newDumpModal.fileUpload')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          {mode === 'text' ? (
            <div>
              <label htmlFor="textContent" className="block text-sm font-medium text-stone-700 mb-1">
                {t('newDumpModal.content')} *
              </label>
              <TextArea
                id="textContent"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder={t('newDumpModal.pasteText')}
                rows={8}
                required
              />
              <p className="text-xs text-stone-500 mt-1">
                {t('newDumpModal.aiExtractInfo')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-stone-700 mb-1">
                  File *
                </label>
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                />
                <p className="text-xs text-stone-500 mt-1">
                  Upload image, PDF, or document
                </p>
              </div>
              <div>
                <label htmlFor="caption" className="block text-sm font-medium text-stone-700 mb-1">
                  Caption (optional)
                </label>
                <Input
                  id="caption"
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a description..."
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-stone-200">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Dump'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
