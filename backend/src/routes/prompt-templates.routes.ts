/**
 * Prompt Template Routes
 * API endpoints for managing AI prompt templates with versioning
 */

import { Router, Request, Response } from 'express';
import { promptTemplateService } from '../services/prompt-template.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Admin middleware - only admins can manage prompts
const requireAdmin = (req: Request, res: Response, next: Function) => {
  const userRole = (req as any).user?.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required' }
    });
  }
  next();
};

/**
 * GET /api/v1/prompt-templates
 * List all prompt templates
 */
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { category, activeOnly } = req.query;

    const templates = await promptTemplateService.listTemplates({
      category: category as string,
      activeOnly: activeOnly === 'true'
    });

    res.json({
      success: true,
      data: templates
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error listing templates:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch templates' }
    });
  }
});

/**
 * GET /api/v1/prompt-templates/:id
 * Get prompt template by ID
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await promptTemplateService.getTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { message: 'Template not found' }
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch template' }
    });
  }
});

/**
 * POST /api/v1/prompt-templates
 * Create new prompt template
 */
router.post('/', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, category, content, variables, changeNotes } = req.body;

    if (!name || !category || !content) {
      return res.status(400).json({
        success: false,
        error: { message: 'name, category, and content are required' }
      });
    }

    const userId = (req as any).user?.userId;

    const result = await promptTemplateService.createTemplate({
      name,
      description: description || '',
      category,
      initialContent: content,
      variables: variables || [],
      createdBy: userId,
      changeNotes: changeNotes || 'Initial version'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error creating template:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create template' }
    });
  }
});

/**
 * PATCH /api/v1/prompt-templates/:id
 * Update template metadata (not content)
 */
router.patch('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, isActive } = req.body;

    const template = await promptTemplateService.updateTemplate({
      templateId: id,
      name,
      description,
      category,
      isActive
    });

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error updating template:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to update template' }
    });
  }
});

/**
 * DELETE /api/v1/prompt-templates/:id
 * Delete (deactivate) template
 */
router.delete('/:id', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await promptTemplateService.deleteTemplate(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete template' }
    });
  }
});

/**
 * GET /api/v1/prompt-templates/:id/versions
 * Get all versions of a template
 */
router.get('/:id/versions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const versions = await promptTemplateService.getVersions(id);

    res.json({
      success: true,
      data: versions
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error fetching versions:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch versions' }
    });
  }
});

/**
 * GET /api/v1/prompt-templates/:id/current
 * Get current version of a template
 */
router.get('/:id/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const version = await promptTemplateService.getCurrentVersion(id);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: { message: 'Current version not found' }
      });
    }

    res.json({
      success: true,
      data: version
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error fetching current version:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch current version' }
    });
  }
});

/**
 * POST /api/v1/prompt-templates/:id/versions
 * Create new version of template
 */
router.post('/:id/versions', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, variables, changeNotes, makeCurrent } = req.body;

    if (!content || !changeNotes) {
      return res.status(400).json({
        success: false,
        error: { message: 'content and changeNotes are required' }
      });
    }

    const userId = (req as any).user?.userId;

    const version = await promptTemplateService.createVersion({
      templateId: id,
      content,
      variables: variables || [],
      changeNotes,
      createdBy: userId,
      makeCurrent: makeCurrent !== false
    });

    res.json({
      success: true,
      data: version
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error creating version:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create version' }
    });
  }
});

/**
 * POST /api/v1/prompt-templates/:id/rollback
 * Rollback to a previous version
 */
router.post('/:id/rollback', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;

    if (!versionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'versionId is required' }
      });
    }

    const userId = (req as any).user?.userId;

    await promptTemplateService.rollbackToVersion({
      templateId: id,
      versionId,
      rolledBackBy: userId
    });

    res.json({
      success: true,
      message: 'Template rolled back successfully'
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error rolling back version:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to rollback version' }
    });
  }
});

/**
 * POST /api/v1/prompt-templates/:id/render
 * Render template with variables
 */
router.post('/:id/render', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'variables object is required' }
      });
    }

    // Get current version
    const version = await promptTemplateService.getCurrentVersion(id);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: { message: 'Template version not found' }
      });
    }

    // Render template
    const rendered = promptTemplateService.renderTemplate(version.content, variables);

    res.json({
      success: true,
      data: {
        rendered,
        templateId: id,
        versionId: version.id,
        versionNumber: version.version_number
      }
    });
  } catch (error: any) {
    console.error('[Prompt Templates API] Error rendering template:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to render template' }
    });
  }
});

export default router;
