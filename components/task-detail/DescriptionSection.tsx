
import React from 'react';
import {
  X,
  AlignLeft,
  Image as ImageIcon,
  FileText,
  Paperclip,
} from 'lucide-react';
import { Task } from '../../types';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface DescriptionSectionProps {
  currentTask: Task;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canChangeStatus: boolean;
    canDelete: boolean;
    isReporter: boolean;
    isAssignee: boolean;
  };
  descriptionBuffer: string;
  setDescriptionBuffer: (value: string) => void;
  isEditingDescription: boolean;
  setIsEditingDescription: (value: boolean) => void;
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  globalTask: any;
  onUpdateCurrentTask: (updates: Partial<Task>) => void;
}

const DescriptionSection: React.FC<DescriptionSectionProps> = ({
  currentTask,
  permissions,
  descriptionBuffer,
  setDescriptionBuffer,
  isEditingDescription,
  setIsEditingDescription,
  attachments,
  setAttachments,
  globalTask,
  onUpdateCurrentTask,
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <AlignLeft size={14} /> Description
        </label>
        {!isEditingDescription && currentTask.description && permissions.canEdit && (
          <button
            onClick={() => setIsEditingDescription(true)}
            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Edit
          </button>
        )}
      </div>
      {isEditingDescription ? (
        <div className="border border-blue-500/50 dark:border-blue-500/30 rounded-xl overflow-hidden bg-white dark:bg-[#0B0C0E] shadow-sm shadow-blue-500/10">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#2D2F36]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Editing description</span>
              {/* Image Upload Button */}
              <label className="flex items-center gap-1.5 px-2 py-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded text-[10px] font-medium cursor-pointer transition-colors ml-2">
                <ImageIcon size={12} />
                <span>Add Image</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const newAttachment = {
                            id: `att-${Date.now()}-${i}`,
                            name: file.name,
                            url: event.target?.result as string,
                            type: file.type
                          };
                          setAttachments((prev: Attachment[]) => [...prev, newAttachment]);
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDescriptionBuffer(currentTask.description || '');
                  setAttachments((globalTask as any).attachments || []);
                  setIsEditingDescription(false);
                }}
                className="px-3 py-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs font-medium rounded hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateCurrentTask({ description: descriptionBuffer, attachments } as any);
                  setIsEditingDescription(false);
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors"
              >
                Save
              </button>
            </div>
          </div>
          {/* Textarea */}
          <textarea
            value={descriptionBuffer.replace(/<[^>]*>/g, '')}
            onChange={(e) => setDescriptionBuffer(e.target.value)}
            className="w-full min-h-[200px] max-h-[400px] p-4 bg-white dark:bg-[#0B0C0E] border-none text-sm text-[#172B4D] dark:text-gray-200 focus:outline-none resize-y leading-relaxed placeholder:text-gray-400"
            placeholder="Add a detailed description...

Tips:
• Describe the task requirements
• List acceptance criteria
• Include technical details if needed"
            autoFocus
          />
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={12} className="text-gray-400" />
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attachments ({attachments.length})</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {attachments.map((att: Attachment) => (
                  <div key={att.id} className="relative group">
                    {att.type.startsWith('image/') ? (
                      <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2D2F36] bg-gray-100 dark:bg-[#1F2128]">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-[#1F2128] rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                        <FileText size={20} className="text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => setAttachments((prev: Attachment[]) => prev.filter((a: Attachment) => a.id !== att.id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg text-xs"
                    >
                      <X size={10} />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 text-[8px] text-white bg-black/60 px-1 py-0.5 rounded truncate">
                      {att.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div
            onClick={() => permissions.canEdit && setIsEditingDescription(true)}
            className={`group min-h-[120px] p-4 rounded-xl border border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30 transition-all text-sm text-[#172B4D] dark:text-gray-300 leading-relaxed ${permissions.canEdit ? 'hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 hover:border-gray-300 dark:hover:border-[#3D3F46] cursor-text' : 'cursor-default'}`}
          >
            {currentTask.description ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {currentTask.description.replace(/<[^>]*>/g, '').split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-2 last:mb-0">{line || '\u00A0'}</p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[80px] text-gray-400">
                <AlignLeft size={20} className="mb-2 opacity-50" />
                <p className="text-sm">{permissions.canEdit ? 'Click to add a description...' : 'No description'}</p>
              </div>
            )}
          </div>

          {/* Attachments Display (View Mode) */}
          {attachments.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-[#2D2F36] bg-gray-50/50 dark:bg-[#1F2128]/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Paperclip size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attachments</span>
                <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-[#2D2F36] px-1.5 py-0.5 rounded-full">{attachments.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((att: Attachment) => (
                  <div key={att.id} className="group relative">
                    {att.type.startsWith('image/') ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2D2F36] bg-gray-100 dark:bg-[#1F2128] hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                        </div>
                      </a>
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gray-100 dark:bg-[#1F2128] rounded-lg border border-gray-200 dark:border-[#2D2F36]">
                        <FileText size={24} className="text-gray-400" />
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">{att.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DescriptionSection;
