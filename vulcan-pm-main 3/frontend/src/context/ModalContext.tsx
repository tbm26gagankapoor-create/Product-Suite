import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Modal Types
export interface ModalConfig {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  options?: ModalOptions;
}

export interface ModalOptions {
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  onClose?: () => void;
}

interface ModalContextType {
  modals: ModalConfig[];
  activeModal: ModalConfig | null;
  openModal: <T extends Record<string, any>>(
    id: string,
    component: React.ComponentType<T>,
    props?: T,
    options?: ModalOptions
  ) => void;
  closeModal: (id?: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
  updateModalProps: <T extends Record<string, any>>(id: string, props: Partial<T>) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

const DEFAULT_OPTIONS: ModalOptions = {
  closeOnOverlayClick: true,
  closeOnEscape: true,
  preventScroll: true,
};

// Modal Wrapper Component with Focus Trap and Accessibility
const ModalWrapper: React.FC<{
  modal: ModalConfig;
  onClose: () => void;
}> = ({ modal, onClose }) => {
  const { component: Component, props = {}, options = {} } = modal;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Handle escape key
  useEffect(() => {
    if (!mergedOptions.closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mergedOptions.closeOnEscape, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (!mergedOptions.preventScroll) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [mergedOptions.preventScroll]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mergedOptions.closeOnOverlayClick) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`modal-title-${modal.id}`}
    >
      <div
        className="animate-in zoom-in-95 fade-in duration-200"
        role="document"
      >
        <Component {...props} onClose={onClose} isOpen={true} />
      </div>
    </div>
  );
};

// Provider Component
export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const activeModal = modals.length > 0 ? modals[modals.length - 1] : null;

  const openModal = useCallback(
    <T extends Record<string, any>>(
      id: string,
      component: React.ComponentType<T>,
      props?: T,
      options?: ModalOptions
    ) => {
      setModals((prev) => {
        // Check if modal with same ID is already open
        const existingIndex = prev.findIndex((m) => m.id === id);
        if (existingIndex !== -1) {
          // Update existing modal
          const updated = [...prev];
          updated[existingIndex] = { id, component, props, options };
          return updated;
        }
        // Add new modal
        return [...prev, { id, component, props, options }];
      });
    },
    []
  );

  const closeModal = useCallback((id?: string) => {
    setModals((prev) => {
      if (!id) {
        // Close top modal
        const closedModal = prev[prev.length - 1];
        closedModal?.options?.onClose?.();
        return prev.slice(0, -1);
      }
      // Close specific modal
      const closedModal = prev.find((m) => m.id === id);
      closedModal?.options?.onClose?.();
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    modals.forEach((m) => m.options?.onClose?.());
    setModals([]);
  }, [modals]);

  const isModalOpen = useCallback(
    (id: string) => modals.some((m) => m.id === id),
    [modals]
  );

  const updateModalProps = useCallback(
    <T extends Record<string, any>>(id: string, props: Partial<T>) => {
      setModals((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, props: { ...m.props, ...props } } : m
        )
      );
    },
    []
  );

  return (
    <ModalContext.Provider
      value={{
        modals,
        activeModal,
        openModal,
        closeModal,
        closeAllModals,
        isModalOpen,
        updateModalProps,
      }}
    >
      {children}
      {/* Render all modals (stacking) */}
      {modals.map((modal) => (
        <ModalWrapper
          key={modal.id}
          modal={modal}
          onClose={() => closeModal(modal.id)}
        />
      ))}
    </ModalContext.Provider>
  );
};

// Hook
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Convenience hook for a specific modal
export function useModalState(modalId: string) {
  const { isModalOpen, openModal, closeModal } = useModal();

  return {
    isOpen: isModalOpen(modalId),
    open: <T extends Record<string, any>>(
      component: React.ComponentType<T>,
      props?: T,
      options?: ModalOptions
    ) => openModal(modalId, component, props, options),
    close: () => closeModal(modalId),
  };
}
