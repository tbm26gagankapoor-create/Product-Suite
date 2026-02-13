import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useTheme } from '../context/ThemeContext';
import { fixMermaidCode } from '../lib/mermaid-fixer';

let mermaidIdCounter = 0;
let lastMermaidTheme: string | null = null;

/** Serialised render queue — prevents concurrent mermaid.render() calls that race with initialize(). */
let renderQueue: Promise<void> = Promise.resolve();

function enqueueMermaidRender(
  id: string,
  code: string,
  isDark: boolean
): Promise<string> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue.then(async () => {
      const theme = isDark ? 'dark' : 'default';
      if (lastMermaidTheme !== theme) {
        mermaid.initialize({
          startOnLoad: false,
          theme,
          securityLevel: 'loose',
        });
        lastMermaidTheme = theme;
      }
      try {
        const { svg } = await mermaid.render(id, code);
        resolve(svg);
      } catch (err) {
        reject(err);
      }
    });
  });
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/** Inline mermaid diagram renderer — renders a single fenced mermaid block to SVG. */
const MermaidBlock: React.FC<{ code: string; isDark: boolean }> = ({ code, isDark }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !code.trim()) return;

    let cancelled = false;
    const id = `md-mermaid-${++mermaidIdCounter}`;

    enqueueMermaidRender(id, code.trim(), isDark)
      .then((svg) => {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.warn('[mermaid] render failed:', err);
          setError(String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  if (error) {
    return (
      <pre className="border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap my-4">
        {code}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      data-mermaid-source={code}
      className="my-6 flex justify-center overflow-x-auto"
    />
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const renderCode = useCallback(
    (props: any) => {
      const { children, className: codeClassName, node, ...rest } = props;
      const match = /language-(\w+)/.exec(codeClassName || '');
      const lang = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      if (lang === 'mermaid') {
        return <MermaidBlock code={fixMermaidCode(codeString)} isDark={isDark} />;
      }

      // Inline code (no language)
      if (!match) {
        return (
          <code className="bg-gray-100 dark:bg-[#1F2128] px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
            {children}
          </code>
        );
      }

      // Fenced code block (non-mermaid)
      return (
        <pre className="bg-gray-50 dark:bg-[#15171E] border border-gray-200 dark:border-[#2D2F36] rounded-lg p-4 overflow-x-auto my-4">
          <code className={`text-sm font-mono ${codeClassName || ''}`} {...rest}>
            {children}
          </code>
        </pre>
      );
    },
    [isDark]
  );

  return (
    <div className={className || 'prose prose-lg prose-slate dark:prose-invert max-w-none'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: renderCode,
          // Prevent wrapping code blocks in extra <pre>
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-left border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-gray-50 dark:bg-[#1F2128] text-xs uppercase tracking-wider text-gray-500 font-bold p-3 border-b border-gray-200 dark:border-[#2D2F36]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-3 border-b border-gray-100 dark:border-[#2D2F36] text-sm">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 text-gray-600 dark:text-gray-300 italic">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
