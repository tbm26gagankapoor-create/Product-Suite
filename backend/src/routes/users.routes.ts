import { Router } from 'express';
import { usersService } from '../services/users.service.js';

const router = Router();

// Get all users
router.get('/', (req, res) => {
  const users = usersService.getAll();
  res.json({ success: true, data: users });
});

// Get user by ID
router.get('/:id', (req, res) => {
  const user = usersService.getById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

// Create user
router.post('/', (req, res) => {
  const { name, email, password, avatar_url, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required',
    });
  }

  try {
    const user = usersService.create({ name, email, password, avatar_url, role });
    res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    throw error;
  }
});

// Update user
router.patch('/:id', (req, res) => {
  const user = usersService.update(req.params.id, req.body);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

// Delete user
router.delete('/:id', (req, res) => {
  const deleted = usersService.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, message: 'User deleted' });
});

export default router;
