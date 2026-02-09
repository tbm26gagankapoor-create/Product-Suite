import React, { useState, useRef, useEffect } from 'react';
import {
  Wand2,
  FileText,
  Loader2,
  Sparkles,
  Check,
  UploadCloud,
  File as FileIcon,
  Calendar,
  Users,
  User,
  Settings,
  Image as ImageIcon,
  ChevronDown,
  X,
} from 'lucide-react';
import { User as UserType } from '../../types';

interface InputStepProps {
  inputMode: 'scratch' | 'import';
  setInputMode: (mode: 'scratch' | 'import') => void;
  productName: string;
  setProductName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  tags: string;
  setTags: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  targetDate: string;
  setTargetDate: (val: string) => void;
  ownerIds: string[];
  toggleOwner: (userId: string) => void;
  selectedTeam: string[];
  toggleTeamMember: (userId: string) => void;
  users: UserType[];
  productImage: string | null;
  uploadedFile: { name: string; type: string; base64: string } | null;
  isExtracting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  productImageInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProductImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerate: () => void;
  handleSaveDraft: () => Promise<boolean>;
  isSavingDraft: boolean;
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward';
}

// Reusable multi-select owner dropdown component
const OwnerDropdown: React.FC<{
  ownerIds: string[];
  toggleOwner: (userId: string) => void;
  users: UserType[];
  compact?: boolean;
}> = ({ ownerIds, toggleOwner, users, compact = false }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const selectedUsers = users.filter(u => ownerIds.includes(u.id));

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className={`w-full flex items-center gap-2 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] ${compact ? 'rounded px-2 py-1.5' : 'rounded-lg px-3 py-2'} text-left transition-colors shadow-sm hover:border-blue-400 dark:hover:border-blue-500`}
      >
        {selectedUsers.length === 0 ? (
          <>
            <div className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
              <User size={compact ? 10 : 12} className="text-gray-400" />
            </div>
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-500 dark:text-gray-400 flex-1 truncate`}>Select owners...</span>
          </>
        ) : selectedUsers.length === 1 ? (
          <>
            <img src={selectedUsers[0].avatarUrl} className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-cover`} alt={selectedUsers[0].name} />
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-[#172B4D] dark:text-white flex-1 truncate`}>{selectedUsers[0].name}</span>
          </>
        ) : (
          <>
            <div className="flex -space-x-1.5">
              {selectedUsers.slice(0, 3).map(u => (
                <img key={u.id} src={u.avatarUrl} className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full object-cover border-2 border-white dark:border-[#15171E]`} alt={u.name} />
              ))}
              {selectedUsers.length > 3 && (
                <div className={`${compact ? 'w-5 h-5 text-[7px]' : 'w-6 h-6 text-[8px]'} rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-white dark:border-[#15171E] flex items-center justify-center font-bold text-blue-600 dark:text-blue-400`}>
                  +{selectedUsers.length - 3}
                </div>
              )}
            </div>
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-[#172B4D] dark:text-white flex-1 truncate`}>
              {selectedUsers.length} owners
            </span>
          </>
        )}
        <ChevronDown size={compact ? 10 : 12} className={`text-gray-400 flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-[#1F2128] rounded-xl shadow-xl border border-gray-200 dark:border-[#2D2F36] py-2 z-30 overflow-hidden max-h-64 overflow-y-auto"
        >
          {/* Header */}
          <div className="px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Owners</span>
            {ownerIds.length > 0 && (
              <span className="text-[10px] font-medium text-blue-500">{ownerIds.length} selected</span>
            )}
          </div>

          <div className="my-1 border-t border-gray-100 dark:border-[#2D2F36]" />

          {/* User List */}
          {users.map(u => {
            const isSelected = ownerIds.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleOwner(u.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors text-left ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt={u.name} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#172B4D] dark:text-gray-200 truncate">{u.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {u.designation || u.jobTitle || u.email || 'Team member'}
                  </div>
                </div>
                {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const InputStep: React.FC<InputStepProps> = ({
  inputMode,
  setInputMode,
  productName,
  setProductName,
  description,
  setDescription,
  tags,
  setTags,
  startDate,
  setStartDate,
  targetDate,
  setTargetDate,
  ownerIds,
  toggleOwner,
  selectedTeam,
  toggleTeamMember,
  users,
  productImage,
  uploadedFile,
  isExtracting,
  fileInputRef,
  productImageInputRef,
  handleFileUpload,
  handleProductImageUpload,
  handleGenerate,
  handleSaveDraft,
  isSavingDraft,
  isTransitioning,
  transitionDirection,
}) => {
  return (
    <div className={`p-6 space-y-5 overflow-y-auto custom-scrollbar ${
      isTransitioning ? 'opacity-0' : transitionDirection === 'forward' ? 'animate-slideInFromRight' : 'animate-slideInFromLeft'
    }`}>
        {/* Input Type Toggle */}
        <div className="flex p-1 bg-gray-100 dark:bg-[#0B0C0E] rounded-xl">
            <button
                onClick={() => setInputMode('scratch')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'scratch' ? 'bg-white dark:bg-[#1F2128] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
                <Wand2 size={16} /> From Scratch
            </button>
            <button
                onClick={() => setInputMode('import')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${inputMode === 'import' ? 'bg-white dark:bg-[#1F2128] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
                <FileText size={16} /> Import Document
            </button>
        </div>

        {inputMode === 'scratch' ? (
            <div className="space-y-5">
                {/* Product Header Row */}
                <div className="flex gap-4">
                    {/* Logo Upload */}
                    <div
                        onClick={() => productImageInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl bg-gray-50 dark:bg-[#0B0C0E] border-2 border-dashed border-gray-200 dark:border-[#2D2F36] flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden flex-shrink-0"
                    >
                        <input
                            type="file"
                            ref={productImageInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleProductImageUpload}
                        />
                        {productImage ? (
                            <img src={productImage} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                                <ImageIcon size={20} />
                                <span className="text-[9px] font-bold uppercase">Logo</span>
                            </div>
                        )}
                    </div>

                    {/* Product Name */}
                    <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Product Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Nexus Analytics"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Elevator Pitch</label>
                    <textarea
                        rows={3}
                        placeholder="Describe your product in 1-2 sentences..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                    />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tags</label>
                    <input
                        type="text"
                        placeholder="AI, SaaS, B2B..."
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    {/* Timeline */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Calendar size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[9px] text-gray-400 block mb-1">Start</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2.5 py-1.5 text-xs text-[#172B4D] dark:text-gray-200"
                                />
                            </div>
                            <div>
                                <span className="text-[9px] text-gray-400 block mb-1">Target</span>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                    className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg px-2.5 py-1.5 text-xs text-[#172B4D] dark:text-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Owner */}
                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Users size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Owners</span>
                        </div>
                        <OwnerDropdown ownerIds={ownerIds} toggleOwner={toggleOwner} users={users} />
                    </div>
                </div>

                {/* Team Selection */}
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl border border-gray-100 dark:border-[#1F2128]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Users size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Team</span>
                        </div>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">{selectedTeam.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {users.map(u => (
                            <button
                                key={u.id}
                                onClick={() => toggleTeamMember(u.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTeam.includes(u.id) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20' : 'bg-white dark:bg-[#15171E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D2F36] hover:border-blue-300'}`}
                            >
                                <img src={u.avatarUrl} className="w-4 h-4 rounded-full" alt={u.name} />
                                {u.name.split(' ')[0]}
                                {selectedTeam.includes(u.id) && <Check size={12} className="text-blue-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {/* File Upload */}
                <div
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${uploadedFile ? 'border-green-400 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-[#2D2F36] hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10'}`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.js,.jsx,.ts,.tsx,.html,.css,.xml,.yml,.yaml"
                        onChange={handleFileUpload}
                    />
                    {isExtracting ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={32} className="animate-spin text-blue-500" />
                            <p className="text-sm font-medium text-gray-500">Extracting content...</p>
                        </div>
                    ) : uploadedFile ? (
                        <>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center mb-2">
                                <FileIcon size={24} />
                            </div>
                            <h3 className="font-bold text-[#172B4D] dark:text-white text-sm">{uploadedFile.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">Click to replace</p>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center mb-2">
                                <UploadCloud size={24} />
                            </div>
                            <h3 className="font-semibold text-[#172B4D] dark:text-white text-sm">Upload Document</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs">
                                PDF, DOCX, TXT, MD, or code files
                            </p>
                        </>
                    )}
                </div>

                {/* Meta Details Section */}
                <div className="border-t border-gray-100 dark:border-[#1F2128] pt-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3 flex items-center gap-2">
                        <Settings size={12} />
                        Optional Meta Details
                    </h4>

                    {/* Product Name & Logo Row */}
                    <div className="flex gap-3 mb-3">
                        <div
                            onClick={() => productImageInputRef.current?.click()}
                            className="w-16 h-16 rounded-xl bg-gray-50 dark:bg-[#0B0C0E] border-2 border-dashed border-gray-200 dark:border-[#2D2F36] flex items-center justify-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group overflow-hidden flex-shrink-0"
                        >
                            {productImage ? (
                                <img src={productImage} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-0.5 text-gray-400 group-hover:text-blue-500 transition-colors">
                                    <ImageIcon size={16} />
                                    <span className="text-[8px] font-bold uppercase">Logo</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Product Name</label>
                            <input
                                type="text"
                                placeholder="Auto-extracted from document..."
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="w-full mt-1 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="mb-3">
                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Tags</label>
                        <input
                            type="text"
                            placeholder="AI, SaaS, B2B..."
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full mt-1 bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Timeline & Owner Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Timeline</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[8px] text-gray-400 block mb-0.5">Start</span>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1 text-[10px] text-[#172B4D] dark:text-gray-200"
                                    />
                                </div>
                                <div>
                                    <span className="text-[8px] text-gray-400 block mb-0.5">Target</span>
                                    <input
                                        type="date"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        className="w-full bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded px-2 py-1 text-[10px] text-[#172B4D] dark:text-gray-200"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Users size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Owners</span>
                            </div>
                            <OwnerDropdown ownerIds={ownerIds} toggleOwner={toggleOwner} users={users} compact />
                        </div>
                    </div>

                    {/* Team Selection */}
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-lg border border-gray-100 dark:border-[#1F2128]">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Users size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Team Members</span>
                            </div>
                            <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">{selectedTeam.length} selected</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">AI will auto-assign tasks based on roles</p>
                        <div className="flex flex-wrap gap-1.5">
                            {users.map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => toggleTeamMember(u.id)}
                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium transition-all ${selectedTeam.includes(u.id) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20' : 'bg-white dark:bg-[#15171E] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#2D2F36] hover:border-blue-300'}`}
                                >
                                    <img src={u.avatarUrl} className="w-3.5 h-3.5 rounded-full" alt={u.name} />
                                    {u.name.split(' ')[0]}
                                    {selectedTeam.includes(u.id) && <Check size={10} className="text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
            {/* Save as Draft Button */}
            <button
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !productName}
                className="flex-1 border-2 border-gray-200 dark:border-[#2D2F36] text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold text-sm hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!productName ? 'Product name is required' : 'Save progress and continue later'}
            >
                {isSavingDraft ? (
                    <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <FileIcon size={16} />
                        Save Draft
                    </>
                )}
            </button>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={inputMode === 'scratch' ? !productName : !uploadedFile || isExtracting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
                <Sparkles size={16} /> Generate Vision
            </button>
        </div>
    </div>
  );
};

export default InputStep;
