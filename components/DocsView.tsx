
import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    MoreHorizontal, 
    Search, 
    Grid, 
    List as ListIcon, 
    File, 
    Image, 
    Layout, 
    FolderOpen,
    ArrowLeft
} from 'lucide-react';
import { useProjectData } from '../context/ProjectDataContext';
import { documentsService } from '../services/documents.service';
import { ProjectDocument } from '../types/database.types';

const DocsView: React.FC = () => {
  const { projects } = useProjectData();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch docs from all available projects for display
  useEffect(() => {
      const loadDocs = async () => {
          setLoading(true);
          try {
              const allDocs: ProjectDocument[] = [];
              for (const p of projects) {
                  const pDocs = await documentsService.getAll(p.id);
                  allDocs.push(...pDocs);
              }
              setDocs(allDocs);
          } catch (e) {
              console.error(e);
          } finally {
              setLoading(false);
          }
      };
      if (projects.length > 0) loadDocs();
  }, [projects]);

  const getIcon = (type: string, size: number = 20) => {
      // Simplified mapping since DB only stores content strings usually
      return <FileText size={size} className="text-blue-500" />;
  };

  const filteredDocs = docs.filter(doc => {
      const query = searchTerm.toLowerCase();
      const matchesTitle = doc.section_id.toLowerCase().includes(query);
      const matchesContent = doc.content?.toLowerCase().includes(query);
      return matchesTitle || matchesContent;
  });

  // Render Document Detail View (Simple render of content)
  if (selectedDocId) {
      const selectedDoc = docs.find(d => d.id === selectedDocId);
      return (
        <div className="h-full bg-white dark:bg-[#13151A] overflow-y-auto custom-scrollbar p-8 flex justify-center transition-colors duration-200">
          <div className="max-w-4xl w-full bg-white dark:bg-[#0F1115] min-h-[800px] rounded-xl border border-gray-200 dark:border-[#1F2128] p-12 shadow-sm dark:shadow-2xl relative animate-in fade-in slide-in-from-bottom-4">
            
            <button 
                onClick={() => setSelectedDocId(null)}
                className="absolute top-8 left-8 flex items-center gap-2 text-sm text-gray-500 hover:text-[#172B4D] dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={16} /> Back to Files
            </button>

            {/* Doc Header */}
            <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-[#1F2128] pb-4 mt-8">
               <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                 <FileText size={16} />
                 <span>{selectedDoc?.section_id}</span>
               </div>
            </div>
            
             {/* Content */}
             <div className="prose prose-slate dark:prose-invert max-w-none">
                {selectedDoc?.content ? (
                    <div dangerouslySetInnerHTML={{ __html: selectedDoc.content }} />
                ) : (
                    <p className="text-gray-500">No content available.</p>
                )}
             </div>
          </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0B0C0E] transition-colors duration-200">
        
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128] px-8 py-6 z-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h1 className="text-3xl font-bold text-[#172B4D] dark:text-white mb-1">Documents</h1>
                   <p className="text-[#5E6C84] dark:text-gray-400 text-sm">Project specifications and designs.</p>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-blue-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search docs..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-50 dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-200 pl-9 pr-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-[#2D2F36] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none w-64 transition-all"
                        />
                     </div>
                </div>
            </div>
        </div>

        {/* Fixed Toolbar */}
        <div className="flex-shrink-0 px-8 py-4 bg-white dark:bg-[#0B0C0E] flex justify-end">
            <div className="flex p-1.5 bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm">
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 dark:bg-[#3B82F6]/15 text-blue-600 dark:text-[#3B82F6] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <ListIcon size={16} />
                </button>
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 dark:bg-[#3B82F6]/15 text-blue-600 dark:text-[#3B82F6] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Grid size={16} />
                </button>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
            {/* Files Grid/List */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading documents...</div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 text-gray-500">No documents found.</div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredDocs.map(doc => (
                        <div 
                            key={doc.id}
                            onClick={() => setSelectedDocId(doc.id)}
                            className="group bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg transition-all cursor-pointer flex flex-col h-full"
                        >
                            {/* Preview Area */}
                            <div className="h-32 w-full bg-gray-50 dark:bg-[#1F2128] relative border-b border-gray-100 dark:border-[#2D2F36]">
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-600 group-hover:text-blue-400 dark:group-hover:text-blue-500 transition-colors">
                                    <FileText size={48} />
                                </div>
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="text-sm font-bold text-[#172B4D] dark:text-white mb-1 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {doc.section_id}
                                </h3>
                                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1F2128]">
                                    <span className="text-[10px] text-gray-500">{new Date(doc.updated_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-[#15171E] border border-gray-200 dark:border-[#1F2128] rounded-xl overflow-hidden shadow-sm">
                     <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-[#1F2128]/50 border-b border-gray-200 dark:border-[#1F2128]">
                               <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-12">Type</th>
                               <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                               <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Last Updated</th>
                               <th className="py-3 px-6 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right"></th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100 dark:divide-[#1F2128]">
                            {filteredDocs.map(doc => (
                                <tr 
                                    key={doc.id}
                                    onClick={() => setSelectedDocId(doc.id)}
                                    className="hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer group"
                                >
                                    <td className="py-3 px-6">
                                        <FileText size={18} className="text-blue-500" />
                                    </td>
                                    <td className="py-3 px-6">
                                        <div className="text-sm font-bold text-[#172B4D] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {doc.section_id}
                                        </div>
                                    </td>
                                    <td className="py-3 px-6">
                                        <span className="text-[10px] text-gray-400">{new Date(doc.updated_at).toLocaleDateString()}</span>
                                    </td>
                                    <td className="py-3 px-6 text-right">
                                        <button className="p-1.5 rounded text-gray-400 hover:text-[#172B4D] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                         </tbody>
                     </table>
                </div>
            )}
        </div>
    </div>
  );
};

export default DocsView;
