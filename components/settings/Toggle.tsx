import React from 'react';

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-all ${
      checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div
      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'left-6' : 'left-1'
      }`}
    />
  </button>
);

export default Toggle;
