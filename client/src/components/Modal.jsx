import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

const sizeClass = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
};

const Modal = ({ isOpen, onClose, title, size = 'md', children }) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div className="modal-layer" role="presentation">
      <div className="modal-overlay" onMouseDown={handleOverlayMouseDown}>
        <div
          className={`modal-panel ${sizeClass[size] || sizeClass.md}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {title && (
            <div className="px-6 pt-6">
              <h3 className="text-lg leading-6 font-semibold text-gray-900" id={titleId}>
                {title}
              </h3>
            </div>
          )}
          <div className={title ? 'px-6 pb-6 pt-4' : 'p-6'}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
