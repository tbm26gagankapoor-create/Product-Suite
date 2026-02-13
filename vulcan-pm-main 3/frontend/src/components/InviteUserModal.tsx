
import React, { useState } from 'react';
import {
  X,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { invitesService } from '../services/invites.service';
import { OrganizationRole } from '../types';

interface InviteUserModalProps {
  onClose: () => void;
  onInviteSent: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInviteSent }) => {
  const { currentOrganization, currentUser } = useProjectData();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrganizationRole>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!currentOrganization) {
      setError('No organization found.');
      return;
    }

    setIsLoading(true);

    try {
      const invite = await invitesService.create(
        currentOrganization.id,
        email,
        role,
        currentUser?.id
      );
      setInviteLink(invitesService.getInviteLink(invite.id));
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDone = () => {
    onInviteSent();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Infinia Design */}
      <div className="relative bg-gray-50 dark:bg-[#1A1A1A] rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-[#2E2E2E] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-[#2E2E2E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center">
              <UserPlus size={18} className="text-[#3B82F6]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Invite User</h2>
              <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                Send an invitation to join {currentOrganization?.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-[#6B7280] hover:text-white hover:bg-gray-100 dark:bg-[#252525] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form - Infinia Design */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#6B7280] group-focus-within:text-[#3B82F6] transition-colors" size={16} />
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || success}
                className="w-full bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:text-[#6B7280] focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider mb-2">
              Organization Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('member')}
                disabled={isLoading || success}
                className={`p-3 rounded-lg border transition-all text-left ${
                  role === 'member'
                    ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                    : 'border-gray-200 dark:border-[#2E2E2E] hover:border-gray-300 dark:border-[#3E3E3E] bg-white dark:bg-[#0D0D0D]'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield size={16} className={role === 'member' ? 'text-[#3B82F6]' : 'text-gray-400 dark:text-[#6B7280]'} />
                  <span className={`font-semibold text-sm ${role === 'member' ? 'text-[#3B82F6]' : 'text-white'}`}>
                    Member
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                  Can view and work on projects
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRole('admin')}
                disabled={isLoading || success}
                className={`p-3 rounded-lg border transition-all text-left ${
                  role === 'admin'
                    ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                    : 'border-gray-200 dark:border-[#2E2E2E] hover:border-gray-300 dark:border-[#3E3E3E] bg-white dark:bg-[#0D0D0D]'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck size={16} className={role === 'admin' ? 'text-[#8B5CF6]' : 'text-gray-400 dark:text-[#6B7280]'} />
                  <span className={`font-semibold text-sm ${role === 'admin' ? 'text-[#8B5CF6]' : 'text-white'}`}>
                    Admin
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">
                  Can manage users & settings
                </p>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-xs font-medium flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message with Invite Link - Infinia Design */}
          {success && (
            <div className="space-y-3">
              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg text-[#10B981] text-xs font-medium flex items-start gap-2">
                <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Invitation created for {email}!</span>
              </div>

              {/* Invite Link */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 dark:text-[#9CA3AF] uppercase tracking-wider">
                  Share this link with the user
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-white dark:bg-[#0D0D0D] border border-gray-200 dark:border-[#2E2E2E] rounded-lg py-2 px-3 text-xs text-gray-700 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`p-2 rounded-lg transition-all ${
                      copied
                        ? 'bg-[#10B981]/20 text-[#10B981]'
                        : 'bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-[#9CA3AF] hover:bg-[#2E2E2E] hover:text-white'
                    }`}
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-[#6B7280]">
                  When they sign up with <span className="font-medium text-gray-500 dark:text-[#9CA3AF]">{email}</span>, they'll automatically join your organization.
                </p>
              </div>
            </div>
          )}

          {/* Submit / Done Button */}
          {!success ? (
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-gray-900 dark:text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Create Invitation
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDone}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-gray-900 dark:text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle size={16} />
              Done
            </button>
          )}

          {/* Info Text */}
          {!success && (
            <p className="text-xs text-gray-400 dark:text-[#6B7280] text-center">
              You'll get a link to share with the user after creating the invitation.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default InviteUserModal;
