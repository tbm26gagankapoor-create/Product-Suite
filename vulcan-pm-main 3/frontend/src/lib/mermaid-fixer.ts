/**
 * Mermaid code sanitizer — fixes common AI-generated syntax issues.
 *
 * AI models frequently produce mermaid that fails to render due to:
 *  - HTML entities left from pipeline processing
 *  - Typographic characters (smart quotes, em/en dashes, ellipsis)
 *  - Markdown bold/italic/code formatting inside diagram blocks
 *  - Unquoted labels containing characters that clash with mermaid syntax
 *  - Browser-injected HTML tags (<br>, <div>) from contentEditable
 *  - Accidental code-fence wrappers leaked into the code string
 *  - Invisible Unicode (BOM, zero-width chars, NBSP)
 *
 * Call `fixMermaidCode(raw)` before passing code to `mermaid.render()`.
 */

// ─── Public API ──────────────────────────────────────────────────────

export function fixMermaidCode(raw: string): string {
  let code = raw.trim();
  if (!code) return code;

  // Phase 1 — Strip wrapping artefacts
  code = stripCodeFences(code);
  code = stripHtmlTags(code);

  // Phase 2 — Character-level normalisation
  code = decodeHtmlEntities(code);
  code = normaliseTypography(code);
  code = stripInvisible(code);

  // Phase 3 — Remove leaked markdown formatting
  code = stripMarkdownFormatting(code);

  // Phase 4 — Diagram-specific fixes
  const diagramType = detectDiagram(code);
  switch (diagramType) {
    case 'flowchart':
      code = fixFlowchart(code);
      break;
    case 'sequence':
      code = fixSequenceDiagram(code);
      break;
    case 'er':
      code = fixErDiagram(code);
      break;
    case 'gantt':
      code = fixGantt(code);
      break;
    case 'pie':
      code = fixPie(code);
      break;
    case 'classDiagram':
      code = fixClassDiagram(code);
      break;
    case 'stateDiagram':
      code = fixStateDiagram(code);
      break;
    case 'mindmap':
      code = fixMindmap(code);
      break;
    // timeline, gitgraph, sankey etc. — generic cleanup only
  }

  // Phase 5 — Final whitespace cleanup
  code = code.replace(/\n{3,}/g, '\n\n');   // collapse 3+ blank lines
  code = code.replace(/[ \t]+$/gm, '');      // trailing whitespace per line
  return code.trim();
}

// ─── Phase 1: Wrapping artefacts ─────────────────────────────────────

/** Strip markdown code fences accidentally included in the string */
function stripCodeFences(code: string): string {
  // Opening fence (with optional language tag)
  code = code.replace(/^```(?:mermaid|md|markdown)?\s*\n?/i, '');
  // Closing fence
  code = code.replace(/\n?```\s*$/, '');
  return code;
}

/** Strip HTML tags injected by contentEditable or HTML pipeline */
function stripHtmlTags(code: string): string {
  // Replace <br> variants with newline
  code = code.replace(/<br\s*\/?>/gi, '\n');
  // Replace </div><div> boundaries with newline (contentEditable line wraps)
  code = code.replace(/<\/div>\s*<div[^>]*>/gi, '\n');
  // Strip all remaining HTML tags
  code = code.replace(/<[^>]+>/g, '');
  return code;
}

// ─── Phase 2: Character normalisation ────────────────────────────────

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '--')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&bull;/g, '*')
    .replace(/&rarr;/g, '-->')
    .replace(/&larr;/g, '<--')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

function normaliseTypography(text: string): string {
  return text
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')  // smart double quotes
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")   // smart single quotes
    .replace(/\u2014/g, '--')                              // em dash
    .replace(/\u2013/g, '-')                               // en dash
    .replace(/\u2026/g, '...')                             // ellipsis
    .replace(/\u00A0/g, ' ');                              // NBSP
}

function stripInvisible(text: string): string {
  return text
    .replace(/\uFEFF/g, '')    // BOM
    .replace(/\u200B/g, '')    // zero-width space
    .replace(/\u200C/g, '')    // zero-width non-joiner
    .replace(/\u200D/g, '')    // zero-width joiner
    .replace(/\u2060/g, '')    // word joiner
    .replace(/\r\n/g, '\n')   // Windows line endings
    .replace(/\r/g, '\n');     // Old Mac line endings
}

// ─── Phase 3: Markdown formatting ────────────────────────────────────

function stripMarkdownFormatting(code: string): string {
  // Bold: **text** or __text__
  code = code.replace(/\*\*(.+?)\*\*/g, '$1');
  code = code.replace(/__(.+?)__/g, '$1');
  // Inline code: `text` (but not triple backticks, already handled)
  code = code.replace(/`([^`]+)`/g, '$1');
  // Markdown links: [text](url) → text
  code = code.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Markdown images: ![alt](url) → alt
  code = code.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  return code;
}

// ─── Diagram detection ───────────────────────────────────────────────

type DiagramType =
  | 'flowchart' | 'sequence' | 'er' | 'gantt' | 'pie'
  | 'classDiagram' | 'stateDiagram' | 'mindmap' | 'timeline'
  | 'gitgraph' | 'other';

function detectDiagram(code: string): DiagramType {
  const first = code.split('\n')[0].trim();
  if (/^(?:flowchart|graph)\s/i.test(first)) return 'flowchart';
  if (/^sequenceDiagram/i.test(first)) return 'sequence';
  if (/^erDiagram/i.test(first)) return 'er';
  if (/^gantt/i.test(first)) return 'gantt';
  if (/^pie/i.test(first)) return 'pie';
  if (/^classDiagram/i.test(first)) return 'classDiagram';
  if (/^stateDiagram/i.test(first)) return 'stateDiagram';
  if (/^mindmap/i.test(first)) return 'mindmap';
  if (/^timeline/i.test(first)) return 'timeline';
  if (/^gitgraph/i.test(first)) return 'gitgraph';
  return 'other';
}

// ─── Phase 4a: Flowchart / Graph ─────────────────────────────────────

/**
 * Characters inside a flowchart label that will break parsing
 * unless the label is wrapped in double-quotes.
 *
 * ()  — conflicts with rounded-rect shape syntax
 * {}  — conflicts with diamond shape syntax
 * []  — conflicts with rect shape syntax (nested)
 * <>  — conflicts with asymmetric shape / HTML
 * |   — conflicts with edge labels  A -->|text| B
 * #   — hex-color prefix / comment-like
 * &   — entity/join operator
 * ;   — statement terminator
 */
const FLOW_DANGEROUS = /[(){}|<>#&;]/;

/** Skip lines that are mermaid directives, not node/edge definitions */
function isFlowDirective(trimmed: string): boolean {
  return (
    !trimmed ||
    trimmed.startsWith('%%') ||
    trimmed.startsWith(':::') ||
    /^(style\s|classDef\s|class\s|click\s|linkStyle\s|direction\s)/.test(trimmed) ||
    /^subgraph\s/.test(trimmed) ||
    trimmed === 'end'
  );
}

function fixFlowchart(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line; // diagram declaration
    const trimmed = line.trim();
    if (isFlowDirective(trimmed)) {
      // Fix subgraph labels — quote if unquoted with special chars
      if (/^subgraph\s/.test(trimmed)) {
        return fixSubgraphLabel(line);
      }
      return line;
    }

    line = quoteFlowLabels(line);
    line = fixFlowArrows(line);
    return line;
  }).join('\n');
}

/** Quote node labels that contain dangerous characters */
function quoteFlowLabels(line: string): string {
  // Square bracket labels: id[text] → id["text"]
  // Skip already-quoted id["text"] and double-bracket id[[text]]
  line = line.replace(
    /(\b[a-zA-Z_][\w]*)\[(?!\[)(?!")([^\]]+)\]/g,
    (m, id, label) => FLOW_DANGEROUS.test(label) ? `${id}["${escLabel(label)}"]` : m
  );

  // Round bracket labels: id(text) → id("text")
  // Skip double-paren id((text)) and already-quoted id("text")
  line = line.replace(
    /(\b[a-zA-Z_][\w]*)\((?!\()(?!")([^)]+)\)(?!\))/g,
    (m, id, label) => FLOW_DANGEROUS.test(label) ? `${id}("${escLabel(label)}")` : m
  );

  // Curly bracket labels: id{text} → id{"text"}
  line = line.replace(
    /(\b[a-zA-Z_][\w]*)\{(?!")([^}]+)\}/g,
    (m, id, label) => FLOW_DANGEROUS.test(label) ? `${id}{"${escLabel(label)}"}` : m
  );

  // Double-bracket labels: id[[text]] → id[["text"]]
  line = line.replace(
    /(\b[a-zA-Z_][\w]*)\[\[(?!")([^\]]+)\]\]/g,
    (m, id, label) => FLOW_DANGEROUS.test(label) ? `${id}[["${escLabel(label)}"]]` : m
  );

  // Double-paren labels: id((text)) → id(("text"))
  line = line.replace(
    /(\b[a-zA-Z_][\w]*)\(\((?!")([^)]+)\)\)/g,
    (m, id, label) => FLOW_DANGEROUS.test(label) ? `${id}(("${escLabel(label)}"))` : m
  );

  return line;
}

/** Escape quotes inside a label that we're about to wrap in double-quotes */
function escLabel(label: string): string {
  // If the label already contains double quotes, escape them
  return label.replace(/"/g, "'");
}

/** Fix subgraph labels: subgraph My Group → subgraph "My Group" if special chars */
function fixSubgraphLabel(line: string): string {
  return line.replace(
    /^(\s*subgraph\s+)(?!")(.+)$/,
    (m, prefix, label) => {
      const trimLabel = label.trim();
      if (FLOW_DANGEROUS.test(trimLabel) || /\s/.test(trimLabel)) {
        return `${prefix}"${escLabel(trimLabel)}"`;
      }
      return m;
    }
  );
}

/** Fix common arrow issues in flowcharts */
function fixFlowArrows(line: string): string {
  // Fix smart-quote arrows: A –> B → A --> B  (en-dash to --)
  // Already handled by normaliseTypography, but catch remnants
  line = line.replace(/\s+–>\s+/g, ' --> ');
  line = line.replace(/\s+—>\s+/g, ' --> ');

  // Fix edge labels with unescaped pipes: A -->|text with|pipe| B
  // This is tricky — mermaid expects exactly A -->|label| B
  // We can't easily fix arbitrary pipe usage, but we can fix missing spaces
  line = line.replace(/(-->|---|-\.->|==>)\|([^|]*)\|(\w)/g, '$1|$2| $3');

  return line;
}

// ─── Phase 4b: Sequence Diagram ──────────────────────────────────────

function fixSequenceDiagram(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Fix participant/actor aliases with special chars
    // participant A as "Long Name" is the valid syntax
    line = fixParticipantAlias(line);

    // Fix message arrows missing the colon separator
    // A->>B Message → A->>B: Message
    line = fixSequenceArrowColon(line);

    // Fix note syntax — must be: Note right of A: text  or  Note over A,B: text
    line = fixSequenceNote(line);

    return line;
  }).join('\n');
}

function fixParticipantAlias(line: string): string {
  // participant LongName as Friendly Name → participant LongName as "Friendly Name"
  return line.replace(
    /^(\s*(?:participant|actor)\s+\S+\s+as\s+)(?!")(.+)$/i,
    (m, prefix, alias) => {
      const trimAlias = alias.trim();
      if (/[(){}|<>#&;:,]/.test(trimAlias)) {
        return `${prefix}"${trimAlias}"`;
      }
      return m;
    }
  );
}

function fixSequenceArrowColon(line: string): string {
  // Match arrow patterns: ->>, -->, ->, -->>, -x, --x, -)
  // If followed by a word without a colon, insert colon
  return line.replace(
    /^(\s*\S+\s*)(--?>?>|--?x|--?\)|--?>>?)(\s*)(\S+)(\s+)(?!:)([A-Z])/,
    (m, pre, arrow, sp1, target, sp2, msgStart) => {
      return `${pre}${arrow}${sp1}${target}:${sp2}${msgStart}`;
    }
  );
}

function fixSequenceNote(line: string): string {
  // Note right of A Text → Note right of A: Text
  return line.replace(
    /^(\s*Note\s+(?:right|left)\s+of\s+\S+)\s+(?!:)(\S)/i,
    '$1: $2'
  );
}

// ─── Phase 4c: ER Diagram ────────────────────────────────────────────

function fixErDiagram(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Fix entity names with spaces: User Account → User_Account
    // Relationship lines: ENTITY1 ||--o{ ENTITY2 : relationship
    line = line.replace(
      /^(\s*)([A-Z][\w]*)\s+([A-Z][\w]*)\s+(\|)/i,
      (m, indent, word1, word2, pipe) => {
        // Two words before a pipe — likely entity name with space
        return `${indent}${word1}_${word2} ${pipe}`;
      }
    );

    // Fix missing relationship label: A ||--o{ B → A ||--o{ B : ""
    // This is hard to detect reliably, so skip

    // Fix field type capitalization issues (minor)
    // string, int, date are valid — no changes needed

    return line;
  }).join('\n');
}

// ─── Phase 4d: Gantt ─────────────────────────────────────────────────

function fixGantt(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Fix date format directives
    // dateFormat must be exact: YYYY-MM-DD etc.
    // No fix needed for valid directives

    // Fix task lines: task name : done, id, date, duration
    // Common issue: missing comma between fields
    // e.g. "Task : active a1 2024-01-01, 30d" → "Task : active, a1, 2024-01-01, 30d"
    if (trimmed.includes(':') && !trimmed.startsWith('section') &&
        !trimmed.startsWith('dateFormat') && !trimmed.startsWith('title') &&
        !trimmed.startsWith('axisFormat') && !trimmed.startsWith('excludes') &&
        !trimmed.startsWith('todayMarker') && !trimmed.startsWith('tickInterval')) {
      line = fixGanttTask(line);
    }

    return line;
  }).join('\n');
}

function fixGanttTask(line: string): string {
  // Split at first colon to get task name and metadata
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return line;

  const name = line.substring(0, colonIdx);
  let meta = line.substring(colonIdx + 1).trim();

  // If metadata doesn't contain commas but has multiple space-separated tokens
  // that look like gantt fields, add commas
  if (!meta.includes(',') && meta.split(/\s+/).length > 1) {
    const tokens = meta.split(/\s+/);
    // Valid status keywords
    const statuses = ['done', 'active', 'crit', 'milestone'];
    const parts: string[] = [];
    let current = '';

    for (const token of tokens) {
      if (statuses.includes(token.toLowerCase()) || /^\d{4}-\d{2}-\d{2}$/.test(token) ||
          /^\d+[dwmy]$/.test(token) || /^after\s/.test(token) || /^[a-z]\w*$/i.test(token)) {
        if (current) parts.push(current.trim());
        current = token;
      } else {
        current += ' ' + token;
      }
    }
    if (current) parts.push(current.trim());

    if (parts.length > 1) {
      meta = parts.join(', ');
    }
  }

  return `${name}: ${meta}`;
}

// ─── Phase 4e: Pie Chart ─────────────────────────────────────────────

function fixPie(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%') || trimmed.startsWith('title') ||
        trimmed.startsWith('showData')) return line;

    // Fix unquoted labels: Category Name : 45 → "Category Name" : 45
    const match = trimmed.match(/^([^":]+?)\s*:\s*(\d+(?:\.\d+)?)\s*$/);
    if (match) {
      const label = match[1].trim();
      const value = match[2];
      if (!label.startsWith('"')) {
        const indent = line.match(/^(\s*)/)?.[1] || '    ';
        return `${indent}"${label}" : ${value}`;
      }
    }

    return line;
  }).join('\n');
}

// ─── Phase 4f: Class Diagram ─────────────────────────────────────────

function fixClassDiagram(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Fix class names with spaces: class User Account → class User_Account
    line = line.replace(
      /^(\s*class\s+)([A-Z][\w]*)\s+([A-Z][\w]*)/i,
      '$1$2_$3'
    );

    // Fix method signatures with spaces in types
    // +getUserById(int id) String → already valid in mermaid
    // No significant fixes needed for well-formed class diagrams

    return line;
  }).join('\n');
}

// ─── Phase 4g: State Diagram ─────────────────────────────────────────

function fixStateDiagram(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Fix state names with spaces: state "Idle State" as idle
    // If a state transition has spaces in state name: Idle State --> Running
    // → Idle_State --> Running
    line = line.replace(
      /^(\s*)([A-Z][\w]*)\s+([A-Z][\w]*)(\s*-->)/,
      '$1$2_$3$4'
    );
    line = line.replace(
      /(-->\s*)([A-Z][\w]*)\s+([A-Z][\w]*)\s*$/,
      (m, arrow, w1, w2) => `${arrow}${w1}_${w2}`
    );

    // Fix transition labels: A --> B : label text (colon must be present)
    // Common AI mistake: A --> B label → A --> B : label
    line = line.replace(
      /^(\s*\S+\s*-->\s*\S+)\s+(?!:)([A-Z])/,
      '$1 : $2'
    );

    return line;
  }).join('\n');
}

// ─── Phase 4h: Mindmap ──────────────────────────────────────────────

function fixMindmap(code: string): string {
  const lines = code.split('\n');

  return lines.map((line, i) => {
    if (i === 0) return line;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('%%')) return line;

    // Mindmap uses indentation-based structure
    // Fix labels with special chars — wrap in parentheses or brackets
    // e.g. "  User (Admin)" → "  (User Admin)" or use proper syntax
    // Mindmap node shapes: () round, [] square, (()) cloud, {{}} bang, ))..((
    // If no shape specified and label has special chars, wrap in ()
    const indent = line.match(/^(\s*)/)?.[1] || '';
    if (trimmed && !trimmed.startsWith('%%') && i > 0) {
      // If the text isn't wrapped in any shape delimiter and has parens/brackets
      if (!/^[(\[{]/.test(trimmed) && /[(){}[\]|<>]/.test(trimmed)) {
        // Escape the problematic chars or wrap entire label
        const cleaned = trimmed.replace(/[(){}[\]|<>]/g, ' ').replace(/\s{2,}/g, ' ').trim();
        return `${indent}${cleaned}`;
      }
    }

    return line;
  }).join('\n');
}
