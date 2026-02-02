import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Briefcase,
  MapPin,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Globe,
  Calendar,
  Clock
} from 'lucide-react';
import { User, UserStatus } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (userId: string, updates: Partial<User>) => Promise<void>;
  onDeactivate?: (userId: string) => Promise<void>;
  onReactivate?: (userId: string) => Promise<void>;
  currentUserIsAdmin?: boolean;
}

const ROLE_OPTIONS = [
  { value: 'Member', label: 'Member', description: 'Can view and work on assigned tasks' },
  { value: 'Admin', label: 'Admin', description: 'Can manage users, teams, and settings' },
  { value: 'Viewer', label: 'Viewer', description: 'Read-only access to projects' },
];

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onDeactivate,
  onReactivate,
  currentUserIsAdmin = false,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Member',
    jobTitle: '',
    location: '',
    bio: '',
    website: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        role: user.role || 'Member',
        jobTitle: user.jobTitle || '',
        location: user.location || '',
        bio: user.bio || '',
        website: user.website || '',
      });
      setError(null);
      setSuccessMessage(null);
      setShowDeactivateConfirm(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(user.id, {
        name: formData.name,
        role: formData.role,
        jobTitle: formData.jobTitle,
        location: formData.location,
        bio: formData.bio,
        website: formData.website,
        isAdmin: formData.role === 'Admin',
      });
      setSuccessMessage('User updated successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!onDeactivate) return;
    setIsDeactivating(true);
    setError(null);
    try {
      await onDeactivate(user.id);
      setSuccessMessage('User deactivated successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
    } finally {
      setIsDeactivating(false);
      setShowDeactivateConfirm(false);
    }
  };

  const handleReactivate = async () => {
    if (!onReactivate) return;
    setIsDeactivating(true);
    setError(null);
    try {
      await onReactivate(user.id);
      setSuccessMessage('User reactivated successfully');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate user');
    } finally {
      setIsDeactivating(false);
    }
  };

  const isInactive = user.status === 'inactive';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#1F2128]">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 dark:border-[#2D2F36]"
            />
            <div>
              <h2 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit User</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Status Banner */}
        {isInactive && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
              <AlertTriangle size={16} />
              <span className="font-medium">This user is currently deactivated</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check size={16} />
              {successMessage}
            </div>
          )}

          {/* User Metadata (Read-only) */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Mail size={14} />
              <span>{user.email}</span>
            </div>
            {user.createdAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar size={14} />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            )}
            {user.lastActiveAt && (
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock size={14} />
                <span>Last active {new Date(user.lastActiveAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${isInactive ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className={isInactive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                {isInactive ? 'Inactive' : 'Active'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Display Name
              </label>
              <div className="relative">
                <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Role */}
            {currentUserIsAdmin && (
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                  Role
                </label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        formData.role === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={option.value}
                        checked={formData.role === option.value}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#172B4D] dark:text-white">{option.label}</span>
                          {option.value === 'Admin' && (
                            <Shield size={14} className="text-purple-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Job Title */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Job Title
              </label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="e.g., Product Manager"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Website
              </label>
              <div className="relative">
                <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="A brief description..."
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          {/* Deactivate Section */}
          {currentUserIsAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#1F2128]">
              {!showDeactivateConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#172B4D] dark:text-white">
                      {isInactive ? 'Reactivate User' : 'Deactivate User'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {isInactive
                        ? 'Allow this user to access the workspace again'
                        : 'User will lose access but data will be preserved'}
                    </p>
                  </div>
                  {isInactive ? (
                    <button
                      onClick={handleReactivate}
                      disabled={isDeactivating}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isDeactivating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Reactivate'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowDeactivateConfirm(true)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg transition-colors"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                        Confirm Deactivation
                      </h4>
                      <p className="text-xs text-red-600 dark:text-red-400/80 mt-1">
                        {user.name} will immediately lose access to all workspaces and projects. This action can be reversed.
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={handleDeactivate}
                          disabled={isDeactivating}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isDeactivating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : null}
                          Yes, Deactivate
                        </button>
                        <button
                          onClick={() => setShowDeactivateConfirm(false)}
                          className="px-4 py-2 bg-gray-200 dark:bg-[#2D2F36] hover:bg-gray-300 dark:hover:bg-[#3D3F46] text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#1F2128]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="px-6 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] text-sm font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
