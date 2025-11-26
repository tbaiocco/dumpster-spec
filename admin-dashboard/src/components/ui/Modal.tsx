import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

/**
 * Modal size configurations
 */
const modalSizes = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  xl: '900px',
  full: '95vw',
};

/**
 * Modal Component
 * Simple modal dialog without external dependencies
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)',
        }}
      />
      
      {/* Modal Panel */}
      <div
        style={{
          position: 'relative',
          backgroundColor: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          maxWidth: modalSizes[size],
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div 
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '1.5rem',
              borderBottom: '1px solid var(--color-gray-200)',
              background: 'var(--color-gray-50)',
            }}
          >
            <div style={{ flex: 1 }}>
              {title && (
                <h3 
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: 'var(--color-gray-900)',
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
              )}
              {description && (
                <p 
                  style={{
                    marginTop: '0.25rem',
                    fontSize: '0.875rem',
                    color: 'var(--color-gray-600)',
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  marginLeft: '1rem',
                  padding: '0.5rem',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-gray-400)',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1.5rem',
                  lineHeight: '1',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-gray-600)';
                  e.currentTarget.style.background = 'var(--color-gray-200)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-gray-400)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div 
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
