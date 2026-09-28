require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const { Dish, Vote } = require('../models');
const { requireAuth, wrap } = require('../middleware/auth');
const { mealVerdict, wilsonLowerBound } = require('../lib/scoring');
const { weekdayInTz, dateInTz } = require('../lib/time');
const { getStats, getCurrentMenu } = require('./admin');
const { MESS_TZ } = require('../config');

const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.userId || req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many requests, slow down' })
});

// GET /api/today
router.get('/today', requireAuth, wrap(async (req, res) => {
  const { messId, userId } = req.user;
  const now = new Date();
  const todayDate = dateInTz(now, MESS_TZ);
  const todayWeekday = weekdayInTz(now, MESS_TZ);

  const menu = await getCurrentMenu(messId);
  if (!menu) return res.json({ date: todayDate, meals: [] });

  const todaySlots = menu.slots.filter(s => s.weekday === todayWeekday);

  const allDishIds = [...new Set(todaySlots.flatMap(s => s.dishIds.map(id => id.toString())))];
  if (allDishIds.length === 0) return res.json({ date: todayDate, meals: [] });

  const statsMap = await getStats(messId, allDishIds);

  // Get caller's own votes for today's dishes
  const myVotes = await Vote.find({
    messId,
    userId,
    dishId: { $in: allDishIds }
  }).select('dishId value');
  const myVoteMap = new Map(myVotes.map(v => [v.dishId.toString(), v.value]));

  // Resolve dish names
  const dishes = await Dish.find({ _id: { $in: allDishIds }, messId }).select('name _id');
  const dishNameMap = new Map(dishes.map(d => [d._id.toString(), d.name]));

  const meals = [];
  const mealOrder = ['breakfast', 'lunch', 'snacks', 'dinner'];

  for (const meal of mealOrder) {
    const slot = todaySlots.find(s => s.meal === meal);
    if (!slot) continue;

    const dishRows = slot.dishIds.map(id => {
      const idStr = id.toString();
      const stats = statsMap.get(idStr) || { up: 0, total: 0 };
      return {
        dishId: id,
        name: dishNameMap.get(idStr) || '',
        up: stats.up,
        total: stats.total,
        myVote: myVoteMap.get(idStr) || 0
      };
    });

    const dishStats = dishRows.map(d => ({ name: d.name, up: d.up, total: d.total }));
    const verdict = mealVerdict(dishStats);

    meals.push({ meal, dishes: dishRows, verdict });
  }

  res.json({ date: todayDate, meals });
}));

// GET /api/onboarding
router.get('/onboarding', requireAuth, wrap(async (req, res) => {
  const { messId, userId } = req.user;

  const menu = await getCurrentMenu(messId);
  if (!menu) return res.json([]);

  const allDishIds = [...new Set(menu.slots.flatMap(s => s.dishIds.map(id => id.toString())))];

  const myVotes = await Vote.find({ messId, userId }).select('dishId');
  const votedIds = new Set(myVotes.map(v => v.dishId.toString()));

  const unvotedIds = allDishIds.filter(id => !votedIds.has(id));
  const dishes = await Dish.find({ _id: { $in: unvotedIds }, messId }).select('name _id');

  res.json(dishes.map(d => ({ dishId: d._id, name: d.name })));
}));

// GET /api/dishes?sort=score
router.get('/dishes', requireAuth, wrap(async (req, res) => {
  const { messId, userId } = req.user;

  const menu = await getCurrentMenu(messId);
  if (!menu) return res.json([]);

  const allDishIds = [...new Set(menu.slots.flatMap(s => s.dishIds.map(id => id.toString())))];
  const dishes = await Dish.find({ _id: { $in: allDishIds }, messId }).select('name _id');

  const statsMap = await getStats(messId, allDishIds);
  const myVotes = await Vote.find({ messId, userId, dishId: { $in: allDishIds } }).select('dishId value');
  const myVoteMap = new Map(myVotes.map(v => [v.dishId.toString(), v.value]));

  const { MIN_VOTES } = require('../config');

  const result = dishes.map(d => {
    const idStr = d._id.toString();
    const stats = statsMap.get(idStr) || { up: 0, total: 0 };
    const rated = stats.total >= MIN_VOTES;
    const score = rated ? wilsonLowerBound(stats.up, stats.total) : null;
    return {
      dishId: d._id,
      name: d.name,
      up: stats.up,
      total: stats.total,
      score,
      rated,
      myVote: myVoteMap.get(idStr) || 0
    };
  });

  // Sort: rated first by wilson desc, unrated at end
  result.sort((a, b) => {
    if (a.rated && !b.rated) return -1;
    if (!a.rated && b.rated) return 1;
    if (a.rated && b.rated) return b.score - a.score;
    return 0;
  });

  res.json(result);
}));

// PUT /api/votes/:dishId — vote, flip, or delete (value 0)
router.put('/votes/:dishId', requireAuth, voteLimiter, wrap(async (req, res) => {
  const { messId, userId } = req.user;
  const { dishId } = req.params;
  const { value } = req.body;

  if (![1, -1, 0].includes(value)) {
    return res.status(400).json({ error: 'value must be 1, -1, or 0' });
  }

  // Verify dish belongs to caller's mess
  let dishObjId;
  try {
    dishObjId = new mongoose.Types.ObjectId(dishId);
  } catch {
    return res.status(404).json({ error: 'Dish not found' });
  }

  const dish = await Dish.findOne({ _id: dishObjId, messId });
  if (!dish) return res.status(404).json({ error: 'Dish not found in your mess' });

  if (value === 0) {
    await Vote.deleteOne({ messId, userId, dishId: dishObjId });
  } else {
    await Vote.findOneAndUpdate(
      { messId, userId, dishId: dishObjId },
      { value, updatedAt: new Date() },
      { upsert: true }
    );
  }

  const statsMap = await getStats(messId, [dishId]);
  const stats = statsMap.get(dishId) || { up: 0, total: 0 };
  const myVote = value === 0 ? 0 : value;

  res.json({ up: stats.up, total: stats.total, myVote });
}));

module.exports = router;
