import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Users,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Globe,
  Mail,
  Shield,
  Sparkles,
  UserPlus,
  AlertCircle,
  Loader2,
  User,
  Briefcase,
  MapPin,
  Camera,
  ImagePlus
} from 'lucide-react';
import { Organization, GENERIC_EMAIL_DOMAINS, OrganizationRole } from '../types';

interface ProfileData {
  displayName: string;
  jobTitle: string;
  location: string;
  avatarUrl?: string;
}

interface OrganizationOnboardingProps {
  userEmail: string;
  userName: string;
  userAvatarUrl?: string;
  onComplete: (result: {
    action: 'join' | 'create';
    organizationId?: string;
    organizationName?: string;
    profileData?: ProfileData;
  }) => void;
  existingOrganizations?: Organization[]; // Orgs matching user's domain
}

type OnboardingStep = 'welcome' | 'profile' | 'choose' | 'join' | 'create' | 'complete';

const OrganizationOnboarding: React.FC<OrganizationOnboardingProps> = ({
  userEmail,
  userName,
  userAvatarUrl,
  onComplete,
  existingOrganizations = []
}) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: userName,
    jobTitle: '',
    location: '',
  });

  // Handle avatar file selection
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      // Convert to base64 for preview (in production, you'd upload to a server)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCustomAvatarUrl(base64String);
        setProfileData(prev => ({ ...prev, avatarUrl: base64String }));
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      setIsUploadingAvatar(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Extract domain from email
  const emailDomain = userEmail.split('@')[1]?.toLowerCase() || '';
  const isGenericDomain = GENERIC_EMAIL_DOMAINS.includes(emailDomain);
  const hasMatchingOrgs = existingOrganizations.length > 0;

  // Auto-suggest org name from domain if not generic
  useEffect(() => {
    if (!isGenericDomain && emailDomain) {
      const suggestedName = emailDomain
        .replace(/\.(com|org|net|io|co|ai|app)$/i, '')
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      setNewOrgName(suggestedName);
    }
  }, [emailDomain, isGenericDomain]);

  const handleJoinOrganization = async () => {
    if (!selectedOrgId) return;
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete({ action: 'join', organizationId: selectedOrgId, profileData });
    } catch (err) {
      setError('Failed to join organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      setError('Please enter an organization name');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete({ action: 'create', organizationName: newOrgName, profileData });
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getOrgColor = (name: string) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-violet-600',
      'from-pink-500 to-rose-600',
      'from-orange-500 to-amber-600',
      'from-green-500 to-emerald-600',
    ];
    return colors[name.length % colors.length];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100 dark:bg-[#1F2128]">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{
              width: step === 'welcome' ? '16%' : step === 'profile' ? '33%' : step === 'choose' ? '50%' : step === 'join' || step === 'create' ? '75%' : '100%'
            }}
          />
        </div>

        <div className="p-8">
          {/* Welcome Step */}
          {step === 'welcome' && (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Sparkles size={36} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#172B4D] dark:text-white mb-3">
                Welcome, {userName.split(' ')[0]}!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                Let's set up your workspace. Organizations help you collaborate with your team, manage projects, and control access.
              </p>

              <button
                onClick={() => setStep('profile')}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg"
              >
                Get Started <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Profile Step */}
          {step === 'profile' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep('welcome')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                Set Up Your Profile
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Help your teammates recognize you
              </p>

              {/* Avatar Preview */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />

                  {/* Avatar display - prioritize custom upload, then userAvatarUrl, then initials */}
                  {customAvatarUrl || userAvatarUrl ? (
                    <img
                      src={customAvatarUrl || userAvatarUrl}
                      alt={profileData.displayName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#1F2128] shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-[#1F2128] shadow-lg">
                      {profileData.displayName
                        .split(' ')
                        .map(n => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                  )}

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={isUploadingAvatar}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-[#1F2128] border-2 border-gray-200 dark:border-[#2D2F36] shadow-md flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors disabled:opacity-50"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 size={14} className="text-gray-500 animate-spin" />
                    ) : (
                      <Camera size={14} className="text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Upload hint */}
              <p className="text-center text-xs text-gray-400 mb-4">
                Click the camera icon to upload a profile photo
              </p>

              <div className="space-y-4 mb-6">
                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                    Display Name
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      placeholder="Your name"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                    Job Title <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.jobTitle}
                      onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
                      placeholder="e.g., Product Manager"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                    Location <span className="text-gray-400 font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      placeholder="e.g., San Francisco, CA"
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email Display (read-only) */}
              <div className="p-3 bg-gray-50 dark:bg-[#1F2128] rounded-xl border border-gray-200 dark:border-[#2D2F36] mb-6">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{userEmail}</span>
                </div>
              </div>

              <button
                onClick={() => setStep('choose')}
                disabled={!profileData.displayName.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Choose Step */}
          {step === 'choose' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep('profile')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                Choose Your Path
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {hasMatchingOrgs && !isGenericDomain
                  ? `We found organizations from ${emailDomain}. Join an existing one or create your own.`
                  : 'Create a new organization for your team.'}
              </p>

              <div className="space-y-3">
                {/* Join Existing Org Option */}
                {hasMatchingOrgs && !isGenericDomain && (
                  <button
                    onClick={() => setStep('join')}
                    className="w-full p-4 bg-white dark:bg-[#1F2128] border-2 border-gray-200 dark:border-[#2D2F36] rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <Users size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-[#172B4D] dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          Join Existing Organization
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {existingOrganizations.length} organization{existingOrganizations.length !== 1 ? 's' : ''} found matching your email domain
                        </p>
                      </div>
                      <ArrowRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors mt-3" />
                    </div>
                  </button>
                )}

                {/* Create New Org Option */}
                <button
                  onClick={() => setStep('create')}
                  className="w-full p-4 bg-white dark:bg-[#1F2128] border-2 border-gray-200 dark:border-[#2D2F36] rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                      <Plus size={24} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#172B4D] dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Create New Organization
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Start fresh with your own workspace and invite your team
                      </p>
                    </div>
                    <ArrowRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-purple-500 transition-colors mt-3" />
                  </div>
                </button>
              </div>

              {/* Domain Info */}
              {!isGenericDomain && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Globe size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Organization domain detected
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Users with <strong>@{emailDomain}</strong> can join your organization automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Join Step */}
          {step === 'join' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep('choose')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                Join an Organization
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Select the organization you want to join
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-2 mb-6 max-h-[240px] overflow-y-auto custom-scrollbar">
                {existingOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => setSelectedOrgId(org.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                      selectedOrgId === org.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-[#2D2F36] hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getOrgColor(org.name)} flex items-center justify-center text-white font-bold`}>
                        {getOrgInitials(org.name)}
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-[#172B4D] dark:text-white">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {org.memberCount || 0} members
                      </p>
                    </div>
                    {selectedOrgId === org.id && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={handleJoinOrganization}
                disabled={!selectedOrgId || isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    Request to Join
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-400 mt-4">
                An admin will need to approve your request
              </p>
            </div>
          )}

          {/* Create Step */}
          {step === 'create' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                onClick={() => setStep('choose')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                Create Your Organization
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Give your organization a name to get started
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                    Organization Name
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g., Acme Inc."
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl text-[#172B4D] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Preview */}
                {newOrgName && (
                  <div className="p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl border border-gray-200 dark:border-[#2D2F36]">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getOrgColor(newOrgName)} flex items-center justify-center text-white font-bold`}>
                        {getOrgInitials(newOrgName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#172B4D] dark:text-white">
                          {newOrgName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          1 member (you)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {[
                  { icon: Users, text: 'Invite unlimited team members' },
                  { icon: Shield, text: 'Role-based access control' },
                  { icon: Globe, text: !isGenericDomain ? `Auto-join for @${emailDomain}` : 'Custom domain settings' },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <feature.icon size={16} className="text-green-500" />
                    {feature.text}
                  </div>
                ))}
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={!newOrgName.trim() || isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    Create Organization <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check size={40} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-[#172B4D] dark:text-white mb-3">
                You're All Set!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8">
                Your organization is ready. Start inviting your team and creating projects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationOnboarding;
