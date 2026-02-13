import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Keyboard, X, Command } from 'lucide-react';

// Shortcut Types
export interface KeyboardShortcut {
  id: string;
  keys: string[];  // e.g., ['Meta', 'k'] or ['Shift', 'Enter']
  description: string;
  category: string;
  action: () => void;
  enabled?: boolean;
  global?: boolean;  // Works even when input is focused
}

interface KeyboardShortcutsContextType {
  shortcuts: KeyboardShortcut[];
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  enableShortcut: (id: string) => void;
  disableShortcut: (id: string) => void;
  isHelpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

// Format key for display
const formatKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    Meta: '⌘',
    Control: 'Ctrl',
    Alt: '⌥',
    Shift: '⇧',
    Enter: '↵',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Backspace: '⌫',
    Delete: '⌦',
    Tab: '⇥',
    Space: '␣',
  };
  return keyMap[key] || key.toUpperCase();
};

// Check if key event matches shortcut
const matchesShortcut = (event: KeyboardEvent, keys: string[]): boolean => {
  const pressedKeys: string[] = [];

  if (event.metaKey) pressedKeys.push('Meta');
  if (event.ctrlKey) pressedKeys.push('Control');
  if (event.altKey) pressedKeys.push('Alt');
  if (event.shiftKey) pressedKeys.push('Shift');

  // Add the actual key
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!['Meta', 'Control', 'Alt', 'Shift'].includes(event.key)) {
    pressedKeys.push(key);
  }

  // Sort and compare
  const sortedPressed = pressedKeys.sort().join('+').toLowerCase();
  const sortedShortcut = keys.map(k => k.toLowerCase()).sort().join('+');

  return sortedPressed === sortedShortcut;
};

// Keyboard Shortcuts Help Modal
const ShortcutsHelpModal: React.FC<{ shortcuts: KeyboardShortcut[]; onClose: () => void }> = ({
  shortcuts,
  onClose,
}) => {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Navigate faster with these shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <React.Fragment key={key}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded shadow-sm min-w-[24px] text-center">
                              {formatKey(key)}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-gray-400 text-xs">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-[#0B0C0E] border-t border-gray-200 dark:border-[#1F2128]">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-[#1F2128] rounded">?</kbd> or{' '}
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-[#1F2128] rounded">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-200 dark:bg-[#1F2128] rounded">/</kbd> to toggle this menu
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Provider Component
export const KeyboardShortcutsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const openHelp = useCallback(() => setIsHelpOpen(true), []);
  const closeHelp = useCallback(() => setIsHelpOpen(false), []);
  const toggleHelp = useCallback(() => setIsHelpOpen((prev) => !prev), []);

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts((prev) => {
      // Replace if exists, otherwise add
      const existing = prev.findIndex((s) => s.id === shortcut.id);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = { ...shortcut, enabled: shortcut.enabled ?? true };
        return updated;
      }
      return [...prev, { ...shortcut, enabled: shortcut.enabled ?? true }];
    });
  }, []);

  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const enableShortcut = useCallback((id: string) => {
    setShortcuts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: true } : s))
    );
  }, []);

  const disableShortcut = useCallback((id: string) => {
    setShortcuts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: false } : s))
    );
  }, []);

  // Global keyboard event listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input
      const isTyping =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue;
        if (isTyping && !shortcut.global) continue;

        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }

      // Built-in help shortcut (? or Cmd+/)
      if (
        (event.key === '?' && !isTyping) ||
        (event.key === '/' && (event.metaKey || event.ctrlKey))
      ) {
        event.preventDefault();
        toggleHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, toggleHelp]);

  // Register default shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        id: 'help',
        keys: ['Meta', '/'],
        description: 'Show keyboard shortcuts',
        category: 'General',
        action: toggleHelp,
        global: true,
      },
    ];

    defaultShortcuts.forEach(registerShortcut);
  }, [registerShortcut, toggleHelp]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcut,
        unregisterShortcut,
        enableShortcut,
        disableShortcut,
        isHelpOpen,
        openHelp,
        closeHelp,
        toggleHelp,
      }}
    >
      {children}
      {isHelpOpen && <ShortcutsHelpModal shortcuts={shortcuts} onClose={closeHelp} />}
    </KeyboardShortcutsContext.Provider>
  );
};

// Hook
export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
};

// Convenience hook for registering shortcuts
export function useShortcut(
  id: string,
  keys: string[],
  action: () => void,
  options?: {
    description?: string;
    category?: string;
    enabled?: boolean;
    global?: boolean;
  }
) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    registerShortcut({
      id,
      keys,
      action,
      description: options?.description || id,
      category: options?.category || 'General',
      enabled: options?.enabled ?? true,
      global: options?.global ?? false,
    });

    return () => unregisterShortcut(id);
  }, [id, keys, action, options, registerShortcut, unregisterShortcut]);
}
