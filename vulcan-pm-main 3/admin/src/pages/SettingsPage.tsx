import React, { useEffect, useState } from 'react';
import { Save, Check } from 'lucide-react';
import { adminApi } from '../lib/api';

interface Setting {
  value: any;
  description: string | null;
  is_secret: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadSettings() {
      const result = await adminApi.getSettings();
      if (result.success && result.data) {
        setSettings(result.data);
        // Initialize edited values
        const values: Record<string, any> = {};
        for (const [key, setting] of Object.entries(result.data)) {
          values[key] = setting.value;
        }
        setEditedValues(values);
      }
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await adminApi.updateSettings(editedValues);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setIsSaving(false);
  };

  const updateValue = (key: string, value: any) => {
    setEditedValues({ ...editedValues, [key]: value });
  };

  const renderSettingInput = (key: string, setting: Setting) => {
    const value = editedValues[key];

    if (typeof value === 'boolean') {
      return (
        <button
          onClick={() => updateValue(key, !value)}
          className={`w-12 h-6 rounded-full transition-colors ${
            value ? 'bg-green-500' : 'bg-gray-700'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
              value ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => updateValue(key, parseInt(e.target.value) || 0)}
          className="w-32 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:border-blue-500"
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => updateValue(key, e.target.value)}
        className="flex-1 max-w-md bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
      />
    );
  };

  const formatKey = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 mt-1">Global platform configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="divide-y divide-gray-800">
          {Object.entries(settings).map(([key, setting]) => (
            <div key={key} className="px-6 py-5 flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-white">{formatKey(key)}</div>
                {setting.description && (
                  <div className="text-sm text-gray-500 mt-0.5">{setting.description}</div>
                )}
              </div>
              <div className="ml-4">
                {renderSettingInput(key, setting)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-2xl p-6">
        <h3 className="font-semibold text-yellow-400 mb-2">Caution</h3>
        <p className="text-yellow-200/70 text-sm">
          Changing these settings affects all tenants on the platform. Some changes may require
          a restart to take effect.
        </p>
      </div>
    </div>
  );
}
