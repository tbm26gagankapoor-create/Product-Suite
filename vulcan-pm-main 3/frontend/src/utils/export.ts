import { Task, Sprint, Project } from '../types';

// CSV Export
export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, item: T) => string;
}

/**
 * Convert data to CSV string
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  // Header row
  const header = columns.map((col) => `"${col.header}"`).join(',');

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let value: any;

        // Handle nested keys (e.g., 'assignee.name')
        if (typeof col.key === 'string' && col.key.includes('.')) {
          const keys = col.key.split('.');
          value = keys.reduce((obj, key) => obj?.[key], item);
        } else {
          value = item[col.key as keyof T];
        }

        // Apply formatter if provided
        if (col.formatter) {
          value = col.formatter(value, item);
        }

        // Handle different types
        if (value === null || value === undefined) {
          return '""';
        }
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape quotes and wrap in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export tasks to CSV
 */
export function exportTasksToCSV(tasks: Task[], filename = 'tasks'): void {
  const columns: ExportColumn<Task>[] = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Title' },
    { key: 'type', header: 'Type' },
    { key: 'columnId', header: 'Status' },
    { key: 'priority', header: 'Priority' },
    { key: 'points', header: 'Points' },
    {
      key: 'assignee.name',
      header: 'Assignee',
      formatter: (_, task) => task.assignee?.name || 'Unassigned',
    },
    {
      key: 'reporter.name',
      header: 'Reporter',
      formatter: (_, task) => task.reporter?.name || 'Unknown',
    },
    { key: 'sprintId', header: 'Sprint ID' },
    {
      key: 'dueDate',
      header: 'Due Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      key: 'tags',
      header: 'Tags',
      formatter: (value) => (value?.map((t: any) => t.label).join(', ') || ''),
    },
    {
      key: 'description',
      header: 'Description',
      formatter: (value) => (value ? value.replace(/<[^>]*>/g, '').substring(0, 500) : ''),
    },
  ];

  const csv = toCSV(tasks, columns);
  downloadCSV(csv, filename);
}

/**
 * Export sprints to CSV
 */
export function exportSprintsToCSV(sprints: Sprint[], filename = 'sprints'): void {
  const columns: ExportColumn<Sprint>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
    { key: 'goal', header: 'Goal' },
    {
      key: 'startDate',
      header: 'Start Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      key: 'endDate',
      header: 'End Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    { key: 'projectId', header: 'Project ID' },
  ];

  const csv = toCSV(sprints, columns);
  downloadCSV(csv, filename);
}

/**
 * Export projects to CSV
 */
export function exportProjectsToCSV(projects: Project[], filename = 'projects'): void {
  const columns: ExportColumn<Project>[] = [
    { key: 'id', header: 'ID' },
    { key: 'key', header: 'Key' },
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status' },
    {
      key: 'startDate',
      header: 'Start Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      formatter: (value) => (value ? new Date(value).toLocaleDateString() : ''),
    },
    {
      key: 'members',
      header: 'Members',
      formatter: (value) => (value?.length || 0).toString(),
    },
    { key: 'ownerId', header: 'Owner ID' },
  ];

  const csv = toCSV(projects, columns);
  downloadCSV(csv, filename);
}

// PDF Export using browser print
/**
 * Generate printable HTML for tasks
 */
export function generateTasksPrintHTML(tasks: Task[], title = 'Tasks'): string {
  const rows = tasks
    .map(
      (task) => `
      <tr>
        <td>${task.id}</td>
        <td>${task.title}</td>
        <td><span class="badge ${task.type}">${task.type}</span></td>
        <td><span class="status ${task.columnId}">${task.columnId}</span></td>
        <td><span class="priority ${task.priority}">${task.priority}</span></td>
        <td>${task.assignee?.name || 'Unassigned'}</td>
        <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 8px;
        }
        .meta {
          color: #666;
          font-size: 12px;
          margin-bottom: 24px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          text-align: left;
          padding: 12px 8px;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          color: #6b7280;
        }
        td {
          padding: 12px 8px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge.epic { background: #f3e8ff; color: #7c3aed; }
        .badge.feature { background: #fce7f3; color: #db2777; }
        .badge.bug { background: #fee2e2; color: #dc2626; }
        .badge.task { background: #dbeafe; color: #2563eb; }
        .badge.story { background: #d1fae5; color: #059669; }
        .status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .status.todo { background: #f3f4f6; color: #6b7280; }
        .status.inprogress { background: #dbeafe; color: #2563eb; }
        .status.done { background: #d1fae5; color: #059669; }
        .status.blocked { background: #fee2e2; color: #dc2626; }
        .priority {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .priority.HIGH { background: #fee2e2; color: #dc2626; }
        .priority.MEDIUM { background: #fef3c7; color: #d97706; }
        .priority.LOW { background: #dbeafe; color: #2563eb; }
        @media print {
          body { padding: 20px; }
          @page { margin: 1cm; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Generated on ${new Date().toLocaleString()} • ${tasks.length} items</p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Type</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Assignee</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Export tasks to PDF (via print dialog)
 */
export function exportTasksToPDF(tasks: Task[], title = 'Tasks'): void {
  const html = generateTasksPrintHTML(tasks, title);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Generate printable HTML for sprints
 */
export function generateSprintsPrintHTML(sprints: Sprint[], title = 'Sprints'): string {
  const rows = sprints
    .map(
      (sprint) => `
      <tr>
        <td>${sprint.name}</td>
        <td><span class="status ${sprint.status}">${sprint.status}</span></td>
        <td>${sprint.goal || '-'}</td>
        <td>${new Date(sprint.startDate).toLocaleDateString()}</td>
        <td>${new Date(sprint.endDate).toLocaleDateString()}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #333;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th {
          text-align: left;
          padding: 12px 8px;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
          color: #6b7280;
        }
        td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
        .status {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
        }
        .status.planned { background: #f3f4f6; color: #6b7280; }
        .status.active { background: #dbeafe; color: #2563eb; }
        .status.completed { background: #d1fae5; color: #059669; }
        @media print { body { padding: 20px; } @page { margin: 1cm; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Generated on ${new Date().toLocaleString()} • ${sprints.length} sprints</p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Goal</th>
            <th>Start Date</th>
            <th>End Date</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Export sprints to PDF
 */
export function exportSprintsToPDF(sprints: Sprint[], title = 'Sprints'): void {
  const html = generateSprintsPrintHTML(sprints, title);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// JSON Export
/**
 * Export data as JSON file
 */
export function exportToJSON<T>(data: T[], filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// Export Menu Component Types
export type ExportFormat = 'csv' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  title?: string;
}
