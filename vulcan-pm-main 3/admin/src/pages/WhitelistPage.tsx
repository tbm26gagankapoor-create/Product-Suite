import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, Building, AlertCircle, Check, X } from 'lucide-react';
import { adminApi } from '../lib/api';

interface WhitelistEntry {
  id: string;
  domain: string;
  domain_type: 'email_domain' | 'entra_tenant';
  tenant_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

export default function WhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    domain: '',
    domain_type: 'email_domain' as 'email_domain' | 'entra_tenant',
    notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadWhitelist();
  }, []);

  async function loadWhitelist() {
    setLoading(true);
    const result = await adminApi.getWhitelist(true);
    if (result.success && result.data) {
      setEntries(result.data.entries || []);
      setEnabled(result.data.enabled);
    }
    setLoading(false);
  }

  async function handleToggle() {
    setSaving(true);
    const result = await adminApi.toggleWhitelist(!enabled);
    if (result.success) {
      setEnabled(!enabled);
      setSuccess(enabled ? 'Whitelist disabled' : 'Whitelist enabled');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error || 'Failed to toggle whitelist');
    }
    setSaving(false);
  }

  async function handleAdd() {
    if (!newEntry.domain.trim()) {
      setError('Domain is required');
      return;
    }

    setSaving(true);
    const result = await adminApi.addWhitelistEntry({
      domain: newEntry.domain.trim(),
      domain_type: newEntry.domain_type,
      notes: newEntry.notes || undefined,
    });

    if (result.success) {
      setShowAddForm(false);
      setNewEntry({ domain: '', domain_type: 'email_domain', notes: '' });
      setSuccess('Domain added to whitelist');
      setTimeout(() => setSuccess(''), 3000);
      loadWhitelist();
    } else {
      setError(result.error || 'Failed to add domain');
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to remove this domain from the whitelist?')) {
      return;
    }

    const result = await adminApi.deleteWhitelistEntry(id);
    if (result.success) {
      setSuccess('Domain removed from whitelist');
      setTimeout(() => setSuccess(''), 3000);
      loadWhitelist();
    } else {
      setError(result.error || 'Failed to remove domain');
    }
  }

  async function handleToggleActive(entry: WhitelistEntry) {
    const result = await adminApi.updateWhitelistEntry(entry.id, {
      is_active: !entry.is_active,
    });
    if (result.success) {
      loadWhitelist();
    } else {
      setError(result.error || 'Failed to update entry');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Domain Whitelist</h1>
          <p className="text-gray-500 mt-1">
            Control which domains can sign up via SSO
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Whitelist Enforcement</h3>
            <p className="text-sm text-gray-500 mt-1">
              When enabled, only users from whitelisted domains can sign up via SSO.
              Existing users are not affected.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              enabled ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                enabled ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>

        {!enabled && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
            Whitelist is currently disabled. All domains can sign up via SSO.
          </div>
        )}
      </div>

      {/* Whitelisted Domains */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Whitelisted Domains ({entries.filter(e => e.is_active).length})
          </h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            <Plus size={18} />
            Add Domain
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="p-6 border-b border-gray-800 bg-gray-800/50">
            <h4 className="text-white font-medium mb-4">Add New Domain</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Domain Type</label>
                <select
                  value={newEntry.domain_type}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, domain_type: e.target.value as any })
                  }
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="email_domain">Email Domain (e.g., contoso.com)</option>
                  <option value="entra_tenant">Entra Tenant ID</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {newEntry.domain_type === 'email_domain' ? 'Domain' : 'Tenant ID'}
                </label>
                <input
                  type="text"
                  value={newEntry.domain}
                  onChange={(e) => setNewEntry({ ...newEntry, domain: e.target.value })}
                  placeholder={
                    newEntry.domain_type === 'email_domain'
                      ? 'example.com'
                      : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                  }
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                  placeholder="e.g., Partner company, Customer org"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add to Whitelist'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewEntry({ domain: '', domain_type: 'email_domain', notes: '' });
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Globe size={48} className="mx-auto mb-4 opacity-50" />
            <p>No domains whitelisted yet.</p>
            <p className="text-sm mt-1">Add domains to restrict SSO signups.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 flex items-center gap-4 ${
                  !entry.is_active ? 'opacity-50' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    entry.domain_type === 'email_domain'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  {entry.domain_type === 'email_domain' ? (
                    <Globe size={20} />
                  ) : (
                    <Building size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{entry.domain}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>
                      {entry.domain_type === 'email_domain' ? 'Email Domain' : 'Entra Tenant'}
                    </span>
                    {entry.notes && (
                      <>
                        <span className="text-gray-700">|</span>
                        <span>{entry.notes}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(entry)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      entry.is_active
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {entry.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    title="Remove from whitelist"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-sm text-gray-500">
        <p className="font-medium text-gray-400 mb-2">How it works:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Email Domain:</strong> Matches the domain part of user emails (e.g., @contoso.com)
          </li>
          <li>
            <strong>Entra Tenant ID:</strong> Matches the Azure AD tenant ID for the organization
          </li>
          <li>Users from non-whitelisted domains will see an error when trying to sign up</li>
          <li>Existing users can still log in regardless of whitelist settings</li>
        </ul>
      </div>
    </div>
  );
}
