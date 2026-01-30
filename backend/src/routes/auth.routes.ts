import { Router } from 'express';
import { authService } from '../services/auth.service.js';

const router = Router();

// POST /auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and name are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    const result = await authService.register({ email, password, name });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

// POST /auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await authService.login({ email, password });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: error.message || 'Invalid credentials',
    });
  }
});

// GET /auth/me - Get current user (requires token)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const jwt = await import('jsonwebtoken');
    const { config } = await import('../config/index.js');

    const decoded = jwt.default.verify(token, config.jwt.secret) as { userId: string };
    const user = await authService.getProfile(decoded.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
});

export default router;
