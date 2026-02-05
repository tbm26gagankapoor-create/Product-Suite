/**
 * Typography System
 *
 * Standardized font styles for consistent typography across the application.
 * Use these constants instead of inline Tailwind classes for better maintainability.
 */

export const typography = {
  // Labels & Small UI Text
  label: {
    default: 'text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400',
    primary: 'text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white',
    muted: 'text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500',
  },

  // Hints, Captions & Meta Info
  caption: {
    default: 'text-xs text-gray-600 dark:text-gray-400',
    muted: 'text-xs text-gray-500 dark:text-gray-500',
    bold: 'text-xs font-bold text-gray-600 dark:text-gray-400',
  },

  // Body Text
  body: {
    default: 'text-sm text-gray-700 dark:text-gray-300',
    medium: 'text-sm font-medium text-gray-700 dark:text-gray-300',
    semibold: 'text-sm font-semibold text-gray-900 dark:text-white',
    muted: 'text-sm text-gray-500 dark:text-gray-400',
  },

  // Links
  link: {
    default: 'text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
    small: 'text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
  },

  // Headings
  heading: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl font-bold text-gray-900 dark:text-white',
    h4: 'text-lg font-semibold text-gray-900 dark:text-white',
    h5: 'text-base font-semibold text-gray-900 dark:text-white',
    h6: 'text-sm font-bold text-gray-900 dark:text-white',
  },

  // Special Purpose
  code: 'text-xs font-mono text-gray-700 dark:text-gray-300',
  badge: 'text-xs font-medium px-2 py-0.5 rounded',
  button: {
    default: 'text-sm font-bold',
    small: 'text-xs font-bold',
    large: 'text-base font-bold',
  },

  // Task/Issue Keys (e.g., DIG-123)
  key: 'text-xs font-semibold font-mono text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400',

  // Table Headers
  tableHeader: 'text-xs font-bold text-gray-500 uppercase tracking-wider',
} as const;

/**
 * Helper function to combine typography classes with additional classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * @deprecated Use typography.label.default instead
 */
export const DEPRECATED_text_10px = typography.label.default;

/**
 * @deprecated Use typography.caption.default instead
 */
export const DEPRECATED_text_11px = typography.caption.default;

/**
 * @deprecated Use typography.body.default instead
 */
export const DEPRECATED_text_13px = typography.body.default;
