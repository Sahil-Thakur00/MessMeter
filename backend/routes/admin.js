require('dotenv').config();
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Dish, Menu, Vote } = require('../models');
const { requireAuth, requireAdmin, wrap } = require('../middleware/auth');
const { wilsonLowerBound } = require('../lib/scoring');

// Shared helper: aggregation for vote counts per dish
async function getStats(messId, dishIds) {
  const messObjId = new mongoose.Types.ObjectId(messId);
  const dishObjIds = dishIds.map(id => new mongoose.Types.ObjectId(id));

  const results = await Vote.aggregate([
    { $match: { messId: messObjId, dishId: { $in: dishObjIds } } },
    {
      $group: {
        _id: '$dishId',
        up: { $sum: { $cond: [{ $eq: ['$value', 1] }, 1, 0] } },
        total: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  for (const r of results) {
    map.set(r._id.toString(), { up: r.up, total: r.total });
  }
  return map;
}

// Helper: get current menu for a mess
async function getCurrentMenu(messId) {
  return Menu.findOne({
    messId,
    effectiveFrom: { $lte: new Date() }
  }).sort({ effectiveFrom: -1 });
}

// GET /api/menu — current menu with dish names resolved (any authed user)
router.get('/menu', requireAuth, wrap(async (req, res) => {
  const { messId } = req.user;
  const menu = await getCurrentMenu(messId);
  if (!menu) return res.json({ slots: [] });

  // Gather all dish IDs and resolve names
  const allDishIds = [...new Set(menu.slots.flatMap(s => s.dishIds.map(id => id.toString())))];
  const dishes = await Dish.find({ _id: { $in: allDishIds }, messId }).select('name _id');
  const dishNameMap = new Map(dishes.map(d => [d._id.toString(), d.name]));

  const slots = menu.slots.map(s => ({
    weekday: s.weekday,
    meal: s.meal,
    dishes: s.dishIds.map(id => ({
      dishId: id,
      name: dishNameMap.get(id.toString()) || ''
    }))
  }));

  res.json({ menuId: menu._id, effectiveFrom: menu.effectiveFrom, slots });
}));

// POST /api/admin/menu (admin only)
router.post('/admin/menu', requireAdmin, wrap(async (req, res) => {
  const { messId, userId } = req.user;
  const { effectiveFrom, slots } = req.body;

  if (!Array.isArray(slots) || slots.length === 0) {
    return res.status(400).json({ error: 'slots array is required' });
  }

  const resolvedSlots = [];
  let newDishCount = 0;

  for (const slot of slots) {
    const { weekday, meal, dishNames } = slot;
    if (weekday === undefined || !meal || !Array.isArray(dishNames)) {
      return res.status(400).json({ error: 'Each slot needs weekday, meal, and dishNames[]' });
    }

    const dishIds = [];
    for (const rawName of dishNames) {
      const name = rawName.trim();
      const nameKey = name.toLowerCase().replace(/\s+/g, ' ').trim();

      let dish = await Dish.findOne({ messId, nameKey });
      if (!dish) {
        dish = await Dish.create({ messId, name, nameKey });
        newDishCount++;
      }
      dishIds.push(dish._id);
    }

    resolvedSlots.push({ weekday, meal, dishIds });
  }

  const menu = await require('../models').Menu.create({
    messId,
    effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    createdBy: userId,
    slots: resolvedSlots
  });

  res.status(201).json({
    menuId: menu._id,
    slotsCreated: resolvedSlots.length,
    newDishesCreated: newDishCount
  });
}));

// GET /api/admin/dishes/suggest?q= (admin only)
router.get('/admin/dishes/suggest', requireAdmin, wrap(async (req, res) => {
  const { messId } = req.user;
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  // Escape regex special chars
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const dishes = await Dish.find({ messId, nameKey: { $regex: regex } })
    .select('name nameKey')
    .limit(8);

  res.json(dishes.map(d => ({ dishId: d._id, name: d.name })));
}));

module.exports = { router, getStats, getCurrentMenu };
