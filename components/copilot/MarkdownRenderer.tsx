
import React from 'react';

interface MarkdownRendererProps {
  content: string;
  isUser: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser }) => {
    const lines = content.split('\n');
    const nodes: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const processInline = (text: string) => {
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className={`font-bold ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className={`${isUser ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400'} px-1 py-0.5 rounded font-mono text-xs`}>{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    const flushTable = (keyPrefix: string) => {
        if (tableBuffer.length === 0) return;

        const normalize = (row: string) => row.split('|').map(c => c.trim()).filter((c, i, arr) => {
            return c.length > 0 || (i > 0 && i < arr.length - 1);
        }).filter(c => c !== '');

        const headers = normalize(tableBuffer[0]);
        const bodyRows = tableBuffer.slice(2).map(normalize);

        nodes.push(
            <div key={keyPrefix} className={`my-3 overflow-hidden rounded-lg border ${isUser ? 'border-white/30' : 'border-gray-200 dark:border-gray-700'}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className={`${isUser ? 'bg-white/10' : 'bg-gray-50 dark:bg-gray-800'}`}>
                            <tr>
                                {headers.map((h, i) => (
                                    <th key={i} className={`px-3 py-2 font-bold uppercase tracking-wider whitespace-nowrap ${isUser ? 'text-white border-white/20' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'} border-b`}>
                                        {processInline(h)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isUser ? 'divide-white/10' : 'divide-gray-100 dark:divide-gray-800'}`}>
                            {bodyRows.map((row, rIdx) => (
                                <tr key={rIdx} className={`${isUser ? 'hover:bg-white/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                                    {row.map((cell, cIdx) => (
                                        <td key={cIdx} className={`px-3 py-2 whitespace-nowrap ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {processInline(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
        tableBuffer = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('|')) {
            tableBuffer.push(line);
            continue;
        } else {
            flushTable(`tbl-${i}`);
        }

        if (line.startsWith('### ')) {
             nodes.push(<h3 key={i} className={`font-bold text-sm mt-3 mb-1 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{processInline(line.slice(4))}</h3>);
             continue;
        }
        if (line.startsWith('## ')) {
             nodes.push(<h2 key={i} className={`font-bold text-base mt-4 mb-2 ${isUser ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{processInline(line.slice(3))}</h2>);
             continue;
        }

        if (line.startsWith('- ') || line.startsWith('* ')) {
            nodes.push(
                <div key={i} className="flex items-start gap-2 mb-1 ml-1">
                    <div className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${isUser ? 'bg-white' : 'bg-gray-400'}`}></div>
                    <span className={isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>{processInline(line.slice(2))}</span>
                </div>
            );
            continue;
        }

        if (/^\d+\.\s/.test(line)) {
             nodes.push(
                <div key={i} className="flex items-start gap-2 mb-1 ml-1">
                    <span className={`font-bold text-xs mt-0.5 ${isUser ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>{line.split(' ')[0]}</span>
                    <span className={isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>{processInline(line.replace(/^\d+\.\s/, ''))}</span>
                </div>
            );
            continue;
        }

        if (!line) {
            nodes.push(<div key={i} className="h-2" />);
            continue;
        }

        nodes.push(<p key={i} className={`leading-relaxed mb-1 ${isUser ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{processInline(line)}</p>);
    }

    flushTable(`tbl-end`);

    return <div className="text-sm">{nodes}</div>;
};
