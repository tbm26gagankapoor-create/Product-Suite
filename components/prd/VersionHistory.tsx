
import React from 'react';
import { RotateCcw } from 'lucide-react';
import { DocVersion } from '../../types';

interface VersionHistoryProps {
    sectionHistory: DocVersion[];
    handleRestore: (version: DocVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
    sectionHistory,
    handleRestore,
}) => {
    if (sectionHistory.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-xs">No history yet.</div>
        );
    }

    return (
        <>
            {sectionHistory.map(version => (
                <div key={version.id} className="p-3 bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#172B4D] dark:text-gray-200">{new Date(version.timestamp).toLocaleDateString()}</span>
                        <span className="text-[10px] text-gray-400">{new Date(version.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{version.summary}</p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <img src={version.user.avatarUrl} className="w-4 h-4 rounded-full" />
                            <span className="text-[10px] text-gray-500">{version.user.name}</span>
                        </div>
                        <button onClick={() => handleRestore(version)} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                            <RotateCcw size={10} /> Restore
                        </button>
                    </div>
                </div>
            ))}
        </>
    );
};

export default VersionHistory;
