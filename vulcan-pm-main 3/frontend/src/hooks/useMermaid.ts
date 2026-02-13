import mermaid from 'mermaid';
import { fixMermaidCode } from '../lib/mermaid-fixer';

let mermaidIdCounter = 0;
let lastTheme: string | null = null;

/** Keywords that signal the start of a valid mermaid diagram. */
const MERMAID_KEYWORDS = [
  'flowchart ',  'flowchart\n',
  'graph ',      'graph\n',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'gantt',
  'pie',
  'gitgraph',
  'mindmap',
  'timeline',
  'sankey',
  'block-beta',
  'architecture',
  'journey',
  'quadrantChart',
  'xychart-beta',
  'requirementDiagram',
  'C4Context',
  'C4Container',
  'C4Component',
  'C4Dynamic',
  'C4Deployment',
  'packet-beta',
  'kanban',
  'zenuml',
];

function looksLikeMermaid(text: string): boolean {
  const t = text.trim();
  return MERMAID_KEYWORDS.some(kw => t.startsWith(kw));
}

/**
 * Extract clean mermaid code from an element.
 * Uses innerText (respects visual line breaks from <br> / block elements
 * that contentEditable may insert) then falls back to textContent.
 */
function extractCode(el: HTMLElement): string {
  return (el.innerText || el.textContent || '').trim();
}

/**
 * Normalise every AI-generated mermaid variant into `<pre class="mermaid">`.
 *
 * Explicit class matches:
 *   <pre class="language-mermaid">
 *   <pre><code class="mermaid|language-mermaid">
 *   <code class="mermaid|language-mermaid">  (bare)
 *
 * Keyword-based fallback (catches bare <pre> / <code> without class):
 *   Any <pre> or <code> whose text starts with a known mermaid keyword.
 */
function normaliseMermaidBlocks(container: HTMLElement): void {
  // --- Explicit class variants ---

  // 1. <pre class="language-mermaid"> → <pre class="mermaid">
  container
    .querySelectorAll<HTMLPreElement>('pre.language-mermaid:not([data-mermaid-processed])')
    .forEach(el => {
      el.classList.remove('language-mermaid');
      el.classList.add('mermaid');
    });

  // 2. <pre><code class="mermaid|language-mermaid"> → unwrap into pre.mermaid
  container
    .querySelectorAll<HTMLElement>(
      'pre:not([data-mermaid-processed]) > code.mermaid, pre:not([data-mermaid-processed]) > code.language-mermaid'
    )
    .forEach(code => {
      const pre = code.parentElement as HTMLPreElement;
      pre.textContent = code.textContent;
      pre.classList.add('mermaid');
    });

  // 3. Bare <code class="mermaid|language-mermaid"> (no <pre> parent)
  container
    .querySelectorAll<HTMLElement>(
      'code.mermaid:not([data-mermaid-processed]), code.language-mermaid:not([data-mermaid-processed])'
    )
    .forEach(code => {
      if (code.parentElement?.tagName === 'PRE') return;
      const pre = document.createElement('pre');
      pre.className = 'mermaid';
      pre.textContent = code.textContent;
      code.replaceWith(pre);
    });

  // --- Keyword-based fallback ---

  // 4. <pre> or <code> WITHOUT any mermaid class but containing mermaid syntax
  container
    .querySelectorAll<HTMLElement>(
      'pre:not(.mermaid):not([data-mermaid-processed]), code:not(.mermaid):not([data-mermaid-processed])'
    )
    .forEach(el => {
      const text = extractCode(el);
      if (!looksLikeMermaid(text)) return;

      if (el.tagName === 'CODE' && el.parentElement?.tagName === 'PRE') {
        const pre = el.parentElement as HTMLPreElement;
        if (pre.getAttribute('data-mermaid-processed')) return;
        pre.textContent = text;
        pre.classList.add('mermaid');
      } else if (el.tagName === 'CODE') {
        const pre = document.createElement('pre');
        pre.className = 'mermaid';
        pre.textContent = text;
        el.replaceWith(pre);
      } else {
        // <pre> without class — just tag it
        el.textContent = text;
        el.classList.add('mermaid');
      }
    });
}

/**
 * Renders all unprocessed mermaid blocks inside a container into inline SVG
 * diagrams.  Normalises AI markup variations first, then renders each block.
 */
export async function renderMermaidDiagrams(
  container: HTMLElement | null,
  isDark: boolean
): Promise<void> {
  if (!container) return;

  const theme = isDark ? 'dark' : 'default';
  if (lastTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
    });
    lastTheme = theme;
  }

  normaliseMermaidBlocks(container);

  const blocks = container.querySelectorAll<HTMLPreElement>(
    'pre.mermaid:not([data-mermaid-processed])'
  );

  for (const block of Array.from(blocks)) {
    const rawCode = extractCode(block);
    if (!rawCode) continue;

    const code = fixMermaidCode(rawCode);
    const id = `mermaid-${++mermaidIdCounter}`;

    try {
      const { svg } = await mermaid.render(id, code);
      const wrapper = document.createElement('div');
      wrapper.setAttribute('contenteditable', 'false');
      wrapper.setAttribute('data-mermaid-processed', 'true');
      wrapper.setAttribute('data-mermaid-source', encodeURIComponent(code));
      wrapper.className =
        'mermaid-diagram-wrapper my-6 flex justify-center overflow-x-auto';
      wrapper.innerHTML = svg;
      block.replaceWith(wrapper);
    } catch (err) {
      console.warn('[mermaid] render failed for block:', code.substring(0, 80), err);
      block.setAttribute('data-mermaid-processed', 'error');
      block.classList.add(
        'border', 'border-red-300', 'dark:border-red-700',
        'bg-red-50', 'dark:bg-red-900/20',
        'rounded-lg', 'p-4', 'text-xs',
        'text-red-600', 'dark:text-red-400',
        'whitespace-pre-wrap'
      );
    }
  }
}

/**
 * Restore mermaid source blocks from rendered SVG wrappers.
 * Call this before persisting HTML (draft sync, project creation, document save)
 * so the original mermaid code is preserved rather than opaque SVG blobs.
 *
 * Uses nesting-aware div matching because mermaid SVGs may contain nested
 * <div> elements inside <foreignObject> (for rich text labels).
 */
export function restoreMermaidSources(html: string): string {
  const MARKER = 'data-mermaid-source="';
  let result = html;
  let searchFrom = 0;

  while (true) {
    const attrIdx = result.indexOf(MARKER, searchFrom);
    if (attrIdx === -1) break;

    // Walk back to the opening <div
    const divOpen = result.lastIndexOf('<div', attrIdx);
    if (divOpen === -1) { searchFrom = attrIdx + MARKER.length; continue; }

    // Extract the encoded source value
    const encodedStart = attrIdx + MARKER.length;
    const encodedEnd = result.indexOf('"', encodedStart);
    if (encodedEnd === -1) { searchFrom = attrIdx + MARKER.length; continue; }
    const encoded = result.substring(encodedStart, encodedEnd);

    // Find end of the opening tag
    const tagClose = result.indexOf('>', encodedEnd);
    if (tagClose === -1) { searchFrom = attrIdx + MARKER.length; continue; }

    // Count nested divs to find the correct closing </div>
    let depth = 1;
    let pos = tagClose + 1;
    while (depth > 0 && pos < result.length) {
      const nextOpen = result.indexOf('<div', pos);
      const nextClose = result.indexOf('</div>', pos);
      if (nextClose === -1) break;

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        pos = nextOpen + 4;
      } else {
        depth--;
        pos = nextClose + 6; // length of '</div>'
      }
    }

    const replacement = `<pre class="mermaid">${decodeURIComponent(encoded)}</pre>`;
    result = result.substring(0, divOpen) + replacement + result.substring(pos);
    searchFrom = divOpen + replacement.length;
  }

  return result;
}

/**
 * Schedule a mermaid render pass after React has flushed the DOM.
 * Uses requestAnimationFrame to run after paint.
 * Returns a cancel function for cleanup.
 */
export function scheduleMermaidRender(
  container: HTMLElement | null,
  isDark: boolean
): () => void {
  let cancelled = false;
  requestAnimationFrame(() => {
    if (cancelled) return;
    renderMermaidDiagrams(container, isDark);
  });
  return () => { cancelled = true; };
}
