require('dotenv').config();
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { Mess, User } = require('../models');
const { wrap } = require('../middleware/auth');

const client = new OAuth2Client();

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), messId: user.messId.toString(), role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

async function loginOrCreate(email, name, joinCode) {
  let user = await User.findOne({ email });

  if (user) return user;

  // New user: joinCode required
  if (!joinCode) {
    const err = new Error('joinCode is required to join a mess');
    err.status = 400;
    throw err;
  }

  const mess = await Mess.findOne({ joinCode: joinCode.toUpperCase() });
  if (!mess) {
    const err = new Error('Invalid join code');
    err.status = 400;
    throw err;
  }

  const role = mess.adminEmails.includes(email) ? 'admin' : 'student';

  user = await User.create({ email, name, messId: mess._id, role });
  return user;
}

// POST /api/auth/dev
router.post('/dev', wrap(async (req, res) => {
  if (process.env.DEV_AUTH !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { email, name, joinCode } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const user = await loginOrCreate(email.toLowerCase().trim(), name || email, joinCode);
  const token = signToken(user);
  setCookie(res, token);
  res.json({ userId: user._id, email: user.email, name: user.name, role: user.role });
}));

// POST /api/auth/google
router.post('/google', wrap(async (req, res) => {
  const { credential, joinCode } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential is required' });

  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  const email = payload.email.toLowerCase().trim();
  const name = payload.name || email;

  // Check allowedEmailDomain for new users only
  const existingUser = await User.findOne({ email });
  if (!existingUser && joinCode) {
    const mess = await Mess.findOne({ joinCode: joinCode.toUpperCase() });
    if (mess && mess.allowedEmailDomain) {
      const domain = email.split('@')[1];
      if (domain !== mess.allowedEmailDomain) {
        return res.status(403).json({ error: `Only @${mess.allowedEmailDomain} emails are allowed` });
      }
    }
  }

  const user = await loginOrCreate(email, name, joinCode);
  const token = signToken(user);
  setCookie(res, token);
  res.json({ userId: user._id, email: user.email, name: user.name, role: user.role });
}));

// GET /api/auth/me
router.get('/me', wrap(async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await User.findById(payload.userId).select('email name role messId');
  if (!user) return res.status(401).json({ error: 'User not found' });

  res.json({ userId: user._id, email: user.email, name: user.name, role: user.role, messId: user.messId });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out' });
});

module.exports = router;
