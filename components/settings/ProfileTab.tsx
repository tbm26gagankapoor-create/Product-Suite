import React, { useState, useEffect } from 'react';
import { User, Camera, Save } from 'lucide-react';
import { useProjectData } from '../../context/ProjectDataContext';
import { useToast } from '../../context/ToastContext';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';

const ProfileTab: React.FC = () => {
  const { currentUser, updateCurrentUser } = useProjectData();
  const { error: showError, success } = useToast();

  // Profile edit state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileJobTitle, setProfileJobTitle] = useState(currentUser?.jobTitle || '');
  const [profileLocation, setProfileLocation] = useState(currentUser?.location || '');
  const [profileBio, setProfileBio] = useState(currentUser?.bio || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Initialize profile form when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileJobTitle(currentUser.jobTitle || '');
      setProfileLocation(currentUser.location || '');
      setProfileBio(currentUser.bio || '');
    }
  }, [currentUser]);

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!currentUser || savingProfile) return;
    setSavingProfile(true);
    try {
      await updateCurrentUser({
        name: profileName,
        jobTitle: profileJobTitle,
        location: profileLocation,
        bio: profileBio,
      });
      success('Profile updated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Photo Card */}
      <SectionCard>
        <div className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <img
                src={currentUser?.avatarUrl || 'https://avatar.iran.liara.run/public'}
                alt={currentUser?.name || 'User'}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-gray-100 dark:ring-[#1F2128]"
              />
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors">
                <Camera size={16} />
              </button>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">
                {currentUser?.name || 'User'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {currentUser?.designation || 'Team Member'}
              </p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  Change Photo
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Personal Information */}
      <SectionCard>
        <SectionHeader
          icon={User}
          title="Personal Information"
          description="Update your personal details"
        />
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={currentUser?.email || ''}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Job Title
              </label>
              <input
                type="text"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                Location
              </label>
              <input
                type="text"
                value={profileLocation}
                onChange={(e) => setProfileLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">
              Bio
            </label>
            <textarea
              rows={3}
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-sm text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default ProfileTab;
