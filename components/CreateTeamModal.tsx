
import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { Team } from '../types';
import { useProjectData } from '../context/ProjectDataContext';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (team: Team) => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  // Use organization-scoped users - only show users from current organization
  const { organizationUsers, currentOrganization } = useProjectData();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name,
      description,
      members: selectedMembers,
      projectIds: [],
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      organizationId: currentOrganization?.id, // Associate team with current organization
    };
    onSubmit(newTeam);
    onClose();
    // Reset form
    setName('');
    setDescription('');
    setSelectedMembers([]);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#15171E] w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#1F2128]">
          <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Create New Team</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Team Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. Growth Hacking"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Description</label>
            <textarea 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              placeholder="What is this team responsible for?"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Add Members</label>
            <div className="max-h-40 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-[#1F2128] rounded-xl bg-gray-50 dark:bg-[#0B0C0E]">
                {organizationUsers.map(user => (
                    <div 
                        key={user.id} 
                        onClick={() => toggleMember(user.id)}
                        className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors ${selectedMembers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedMembers.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                            {selectedMembers.includes(user.id) && <X size={10} className="text-white rotate-45" />}
                        </div>
                        <img src={user.avatarUrl} className="w-6 h-6 rounded-full" />
                        <span className="text-sm text-[#172B4D] dark:text-gray-200">{user.name}</span>
                    </div>
                ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name}
              className="px-6 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold text-sm rounded-xl hover:bg-[#172B4D]/90 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;