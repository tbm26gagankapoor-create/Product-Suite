/**
 * HTML-to-Markdown converter for clean GitHub-compatible markdown output.
 * Handles: headings, paragraphs, lists, tables, bold, italic, links, code, images, hr.
 * Strips Tailwind/CSS classes, style attributes, and wrapper divs.
 */

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  let md = html;

  // Remove <style> and <script> blocks entirely
  md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove HTML comments
  md = md.replace(/<!--[\s\S]*?-->/g, '');

  // --- Block-level conversions (order matters) ---

  // Headings h1-h6
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, inner) => `# ${inlineClean(inner)}\n\n`);
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, inner) => `## ${inlineClean(inner)}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, inner) => `### ${inlineClean(inner)}\n\n`);
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, inner) => `#### ${inlineClean(inner)}\n\n`);
  md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, (_, inner) => `##### ${inlineClean(inner)}\n\n`);
  md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, (_, inner) => `###### ${inlineClean(inner)}\n\n`);

  // Horizontal rules
  md = md.replace(/<hr\s*\/?>/gi, '\n---\n\n');

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const text = inlineClean(inner).trim();
    return text.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
  });

  // Mermaid blocks: <pre class="mermaid"><code>...</code></pre> → ```mermaid (strip inner code tag)
  md = md.replace(/<pre[^>]*class="[^"]*mermaid[^"]*"[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
    return `\`\`\`mermaid\n${cleanMermaidCode(code)}\n\`\`\`\n\n`;
  });

  // Mermaid blocks: <pre class="mermaid">...</pre> (no inner code tag)
  md = md.replace(/<pre[^>]*class="[^"]*mermaid[^"]*"[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return `\`\`\`mermaid\n${cleanMermaidCode(code)}\n\`\`\`\n\n`;
  });

  // Mermaid via code class: <pre><code class="mermaid|language-mermaid">...</code></pre>
  md = md.replace(/<pre[^>]*>\s*<code[^>]*class="[^"]*(?:language-)?mermaid[^"]*"[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
    return `\`\`\`mermaid\n${cleanMermaidCode(code)}\n\`\`\`\n\n`;
  });

  // Rendered mermaid SVG wrappers: <div data-mermaid-source="...">SVG</div> → ```mermaid
  // Uses nesting-aware matching because mermaid SVGs contain nested <div> via <foreignObject>
  md = replaceMermaidSvgWrappers(md);

  // Code blocks (pre > code) — generic, after mermaid-specific handlers
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code) => {
    const lang = '';
    const decoded = decodeEntities(code.trim());
    return `\`\`\`${lang}\n${decoded}\n\`\`\`\n\n`;
  });

  // Pre blocks without code
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    return `\`\`\`\n${decodeEntities(inner.trim())}\n\`\`\`\n\n`;
  });

  // Tables - convert to markdown tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableHtml) => {
    return convertTable(tableHtml);
  });

  // Ordered lists
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
    let idx = 0;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, li: string) => {
      idx++;
      return `${idx}. ${inlineClean(li).trim()}\n`;
    }) + '\n';
  });

  // Unordered lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m: string, li: string) => {
      return `- ${inlineClean(li).trim()}\n`;
    }) + '\n';
  });

  // Paragraphs
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `${inlineClean(inner).trim()}\n\n`);

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');

  // --- Inline conversions ---

  // Bold / strong
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => `**${inner.trim()}**`);

  // Italic / em
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, inner) => `*${inner.trim()}*`);

  // Inline code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, inner) => `\`${decodeEntities(inner.trim())}\``);

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const cleanText = inlineClean(text).trim();
    return `[${cleanText}](${href})`;
  });

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, src, alt) => `![${alt}](${src})`);
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, (_, src) => `![](${src})`);

  // Strip all remaining HTML tags (divs, spans, sections, etc.)
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = decodeEntities(md);

  // Clean up excessive whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim() + '\n';

  return md;
}

/** Convert an HTML table to a markdown table */
function convertTable(tableHtml: string): string {
  const rows: string[][] = [];

  // Extract all rows (thead + tbody + direct tr)
  const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const rowHtml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    for (const cellHtml of cellMatches) {
      const content = cellHtml.replace(/<[^>]+>/g, '').trim();
      cells.push(decodeEntities(content));
    }
    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return '';

  // Normalize column count
  const maxCols = Math.max(...rows.map(r => r.length));
  for (const row of rows) {
    while (row.length < maxCols) row.push('');
  }

  // Build markdown table
  const header = rows[0];
  const separator = header.map(() => '---');
  const body = rows.slice(1);

  let table = `| ${header.join(' | ')} |\n`;
  table += `| ${separator.join(' | ')} |\n`;
  for (const row of body) {
    table += `| ${row.join(' | ')} |\n`;
  }

  return table + '\n';
}

/**
 * Clean mermaid code extracted from HTML — strip contentEditable artifacts
 * (<br>, <div>, <span>, etc.) and decode entities so the result is pure mermaid syntax.
 */
function cleanMermaidCode(raw: string): string {
  let code = raw;
  // Convert <br> and </div><div> boundaries to newlines
  code = code.replace(/<br\s*\/?>/gi, '\n');
  code = code.replace(/<\/div>\s*<div[^>]*>/gi, '\n');
  // Strip all remaining HTML tags
  code = code.replace(/<[^>]+>/g, '');
  // Decode entities
  code = decodeEntities(code);
  return code.trim();
}

/** Clean inline HTML: strip tags but keep text */
function inlineClean(html: string): string {
  // Convert inline elements first
  let text = html;
  text = text.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  return decodeEntities(text);
}

/** Replace rendered mermaid SVG wrapper divs with ```mermaid fenced blocks.
 *  Counts <div> nesting so nested divs inside <foreignObject> don't break matching. */
function replaceMermaidSvgWrappers(md: string): string {
  const MARKER = 'data-mermaid-source="';
  let result = md;
  let searchFrom = 0;

  while (true) {
    const attrIdx = result.indexOf(MARKER, searchFrom);
    if (attrIdx === -1) break;

    const divOpen = result.lastIndexOf('<div', attrIdx);
    if (divOpen === -1) { searchFrom = attrIdx + MARKER.length; continue; }

    const encodedStart = attrIdx + MARKER.length;
    const encodedEnd = result.indexOf('"', encodedStart);
    if (encodedEnd === -1) { searchFrom = attrIdx + MARKER.length; continue; }
    const encoded = result.substring(encodedStart, encodedEnd);

    const tagClose = result.indexOf('>', encodedEnd);
    if (tagClose === -1) { searchFrom = attrIdx + MARKER.length; continue; }

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
        pos = nextClose + 6;
      }
    }

    const decoded = decodeEntities(decodeURIComponent(encoded).trim());
    const replacement = `\`\`\`mermaid\n${decoded}\n\`\`\`\n\n`;
    result = result.substring(0, divOpen) + replacement + result.substring(pos);
    searchFrom = divOpen + replacement.length;
  }

  return result;
}

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&trade;/g, '\u2122')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&bull;/g, '\u2022')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&larr;/g, '\u2190')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}
