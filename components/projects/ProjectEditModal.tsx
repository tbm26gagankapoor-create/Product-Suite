
import React, { useState } from 'react';
import {
  X, ChevronDown, AlignLeft, Target, ImageIcon,
  Calendar, DollarSign, Users, Flag
} from 'lucide-react';
import { Project } from '../../types';
import ProductIcon, { ProductIconData } from '../ProductIcon';
import IconPickerModal from '../IconPickerModal';

interface ProjectEditModalProps {
  project: Project;
  editFormData: Partial<Project>;
  onEditFormChange: (data: Partial<Project>) => void;
  onSave: () => void;
  onClose: () => void;
}

const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  project,
  editFormData,
  onEditFormChange,
  onSave,
  onClose,
}) => {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const handleIconSave = (iconData: ProductIconData) => {
    onEditFormChange({
      ...editFormData,
      imageUrl: iconData.imageUrl,
      icon: iconData.icon,
      iconColor: iconData.iconColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white dark:bg-[#15171E] w-full max-w-[900px] max-h-[90vh] rounded-xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#1F2128] flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsIconPickerOpen(true)}
              className="relative group"
              title="Click to change icon"
            >
              <ProductIcon
                project={{
                  ...project,
                  imageUrl: editFormData.imageUrl,
                  icon: editFormData.icon,
                  iconColor: editFormData.iconColor,
                }}
                size="sm"
              />
              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageIcon size={14} className="text-white" />
              </div>
            </button>
            <div>
              <h3 className="text-lg font-bold text-[#172B4D] dark:text-white">Edit Product</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">{project.key}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Two Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Main Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Product Name */}
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => onEditFormChange({...editFormData, name: e.target.value})}
              className="w-full text-2xl font-bold bg-transparent border-none text-[#172B4D] dark:text-white focus:outline-none focus:ring-0 p-0 mb-6 placeholder:text-gray-400"
              placeholder="Product Name"
            />

            {/* Primary Properties Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8 pb-6 border-b border-gray-200 dark:border-[#2D2F36]">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <div className="relative">
                  <select
                    value={editFormData.status}
                    onChange={(e) => onEditFormChange({...editFormData, status: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none pr-8"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Health Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Health</label>
                <div className="relative">
                  <select
                    value={editFormData.healthStatus || ''}
                    onChange={(e) => onEditFormChange({...editFormData, healthStatus: e.target.value as any || undefined})}
                    className={`w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer appearance-none pr-8 ${
                      editFormData.healthStatus === 'on_track' ? 'text-emerald-600' :
                      editFormData.healthStatus === 'at_risk' ? 'text-amber-600' :
                      editFormData.healthStatus === 'off_track' ? 'text-red-600' :
                      'text-[#172B4D] dark:text-gray-200'
                    }`}
                  >
                    <option value="">Not set</option>
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="off_track">Off Track</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Lifecycle Stage */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Stage</label>
                <div className="relative">
                  <select
                    value={editFormData.lifecycleStage || ''}
                    onChange={(e) => onEditFormChange({...editFormData, lifecycleStage: e.target.value as any || undefined})}
                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm font-medium text-[#172B4D] dark:text-gray-200 cursor-pointer appearance-none pr-8"
                  >
                    <option value="">Not set</option>
                    <option value="discovery">Discovery</option>
                    <option value="alpha">Alpha</option>
                    <option value="beta">Beta</option>
                    <option value="ga">GA</option>
                    <option value="sunset">Sunset</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <AlignLeft size={14} /> Description
                </label>
              </div>
              <textarea
                rows={6}
                value={editFormData.description || ''}
                onChange={(e) => onEditFormChange({...editFormData, description: e.target.value})}
                className="w-full bg-gray-50/50 dark:bg-[#1F2128]/30 border border-gray-200 dark:border-[#2D2F36] rounded-xl px-4 py-3 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#1F2128]/50 resize-none leading-relaxed placeholder:text-gray-400 transition-colors"
                placeholder="Describe the product vision, goals, and scope..."
              />
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36] w-full my-8"></div>

            {/* Market & Category Section */}
            <div className="mb-6">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target size={12} /> Market & Category
              </h4>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. SaaS, Mobile App, Platform"
                    value={editFormData.category || ''}
                    onChange={(e) => onEditFormChange({...editFormData, category: e.target.value || undefined})}
                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Audience</label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise IT teams"
                    value={editFormData.targetAudience || ''}
                    onChange={(e) => onEditFormChange({...editFormData, targetAudience: e.target.value || undefined})}
                    className="w-full bg-gray-50 dark:bg-[#1F2128] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Sidebar */}
          <div className="w-[300px] bg-[#FAFBFC] dark:bg-[#0B0C0E] border-l border-gray-200 dark:border-[#1F2128] p-6 overflow-y-auto flex flex-col gap-6 flex-shrink-0">

            {/* Timeline Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={12} /> Timeline
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : ''}
                    className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    readOnly
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Flag size={10} /> Due Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.dueDate || ''}
                    onChange={(e) => onEditFormChange({...editFormData, dueDate: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

            {/* Budget Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={12} /> Budget
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Budget ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editFormData.budget || ''}
                    onChange={(e) => onEditFormChange({...editFormData, budget: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Spent ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={editFormData.spentBudget || ''}
                    onChange={(e) => onEditFormChange({...editFormData, spentBudget: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {editFormData.budget && editFormData.budget > 0 && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] font-medium text-gray-500 mb-1.5">
                      <span>Budget Used</span>
                      <span className={editFormData.spentBudget && editFormData.spentBudget > editFormData.budget ? 'text-red-500' : 'text-emerald-500'}>
                        {Math.round(((editFormData.spentBudget || 0) / editFormData.budget) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-[#2D2F36] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          editFormData.spentBudget && editFormData.spentBudget > editFormData.budget
                            ? 'bg-red-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(((editFormData.spentBudget || 0) / editFormData.budget) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-[#2D2F36]"></div>

            {/* Metrics Section */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Users size={12} /> Metrics
              </h4>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Count</label>
                <input
                  type="number"
                  placeholder="0"
                  value={editFormData.customerCount || ''}
                  onChange={(e) => onEditFormChange({...editFormData, customerCount: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="w-full bg-gray-50 dark:bg-[#15171E] border-none rounded-lg px-3 py-2 text-sm text-[#172B4D] dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Created Info */}
            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-[#2D2F36]">
              <p className="text-[10px] text-gray-400 font-medium">
                Created {project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#1F2128] flex justify-end gap-3 bg-gray-50 dark:bg-[#0B0C0E]/50 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F36] rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Icon Picker Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSave={handleIconSave}
        currentIcon={{
          imageUrl: editFormData.imageUrl,
          icon: editFormData.icon,
          iconColor: editFormData.iconColor,
        }}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  );
};

export default ProjectEditModal;
