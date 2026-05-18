const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const env = require('../config/env');
const { z } = require('zod');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(['writer', 'reader']).optional().default('writer')
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
});

function generateToken(userId, role) {
  return jwt.sign(
    { sub: userId, role },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten()
      });
    }

    const { name, email, password, role } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({ name, email, passwordHash, role });

    const token = generateToken(user._id.toString(), user.role);

    return res.status(201).json({
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        token
      }
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten()
      });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id.toString(), user.role);

    return res.json({
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        token
      }
    });
  })
);

module.exports = router;