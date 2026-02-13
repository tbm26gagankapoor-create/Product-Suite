
import React, { useState, useEffect } from 'react';
import Header from './Header';
import KanbanBoard from './KanbanBoard';
import ListView from './ListView';
import TimelineView from './TimelineView';
import TeamsView from './TeamsView';
import DocsView from './DocsView';
import Overview from './Overview';
import PlanningView from './PlanningView';
import DateFixerModal from './DateFixerModal';
import { Project, Task } from '../types';
import { useProjectData } from '../context/ProjectDataContext';

interface ProjectViewProps {
  activeProject: Project;
}

const ProjectView: React.FC<ProjectViewProps> = ({ activeProject }) => {
  const [activeTab, setActiveTab] = useState('Overview');
  const { tasks, updateTask, updateProject, sprints } = useProjectData();
  const [isDateFixerOpen, setIsDateFixerOpen] = useState(false);
  
  // Global Sprint State - Initialize safely even if project is loading
  const [globalSprintId, setGlobalSprintId] = useState<string>('');

  // Update selected sprint when project changes or loads
  useEffect(() => {
      if (activeProject) {
          const projectSprints = sprints.filter(s => s.projectId === activeProject.id);
          const activeSprint = projectSprints.find(s => s.status === 'active') || projectSprints[0];
          if (activeSprint) {
              setGlobalSprintId(activeSprint.id);
          }
      }
  }, [activeProject, sprints]);

  if (!activeProject) {
      return (
          <div className="flex items-center justify-center h-full text-gray-500 bg-white dark:bg-[#0B0C0E]">
              <p>No project selected or data is loading.</p>
          </div>
      );
  }

  // Filter tasks belonging to this project
  const projectTasks = tasks.filter(t => t.projectId === activeProject.id);
  
  // Identify tasks without due dates
  const tasksWithoutDates = projectTasks.filter(t => !t.dueDate && t.columnId !== 'done');

  const handleTaskUpdate = (updatedTask: Task) => {
    updateTask(updatedTask);
  };

  const handleProjectUpdate = (updatedProject: Project) => {
      updateProject(updatedProject);
  };

  const handleBatchDateUpdate = (updates: { taskId: string; date: string }[]) => {
      updates.forEach(({ taskId, date }) => {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
              updateTask({ ...task, dueDate: date });
          }
      });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return <Overview 
                  onNavigate={(tab: string) => setActiveTab(tab)} 
                  activeProject={activeProject} 
                  onProjectUpdate={handleProjectUpdate} 
                  projectTasks={projectTasks} 
               />;
      case 'Sprints':
        return <PlanningView projectId={activeProject.id} />;
      case 'Boards':
        return <KanbanBoard sprintId={globalSprintId} tasks={projectTasks} onTaskUpdate={handleTaskUpdate} projectId={activeProject.id} />;
      case 'Tasks':
        return <ListView sprintId={globalSprintId} tasks={projectTasks} onTaskUpdate={handleTaskUpdate} projectId={activeProject.id} />;
      case 'Timeline':
      case 'Chronology':
        return <TimelineView tasks={projectTasks} onTaskUpdate={handleTaskUpdate} />;
      case 'Teams':
        return <TeamsView />; 
      case 'Docs':
      case 'Files':
        return <DocsView />;
      default:
        return (
            <div className="flex items-center justify-center h-full text-gray-500 bg-white dark:bg-[#0B0C0E] transition-colors">
                <p>View "{activeTab}" is coming soon.</p>
            </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#0B0C0E] transition-colors duration-200">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        selectedSprintId={globalSprintId}
        onSprintChange={setGlobalSprintId}
        activeProject={activeProject}
        onFixDates={() => setIsDateFixerOpen(true)}
        missingDateCount={tasksWithoutDates.length}
      />
      <div className="flex-1 overflow-hidden relative">
        {renderContent()}
      </div>

      <DateFixerModal 
        isOpen={isDateFixerOpen}
        onClose={() => setIsDateFixerOpen(false)}
        tasks={tasksWithoutDates}
        onSave={handleBatchDateUpdate}
      />
    </div>
  );
};

export default ProjectView;
