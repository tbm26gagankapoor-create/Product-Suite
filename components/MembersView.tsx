
import React from 'react';
import { Mail, Phone, MoreHorizontal, Plus } from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';

const MembersView: React.FC = () => {
  const { users } = useProjectData();

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar bg-white dark:bg-[#13151A] transition-colors duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white dark:bg-[#0F1115] border border-gray-200 dark:border-[#1F2128] rounded-xl p-6 hover:border-indigo-500/30 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white dark:border-[#1F2128] group-hover:border-indigo-500 transition-colors shadow-sm">
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <button className="text-gray-400 hover:text-[#172B4D] dark:hover:text-white">
                <MoreHorizontal size={20} />
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-[#172B4D] dark:text-white mb-1">{user.name}</h3>
            <p className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-4">{user.designation || 'Team Member'}</p>
            
            <div className="space-y-2 mb-6">
               <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <Mail size={16} />
                  <span>{user.email || 'No email'}</span>
               </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-[#1F2128] dark:hover:bg-[#2D2F36] text-[#172B4D] dark:text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Profile
              </button>
              <button className="flex-1 border border-gray-200 dark:border-[#2D2F36] hover:bg-gray-50 dark:hover:bg-[#1F2128] text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors">
                Message
              </button>
            </div>
          </div>
        ))}
        
        {/* Add New Member Card */}
        <button className="bg-gray-50 dark:bg-[#1F2128]/30 border border-dashed border-gray-300 dark:border-[#2D2F36] rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white dark:hover:bg-[#1F2128] hover:border-indigo-500/50 hover:shadow-lg transition-all group min-h-[280px]">
           <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-indigo-600 transition-colors">
              <Plus size={32} />
           </div>
           <span className="text-gray-500 dark:text-gray-400 font-medium group-hover:text-indigo-600 dark:group-hover:text-white">Add New Member</span>
        </button>
      </div>
    </div>
  );
};

export default MembersView;
