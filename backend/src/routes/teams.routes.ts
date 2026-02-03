import { Router, Response } from 'express';
import { teamsService } from '../services/teams.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import database from '../lib/database.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all teams (filtered by user's organizations)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { member_id } = req.query;

  // If no user, return empty list
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  // If member_id filter is provided, get teams where that user is a member
  if (member_id) {
    const teams = await teamsService.getTeamsForUser(member_id as string);
    return res.json({ success: true, data: teams });
  }

  // Get user's organization memberships
  const memberships = await database.findMany<any>('organization_members', { user_id: user.id });
  const userOrgIds = new Set(memberships.map((m: any) => m.organization_id));

  // Get all teams
  const allTeams = await teamsService.getAll();

  // Filter teams by organization or where user is a team member
  const teams = allTeams.filter(team =>
    (team.organization_id && userOrgIds.has(team.organization_id)) ||
    team.members.includes(user.id)
  );

  res.json({ success: true, data: teams });
});

// Get team by ID
router.get('/:id', async (req, res) => {
  const team = await teamsService.getById(req.params.id);
  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, data: team });
});

// Create team
router.post('/', async (req, res) => {
  const { name, description, avatar_url, organization_id, member_ids } = req.body;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: 'Team name is required',
    });
  }

  const team = await teamsService.create({ name, description, avatar_url, organization_id, member_ids });
  res.status(201).json({ success: true, data: team });
});

// Update team
router.patch('/:id', async (req, res) => {
  const team = await teamsService.update(req.params.id, req.body);
  if (!team) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, data: team });
});

// Delete team
router.delete('/:id', async (req, res) => {
  const deleted = await teamsService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.json({ success: true, message: 'Team deleted' });
});

// --- Member Management ---

// Get team members
router.get('/:teamId/members', async (req, res) => {
  const members = await teamsService.getMembers(req.params.teamId);
  res.json({ success: true, data: members });
});

// Add member to team
router.post('/:teamId/members', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ success: false, error: 'user_id is required' });
  }

  const member = await teamsService.addMember(req.params.teamId, user_id);
  if (!member) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.status(201).json({ success: true, data: member });
});

// Remove member from team
router.delete('/:teamId/members/:userId', async (req, res) => {
  const removed = await teamsService.removeMember(req.params.teamId, req.params.userId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }
  res.json({ success: true, message: 'Member removed' });
});

// Set all team members (replace)
router.put('/:teamId/members', async (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids)) {
    return res.status(400).json({ success: false, error: 'user_ids must be an array' });
  }

  await teamsService.setMembers(req.params.teamId, user_ids);
  res.json({ success: true, message: 'Members updated' });
});

// --- Project Management ---

// Add project to team
router.post('/:teamId/projects', async (req, res) => {
  const { project_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ success: false, error: 'project_id is required' });
  }

  const teamProject = await teamsService.addProject(req.params.teamId, project_id);
  if (!teamProject) {
    return res.status(404).json({ success: false, error: 'Team not found' });
  }
  res.status(201).json({ success: true, data: teamProject });
});

// Remove project from team
router.delete('/:teamId/projects/:projectId', async (req, res) => {
  const removed = await teamsService.removeProject(req.params.teamId, req.params.projectId);
  if (!removed) {
    return res.status(404).json({ success: false, error: 'Project not found in team' });
  }
  res.json({ success: true, message: 'Project removed from team' });
});

export default router;
