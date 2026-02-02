import { Router } from 'express';
import { teamsService } from '../services/teams.service.js';

const router = Router();

// Get all teams
router.get('/', (req, res) => {
  const teams = teamsService.getAll();
  res.json({ success: true, data: teams });
});

// Get team by ID
router.get('/:id', (req, res) => {
  const team = teamsService.getById(req.params.id);
  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, data: team });
});

// Create team
router.post('/', (req, res) => {
  const { name, description, avatar_url, organization_id, member_ids } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Team name is required',
    });
  }

  const team = teamsService.create({ name, description, avatar_url, organization_id, member_ids });
  res.status(201).json({ success: true, data: team });
});

// Update team
router.patch('/:id', (req, res) => {
  const team = teamsService.update(req.params.id, req.body);
  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, data: team });
});

// Delete team
router.delete('/:id', (req, res) => {
  const deleted = teamsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, message: 'Team deleted' });
});

// --- Member Management ---

// Get team members
router.get('/:teamId/members', (req, res) => {
  const members = teamsService.getMembers(req.params.teamId);
  res.json({ success: true, data: members });
});

// Add member to team
router.post('/:teamId/members', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const member = teamsService.addMember(req.params.teamId, user_id);
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.status(201).json({ success: true, data: member });
});

// Remove member from team
router.delete('/:teamId/members/:userId', (req, res) => {
  const removed = teamsService.removeMember(req.params.teamId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

// Set all team members (replace)
router.put('/:teamId/members', (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids)) {
    return res.status(400).json({ success: false, error: 'user_ids must be an array' });
  }

  teamsService.setMembers(req.params.teamId, user_ids);
  res.json({ success: true, message: 'Members updated' });
});

// --- Project Management ---

// Add project to team
router.post('/:teamId/projects', (req, res) => {
  const { project_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ success: false, error: 'project_id is required' });
  }

  const teamProject = teamsService.addProject(req.params.teamId, project_id);
  if (!teamProject) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.status(201).json({ success: true, data: teamProject });
});

// Remove project from team
router.delete('/:teamId/projects/:projectId', (req, res) => {
  const removed = teamsService.removeProject(req.params.teamId, req.params.projectId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Project not found in team' });
  }
  res.json({ success: true, message: 'Project removed from team' });
});

export default router;
