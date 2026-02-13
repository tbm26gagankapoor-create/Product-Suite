
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Mail,
  MapPin,
  Link as LinkIcon,
  Calendar,
  MoreHorizontal,
  Edit3,
  CheckCircle2,
  Clock,
  Briefcase,
  Github,
  Twitter,
  Linkedin,
  Plus,
  Activity,
  Camera,
  Layers,
  ChevronRight,
  Save,
  X
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { User } from '../types';
import { useToast } from '../context/ToastContext';

// Helper for relative time
const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

const UserProfileView: React.FC = () => {
  const { tasks, currentUser, updateCurrentUser, teams, projects } = useProjectData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { error: showError, success } = useToast();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'projects' | 'settings'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Local State for Edit Form - initialized with defaults
  const [editForm, setEditForm] = useState<User>({
      id: '', name: '', avatarUrl: '', email: '', role: '',
      location: '', bio: '', website: '', jobTitle: ''
  });

  // Sync with current user from context
  useEffect(() => {
      if (currentUser) {
          setEditForm({ ...currentUser });
      }
  }, [currentUser]);

  if (!currentUser) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  // Stats
  const userTasks = tasks.filter(t => t.assignee.id === currentUser.id);
  const completedTasks = userTasks.filter(t => t.columnId === 'done').length;
  const activeTasksCount = userTasks.filter(t => t.columnId !== 'done').length;
  const userProjects = projects.filter(p => p.members.includes(currentUser.id));
  const userTeams = teams.filter(t => t.members.includes(currentUser.id));

  // Dynamic Activity Stream (Only derived from real tasks)
  const activityStream = useMemo(() => {
      const stream: any[] = [];
      const now = new Date();

      tasks.forEach(task => {
          // 1. Task Creation
          if (task.reporter?.id === currentUser.id) {
              const date = task.startDate ? new Date(task.startDate) : new Date();
              stream.push({
                  id: `create-${task.id}`,
                  type: 'create',
                  text: 'created task',
                  target: task.title,
                  taskId: task.id,
                  detail: 'Added to backlog',
                  date: date,
                  timeString: timeAgo(date),
                  icon: Plus,
                  color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/20'
              });
          }

          // 2. Task Completion
          if (task.assignee.id === currentUser.id && task.columnId === 'done') {
               const date = new Date(); // Simplified as task completion time isn't stored in this Task type
               stream.push({
                  id: `complete-${task.id}`,
                  type: 'complete',
                  text: 'completed',
                  target: task.title,
                  taskId: task.id,
                  detail: 'Moved to Done',
                  date: date,
                  timeString: timeAgo(date),
                  icon: CheckCircle2,
                  color: 'text-green-500 bg-green-100 dark:bg-green-900/20'
              });
          }
      });

      return stream.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [tasks, currentUser.id]);

  const handleSaveProfile = async () => {
      setIsSaving(true);
      try {
          await updateCurrentUser({
              name: editForm.name,
              role: editForm.role,
              avatarUrl: editForm.avatarUrl,
              location: editForm.location,
              bio: editForm.bio,
              website: editForm.website,
              jobTitle: editForm.jobTitle
          });
          setIsEditModalOpen(false);
          success('Profile Updated', 'Your profile has been saved successfully.');
      } catch (error) {
          showError('Save Failed', 'Failed to save profile. Please try again.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleTabChange = (tab: string) => {
      setActiveTab(tab.toLowerCase() as any);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FC] dark:bg-[#0B0C0E] custom-scrollbar h-full transition-colors duration-200">
      
      {/* Header Section */}
      <div className="bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] pt-10 px-8 pb-0">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
                {/* Avatar */}
                <div className="relative group cursor-pointer" onClick={() => setIsEditModalOpen(true)}>
                    <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.name} 
                        className="w-32 h-32 rounded-full border-4 border-gray-50 dark:border-[#1F2128] shadow-lg object-cover group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white drop-shadow-md" />
                    </div>
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white dark:border-[#15171E] rounded-full" title="Online"></div>
                </div>

                {/* User Info */}
                <div className="flex-1 pt-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-2">{currentUser.name}</h1>
                            <div className="flex items-center gap-2 text-lg text-gray-500 dark:text-gray-400 mb-4">
                                <Briefcase size={18} />
                                <span>{currentUser.jobTitle || currentUser.role || 'Team Member'}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 bg-white dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-[#2D2F36] transition-colors shadow-sm">
                                <MoreHorizontal size={18} />
                            </button>
                            <button 
                                onClick={() => setIsEditModalOpen(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                <Edit3 size={16} /> Edit Profile
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                        {currentUser.location && (
                            <span className="flex items-center gap-1.5">
                                <MapPin size={16} /> {currentUser.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Calendar size={16} /> Joined Recently
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Mail size={16} /> {currentUser.email}
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-8">
                {['Overview', 'Activity', 'Projects', 'Settings'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`py-4 text-sm font-bold border-b-2 capitalize transition-colors ${
                            activeTab === tab.toLowerCase()
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Sidebar */}
            <div className="space-y-6">
                
                {/* About */}
                <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">About</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        {currentUser.bio || "No bio added yet."}
                    </p>
                    
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Socials</h3>
                    <div className="space-y-3">
                        {currentUser.website && (
                            <a href="#" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors text-sm text-gray-600 dark:text-gray-300">
                                <LinkIcon size={18} className="text-gray-400" />
                                <span>{currentUser.website}</span>
                            </a>
                        )}
                        <div className="text-xs text-gray-400 italic">No other links connected.</div>
                    </div>
                </div>

                {/* Teams Card */}
                <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Teams</h3>
                        <span className="bg-gray-100 dark:bg-[#2D2F36] text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-bold">{userTeams.length}</span>
                    </div>
                    <div className="space-y-3">
                        {userTeams.map(team => (
                            <div key={team.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1F2128] p-2 -mx-2 rounded-lg transition-colors">
                                <img src={team.avatarUrl || ''} className="w-8 h-8 rounded-lg object-cover bg-gray-100 dark:bg-[#2D2F36]" />
                                <div>
                                    <p className="text-sm font-bold text-[#172B4D] dark:text-white">{team.name}</p>
                                    <p className="text-xs text-gray-500">{team.members.length} members</p>
                                </div>
                            </div>
                        ))}
                        {userTeams.length === 0 && <p className="text-sm text-gray-500 italic">No teams assigned.</p>}
                    </div>
                </div>

            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white dark:bg-[#15171E] p-5 rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                                    <CheckCircle2 size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                                </div>
                                <div className="text-3xl font-bold text-[#172B4D] dark:text-white">{completedTasks}</div>
                            </div>
                            <div className="bg-white dark:bg-[#15171E] p-5 rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                                    <Clock size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                                </div>
                                <div className="text-3xl font-bold text-[#172B4D] dark:text-white">{activeTasksCount}</div>
                            </div>
                            <div className="bg-white dark:bg-[#15171E] p-5 rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm">
                                <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
                                    <Layers size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Projects</span>
                                </div>
                                <div className="text-3xl font-bold text-[#172B4D] dark:text-white">{userProjects.length}</div>
                            </div>
                        </div>

                        {/* Current Projects */}
                        <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128]">
                                <h3 className="font-bold text-[#172B4D] dark:text-white">Active Projects</h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                                {userProjects.map(project => {
                                    const projectTasks = tasks.filter(t => t.projectId === project.id);
                                    const pTotal = projectTasks.length;
                                    const pDone = projectTasks.filter(t => t.columnId === 'done').length;
                                    const pProgress = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

                                    return (
                                        <div key={project.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer">
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${project.color} flex items-center justify-center text-gray-900 dark:text-white font-bold text-xs`}>
                                                {project.key}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-bold text-[#172B4D] dark:text-white">{project.name}</h4>
                                                <p className="text-xs text-gray-500 truncate w-64">{project.description}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-xs font-bold text-gray-500">{pProgress}%</span>
                                                <div className="w-20 h-1.5 bg-gray-100 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${pProgress}%` }}></div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400" />
                                        </div>
                                    );
                                })}
                                {userProjects.length === 0 && <div className="p-6 text-sm text-gray-500 italic">No projects assigned.</div>}
                            </div>
                        </div>
                    </>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                    <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm overflow-hidden p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-[#172B4D] dark:text-white">Activity Feed</h3>
                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                <Activity size={14} /> Real-time
                            </div>
                        </div>
                        <div className="relative border-l-2 border-gray-100 dark:border-[#2D2F36] ml-3 space-y-10">
                            {activityStream.length > 0 ? activityStream.map((activity, idx) => (
                                <div key={idx} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#15171E] ${activity.color.split(' ')[1].replace('bg-', 'bg-')}`}></div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                            <p className="text-sm text-[#172B4D] dark:text-gray-200">
                                                <span className="font-semibold">{currentUser.name}</span> {activity.text} <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{activity.target}</span>
                                            </p>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">{activity.timeString}</span>
                                        </div>
                                        {activity.detail && (
                                            <div className="p-3 bg-gray-50 dark:bg-[#1F2128] rounded-lg border border-gray-100 dark:border-[#2D2F36] flex items-start gap-3">
                                                <div className="mt-0.5 text-gray-400">
                                                    <activity.icon size={16} />
                                                </div>
                                                <span className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{activity.detail}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                    No recent activity.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* PROJECTS TAB */}
                {activeTab === 'projects' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">Assigned Projects</h3>
                        </div>
                        {userProjects.map(project => (
                            <div key={project.id} className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center text-gray-900 dark:text-white font-bold text-lg shadow-sm`}>
                                            {project.key}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-[#172B4D] dark:text-white">{project.name}</h4>
                                            <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{project.status}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{project.description}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="font-bold text-[#172B4D] dark:text-white text-lg">Profile Settings</h3>
                                <p className="text-sm text-gray-500">Manage your public profile details.</p>
                            </div>
                            <button 
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="px-6 py-2 bg-[#172B4D] dark:bg-white text-white dark:text-black rounded-lg text-sm font-bold shadow-lg hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : <><Save size={16} /> Save Changes</>}
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Full Name</label>
                                    <input 
                                        type="text" 
                                        value={editForm.name} 
                                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Job Title</label>
                                    <input 
                                        type="text" 
                                        value={editForm.jobTitle || editForm.role} 
                                        onChange={(e) => setEditForm({...editForm, jobTitle: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Location</label>
                                    <input 
                                        type="text" 
                                        value={editForm.location || ''} 
                                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500"
                                        placeholder="Add your location"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Email (Read Only)</label>
                                    <input 
                                        type="email" 
                                        value={editForm.email || ''} 
                                        readOnly
                                        className="w-full bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 focus:outline-none cursor-not-allowed"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Bio</label>
                                <textarea 
                                    rows={4}
                                    value={editForm.bio || ''} 
                                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-2.5 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Tell us about yourself"
                                />
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#15171E] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1F2128] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit Profile</h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Hidden Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                            <img src={editForm.avatarUrl} className="w-16 h-16 rounded-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera size={16} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <button onClick={handleAvatarClick} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">Change Avatar</button>
                            <p className="text-xs text-gray-500 mt-1">Recommended: 400x400px</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500">Name</label>
                            <input 
                                type="text" 
                                value={editForm.name} 
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-gray-500">Role</label>
                            <input 
                                type="text" 
                                value={editForm.role} 
                                onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500">Location</label>
                        <input 
                            type="text" 
                            value={editForm.location || ''} 
                            onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200"
                            placeholder="Add location"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-gray-500">Bio</label>
                        <textarea 
                            rows={3}
                            value={editForm.bio || ''} 
                            onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                            className="w-full bg-gray-50 dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#1F2128] rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 resize-none"
                            placeholder="Add a bio"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 dark:bg-[#0B0C0E] border-t border-gray-100 dark:border-[#1F2128] flex justify-end gap-3">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white">Cancel</button>
                    <button onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default UserProfileView;
