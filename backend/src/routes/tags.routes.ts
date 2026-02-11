import { Router } from 'express';
import { tagsService } from '../services/tags.service.js';

const router = Router();

// Get all tags (optionally filtered by project)
router.get('/', async (req, res) => {
  const projectId = req.query.project_id as string | undefined;
  const tags = await tagsService.getAll(projectId);
  res.json({ success: true, data: tags });
});

// Get tag by ID
router.get('/:id', async (req, res) => {
  const tag = await tagsService.getById(req.params.id);
  if (!tag) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }
  res.json({ success: true, data: tag });
});

// Create tag
router.post('/', async (req, res) => {
  const { project_id, label, color } = req.body;

  if (!project_id || !label || !color) {
    return res.status(400).json({
      success: false,
      error: 'project_id, label, and color are required',
    });
  }

  try {
    const tag = await tagsService.create({ project_id, label, color });
    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'Tag with this label already exists' });
    }
    throw error;
  }
});

// Update tag
router.patch('/:id', async (req, res) => {
  const tag = await tagsService.update(req.params.id, req.body);
  if (!tag) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }
  res.json({ success: true, data: tag });
});

// Delete tag
router.delete('/:id', async (req, res) => {
  const deleted = await tagsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Tag not found' });
  }
  res.json({ success: true, message: 'Tag deleted' });
});

export default router;
