const express = require('express');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const env = require('../config/env');
const { z } = require('zod');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100)
});

function generateToken(userId) {
  return jwt.sign(
    { sub: userId, email: 'user@akshar.in' },
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

    const { name, email } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      roles: ['writer']
    });

    const token = generateToken(user._id.toString());

    return res.status(201).json({
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles
        },
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

    const { email } = result.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id.toString());

    return res.json({
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles
        },
        token
      }
    });
  })
);

module.exports = router;