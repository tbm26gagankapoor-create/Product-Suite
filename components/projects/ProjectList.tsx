
import React, { useState } from 'react';
import { Plus, Hexagon } from 'lucide-react';
import { useProjectData } from '../../context/ProjectDataContext';
import { Project, Task, User } from '../../types';
import ProductGeneratorModal from '../product-generator/ProductGeneratorModal';
import JiraImportModal from '../JiraImportModal';
import ProjectFilters from './ProjectFilters';
import ProjectCard from './ProjectCard';
import DraftCard from './DraftCard';
import ProjectListRow from './ProjectListRow';
import ProjectEditModal from './ProjectEditModal';
import ProjectDeleteDialog from './ProjectDeleteDialog';

interface ProjectListProps {
  onProjectSelect: (id: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect }) => {
  const { projects, addProject, organizationMembers, tasks, deleteProject, updateProject, addEpic, addTask, generateNextId, currentUser, currentOrganization } = useProjectData();
  const users = organizationMembers.map(m => m.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Default to grid for better visual appeal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);

  // Edit & Dropdown State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Project>>({});

  // Delete Confirmation State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Draft State
  const [draftToResume, setDraftToResume] = useState<Project | null>(null);

  const handleSaveDraft = async (draftData: any): Promise<string> => {
    const tempProjectId = draftData.id || `p-${Date.now()}`;
    const projectKey = draftData.name.substring(0, 3).toUpperCase();

    const draftProject: Project = {
      id: tempProjectId,
      name: draftData.name,
      key: projectKey,
      description: draftData.description || '',
      status: 'draft',
      progress: 0,
      members: (draftData.draft_data?.ownerIds || [draftData.draft_data?.ownerId]).filter(Boolean),
      ownerId: draftData.draft_data?.ownerIds?.[0] || draftData.draft_data?.ownerId || currentUser?.id,
      ownerIds: draftData.draft_data?.ownerIds || (draftData.draft_data?.ownerId ? [draftData.draft_data.ownerId] : [currentUser?.id].filter(Boolean)),
      organizationId: currentOrganization?.id,
      startDate: draftData.draft_data?.startDate,
      dueDate: draftData.draft_data?.targetDate,
      tags: draftData.draft_data?.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || ['Draft'],
      color: 'from-gray-500 to-gray-600',
      imageUrl: draftData.draft_data?.productImage,
      prd: draftData.draft_data?.generatedDocs?.prd || '',
      docs: draftData.draft_data?.generatedDocs || {},
      vision: draftData.vision || '',
      draftStep: draftData.draft_step,
      draftData: draftData.draft_data
    };

    // Save or update the draft
    let savedProject: Project | null;
    if (draftData.id && projects.some(p => p.id === draftData.id)) {
      // Update existing draft
      savedProject = await updateProject(draftProject);
    } else {
      // Create new draft
      savedProject = await addProject(draftProject);
    }

    return savedProject?.id || tempProjectId;
  };

  const handleResumeDraft = (project: Project) => {
    setDraftToResume(project);
    setIsGeneratorOpen(true);
  };

  const handleModalClose = () => {
    setIsGeneratorOpen(false);
    setDraftToResume(null);
  };

  const handleCreateProduct = async (productData: any) => {
    const tempProjectId = `p-${Date.now()}`;
    const projectKey = productData.name.substring(0, 3).toUpperCase();

    const newProject: Project = {
      id: tempProjectId,
      name: productData.name,
      key: projectKey,
      description: productData.description,
      status: 'Planning',
      progress: 0,
      members: [...(productData.ownerIds || [productData.ownerId]).filter(Boolean), ...productData.team],
      ownerId: productData.ownerIds?.[0] || productData.ownerId,
      ownerIds: productData.ownerIds || (productData.ownerId ? [productData.ownerId] : []),
      organizationId: currentOrganization?.id,
      startDate: productData.startDate,
      dueDate: productData.dueDate,
      tags: productData.tags || ['Product'],
      color: 'from-indigo-500 to-purple-500',
      imageUrl: productData.imageUrl,
      prd: productData.docs?.prd || '',
      docs: productData.docs,
      vision: productData.vision || ''
    };

    // 1. Create Project - use saved project ID from backend
    const savedProject = await addProject(newProject);
    const projectId = savedProject?.id || tempProjectId;

    // 2. Create Epics & Tasks
    if (productData.epics && Array.isArray(productData.epics)) {
      const owner = users.find((u: User) => u.id === (productData.ownerIds?.[0] || productData.ownerId)) || users[0];

      for (const epicData of productData.epics) {
        try {
          const epicId = generateNextId(projectId, 'epic');

          const newEpic: Task = {
            id: epicId,
            projectId: projectId,
            title: epicData.title,
            description: epicData.description,
            columnId: 'todo',
            type: 'epic',
            priority: 'MEDIUM',
            points: 0,
            assignee: owner,
            reporter: owner,
            tags: [],
            commentsCount: 0,
            startDate: new Date().toISOString()
          };

          const savedEpic = await addEpic(newEpic);
          // Use the returned ID (which might be UUID from DB) for linking children
          const parentId = savedEpic ? savedEpic.id : undefined;

          if (parentId && epicData.tasks && Array.isArray(epicData.tasks)) {
            for (const taskData of epicData.tasks) {
              const taskId = generateNextId(projectId, 'task');
              const assignee = users.find((u: User) => u.id === taskData.assigneeId) || owner;

              const newTask: Task = {
                id: taskId,
                projectId: projectId,
                title: taskData.title,
                description: taskData.description,
                columnId: 'todo',
                type: taskData.type || 'task',
                priority: 'MEDIUM',
                points: typeof taskData.points === 'number' ? taskData.points : 1,
                assignee: assignee,
                reporter: owner,
                parentEpicId: parentId,
                tags: [],
                commentsCount: 0,
                startDate: new Date().toISOString(),
                dueDate: taskData.dueDate
              };
              await addTask(newTask);
            }
          }
        } catch (epicError) {
          console.error(`Failed to create epic "${epicData.title}":`, epicError);
        }
      }
    }

    // Clean up old draft project if we were resuming from one
    if (draftToResume?.id) {
      try {
        await deleteProject(draftToResume.id);
      } catch (error) {
        console.error('Failed to clean up draft project:', error);
      }
    }

    setIsGeneratorOpen(false);
    setDraftToResume(null);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Draft projects are always shown regardless of filter so users can resume them
    const isDraft = project.status === 'draft';
    const matchesFilter = activeFilter === 'All' || isDraft ||
                          (activeFilter === 'Active' && (project.status === 'In Progress' || project.status === 'Planning')) ||
                          (activeFilter === 'Completed' && project.status === 'Completed') ||
                          (activeFilter === 'Archived' && project.status === 'Archived');
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'In Progress': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
      case 'Planning': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
      case 'On Hold': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#3D3F46]';
      case 'Completed': return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#3D3F46]';
      default: return 'bg-gray-100 dark:bg-[#2D2F36] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#3D3F46]';
    }
  };

  const calculateProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId && t.type !== 'epic');
    if (projectTasks.length === 0) {
      const currentProject = projects.find(p => p.id === projectId);
      return currentProject?.progress || 0;
    }
    const completed = projectTasks.filter(t => t.columnId === 'done').length;
    return Math.round((completed / projectTasks.length) * 100);
  };

  const getProjectStats = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const epicsCount = projectTasks.filter(t => t.type === 'epic').length;
    const tasksCount = projectTasks.filter(t => t.type !== 'epic').length;
    const completedCount = projectTasks.filter(t => t.columnId === 'done' && t.type !== 'epic').length;
    return { total: tasksCount, epics: epicsCount, tasks: tasksCount, completed: completedCount };
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const toggleDropdown = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(prev => prev === projectId ? null : projectId);
  };

  const initiateDeleteProject = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(null);
    setProjectToDelete(project);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      setIsDeleting(true);
      try {
        await deleteProject(projectToDelete.id);
      } catch (error) {
        console.error("Failed to delete project:", error);
      } finally {
        setIsDeleting(false);
        setProjectToDelete(null);
      }
    }
  };

  const handleEditProject = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(null);
    setProjectToEdit(project);
    setEditFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
      healthStatus: project.healthStatus,
      lifecycleStage: project.lifecycleStage,
      category: project.category,
      budget: project.budget,
      spentBudget: project.spentBudget,
      customerCount: project.customerCount,
      targetAudience: project.targetAudience,
      imageUrl: project.imageUrl,
      icon: project.icon,
      iconColor: project.iconColor,
    });
  };

  const saveProjectChanges = async () => {
    if (projectToEdit) {
      await updateProject({ ...projectToEdit, ...editFormData });
      setProjectToEdit(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F5F7] dark:bg-[#0B0C0E] transition-colors duration-200" onClick={() => setActiveDropdown(null)}>

      {/* Header + Toolbar */}
      <ProjectFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onImportClick={() => setIsJiraModalOpen(true)}
        onNewProductClick={() => setIsGeneratorOpen(true)}
      />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">

        {/* Empty State - Show when no products match the filter */}
        {filteredProjects.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[400px] animate-in fade-in duration-300">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Hexagon size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
                {activeFilter === 'All' ? 'No products yet' : `No ${activeFilter.toLowerCase()} products`}
              </h3>
              <p className="text-[#5E6C84] dark:text-gray-400 mb-6">
                {activeFilter === 'All'
                  ? 'Get started by creating your first product to organize your initiatives and track progress.'
                  : `You don't have any ${activeFilter.toLowerCase()} products. Create a new product or change the filter to see more.`
                }
              </p>
              <button
                onClick={() => setIsGeneratorOpen(true)}
                className="inline-flex items-center gap-2 bg-[#172B4D] dark:bg-white text-white dark:text-black hover:opacity-90 px-6 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg text-sm"
              >
                <Plus size={18} strokeWidth={3} />
                <span>Create Your First Product</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'list' && filteredProjects.length > 0 ? (
          <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-300 min-h-[400px]">
            {/* List Header */}
            <div className="grid grid-cols-[minmax(280px,2fr)_100px_100px_80px_80px_140px_70px_44px] gap-4 px-6 py-4 bg-gray-50/80 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-white/5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="pl-2">Product</div>
              <div>Status</div>
              <div>Start</div>
              <div>Due</div>
              <div className="text-center">Tasks</div>
              <div>Progress</div>
              <div>Team</div>
              <div></div>
            </div>

            {/* List Rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredProjects.map(project => {
                const progress = calculateProgress(project.id);
                const stats = getProjectStats(project.id);
                return (
                  <ProjectListRow
                    key={project.id}
                    project={project}
                    users={users}
                    progress={progress}
                    stats={stats}
                    activeDropdown={activeDropdown}
                    onProjectSelect={onProjectSelect}
                    onToggleDropdown={toggleDropdown}
                    onEditProject={handleEditProject}
                    onDeleteProject={initiateDeleteProject}
                    getStatusColor={getStatusColor}
                    formatShortDate={formatShortDate}
                  />
                );
              })}
            </div>
          </div>
        ) : filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-in fade-in duration-300 pb-12">
            {filteredProjects.map((project) => {
              const progress = calculateProgress(project.id);
              const stats = getProjectStats(project.id);

              if (project.status === 'draft') {
                return (
                  <DraftCard
                    key={project.id}
                    project={project}
                    activeDropdown={activeDropdown}
                    onResumeDraft={handleResumeDraft}
                    onToggleDropdown={toggleDropdown}
                    onEditProject={handleEditProject}
                    onDeleteProject={initiateDeleteProject}
                  />
                );
              }

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  users={users}
                  progress={progress}
                  stats={stats}
                  activeDropdown={activeDropdown}
                  onProjectSelect={onProjectSelect}
                  onToggleDropdown={toggleDropdown}
                  onEditProject={handleEditProject}
                  onDeleteProject={initiateDeleteProject}
                  getStatusColor={getStatusColor}
                  formatShortDate={formatShortDate}
                />
              );
            })}

            {/* New Product Card */}
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="border-2 border-dashed border-gray-200 dark:border-[#2D2F36] rounded-2xl p-6 flex flex-col items-center justify-center gap-4 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#15171E]/50 transition-all group min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
                <Plus size={32} />
              </div>
              <span className="font-bold text-lg">Create New Product</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* Edit Project Modal */}
      {projectToEdit && (
        <ProjectEditModal
          project={projectToEdit}
          editFormData={editFormData}
          onEditFormChange={setEditFormData}
          onSave={saveProjectChanges}
          onClose={() => setProjectToEdit(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ProjectDeleteDialog
        project={projectToDelete}
        isDeleting={isDeleting}
        onConfirm={confirmDeleteProject}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* AI Product Generator Modal */}
      <ProductGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={handleModalClose}
        onCreate={handleCreateProduct}
        onSaveDraft={handleSaveDraft}
        draftProject={draftToResume}
      />

      {/* Jira Import Modal */}
      <JiraImportModal
        isOpen={isJiraModalOpen}
        onClose={() => setIsJiraModalOpen(false)}
      />
    </div>
  );
};

export default ProjectList;
