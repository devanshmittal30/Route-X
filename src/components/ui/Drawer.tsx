import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  position?: 'right' | 'left' | 'bottom';
  children: React.ReactNode;
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  position = 'right',
  children,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionStyles = {
    right: 'inset-y-0 right-0 w-full max-w-md border-l border-border animate-slideLeft',
    left: 'inset-y-0 left-0 w-full max-w-md border-r border-border animate-slideRight',
    bottom: 'inset-x-0 bottom-0 max-h-[85vh] border-t border-border rounded-t-card animate-slideUp',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-text/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`fixed bg-white shadow-card flex flex-col ${positionStyles[position]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="text-h3 font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-1.5 text-text-3 hover:text-text rounded-btn hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};

