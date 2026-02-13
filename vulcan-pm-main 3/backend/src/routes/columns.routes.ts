import { Router } from 'express';
import { columnsService } from '../services/columns.service.js';

const router = Router();

// Get all columns (optionally filtered by project)
router.get('/', (req, res) => {
  const projectId = req.query.project_id as string | undefined;
  const columns = columnsService.getAll(projectId);
  res.json({ success: true, data: columns });
});

// Get column by ID
router.get('/:id', (req, res) => {
  const column = columnsService.getById(req.params.id);
  if (!column) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }
  res.json({ success: true, data: column });
});

// Create column
router.post('/', (req, res) => {
  const { project_id, title, color, is_default } = req.body;

  if (!project_id || !title) {
    return res.status(400).json({
      success: false,
      error: 'project_id and title are required',
    });
  }

  const column = columnsService.create({ project_id, title, color, is_default });
  res.status(201).json({ success: true, data: column });
});

// Update column
router.patch('/:id', (req, res) => {
  const column = columnsService.update(req.params.id, req.body);
  if (!column) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }
  res.json({ success: true, data: column });
});

// Reorder columns
router.post('/reorder', (req, res) => {
  const { project_id, column_ids } = req.body;

  if (!project_id || !column_ids || !Array.isArray(column_ids)) {
    return res.status(400).json({
      success: false,
      error: 'project_id and column_ids array are required',
    });
  }

  const columns = columnsService.reorder(project_id, column_ids);
  res.json({ success: true, data: columns });
});

// Delete column
router.delete('/:id', (req, res) => {
  const deleted = columnsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Column not found' });
  }
  res.json({ success: true, message: 'Column deleted' });
});

export default router;
