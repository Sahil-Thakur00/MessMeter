require('dotenv').config();
const mongoose = require('mongoose');
const { Mess, User, Dish, Menu, Vote, normalizeNameKey } = require('../models');

const DISH_NAMES = [
  'Paneer Butter Masala',
  'Dal Makhani',
  'Aloo Gobi',
  'Rajma Chawal',
  'Chole Bhature',
  'Masala Dosa',
  'Idli Sambar',
  'Poha',
  'Upma',
  'Aloo Paratha',
  'Veg Biryani',
  'Gulab Jamun',
  'Kadhi Pakora',
  'Bhindi Masala',
  'Palak Paneer',
  'Mix Veg',
  'Jeera Rice',
  'Tawa Roti',
  'Poori Bhaji',
  'Samosa',
  'Pav Bhaji',
  'Lauki Sabzi',
  'Tinda Masala',
  'Karela Fry',
  'Bread Butter Jam'
];

// Target approval rates for varied verdicts
const DISH_RATINGS_PROFILE = {
  'Paneer Butter Masala': 0.95,
  'Veg Biryani': 0.92,
  'Chole Bhature': 0.90,
  'Masala Dosa': 0.88,
  'Gulab Jamun': 0.92,
  'Pav Bhaji': 0.85,
  'Aloo Paratha': 0.82,
  'Poori Bhaji': 0.80,
  'Idli Sambar': 0.75,
  'Dal Makhani': 0.65,
  'Rajma Chawal': 0.60,
  'Samosa': 0.70,
  'Kadhi Pakora': 0.50,
  'Jeera Rice': 0.55,
  'Tawa Roti': 0.50,
  'Poha': 0.48,
  'Aloo Gobi': 0.45,
  'Bhindi Masala': 0.42,
  'Palak Paneer': 0.52,
  'Mix Veg': 0.40,
  'Bread Butter Jam': 0.45,
  'Upma': 0.35,
  'Lauki Sabzi': 0.10,
  'Tinda Masala': 0.12,
  'Karela Fry': 0.08
};

async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  // 1. Upsert Demo Mess
  let mess = await Mess.findOne({ joinCode: 'DEMO01' });
  if (!mess) {
    mess = await Mess.create({
      name: 'Demo Mess',
      joinCode: 'DEMO01',
      adminEmails: ['dev@example.com'],
      allowedEmailDomain: undefined
    });
  } else {
    mess.name = 'Demo Mess';
    mess.adminEmails = ['dev@example.com'];
    await mess.save();
  }

  const messId = mess._id;

  // 2. Upsert Admin User and 12 Fake Student Users
  const adminUser = await User.findOneAndUpdate(
    { email: 'dev@example.com' },
    {
      name: 'Dev Admin',
      email: 'dev@example.com',
      messId,
      role: 'admin'
    },
    { upsert: true, new: true }
  );

  const demoUsers = [];
  for (let i = 1; i <= 12; i++) {
    const user = await User.findOneAndUpdate(
      { email: `demo${i}@example.com` },
      {
        name: `Student ${i}`,
        email: `demo${i}@example.com`,
        messId,
        role: 'student'
      },
      { upsert: true, new: true }
    );
    demoUsers.push(user);
  }

  // 3. Upsert 25 Dishes
  const dishMap = new Map();
  for (const name of DISH_NAMES) {
    const nameKey = normalizeNameKey(name);
    const dish = await Dish.findOneAndUpdate(
      { messId, nameKey },
      { name, nameKey, messId },
      { upsert: true, new: true }
    );
    dishMap.set(name, dish);
  }

  // 4. Construct 7x4 Weekly Menu Slots
  const meals = ['breakfast', 'lunch', 'snacks', 'dinner'];
  const slots = [];

  // Deterministic dish assignment for each weekday (0..6) and meal
  const mealDishPools = {
    breakfast: [
      ['Masala Dosa', 'Idli Sambar'],
      ['Poha', 'Bread Butter Jam'],
      ['Aloo Paratha', 'Tawa Roti'],
      ['Poori Bhaji', 'Poha'],
      ['Upma', 'Idli Sambar'],
      ['Masala Dosa', 'Bread Butter Jam'],
      ['Aloo Paratha', 'Poori Bhaji']
    ],
    lunch: [
      ['Rajma Chawal', 'Aloo Gobi', 'Tawa Roti'],
      ['Lauki Sabzi', 'Dal Makhani', 'Jeera Rice', 'Tawa Roti'],
      ['Kadhi Pakora', 'Mix Veg', 'Jeera Rice'],
      ['Chole Bhature', 'Jeera Rice', 'Gulab Jamun'],
      ['Karela Fry', 'Dal Makhani', 'Tawa Roti'],
      ['Paneer Butter Masala', 'Jeera Rice', 'Tawa Roti'],
      ['Tinda Masala', 'Aloo Gobi', 'Jeera Rice']
    ],
    snacks: [
      ['Samosa'],
      ['Bread Butter Jam'],
      ['Pav Bhaji'],
      ['Samosa'],
      ['Upma'],
      ['Pav Bhaji'],
      ['Samosa']
    ],
    dinner: [
      ['Paneer Butter Masala', 'Tawa Roti', 'Gulab Jamun'],
      ['Bhindi Masala', 'Dal Makhani', 'Tawa Roti'],
      ['Veg Biryani', 'Mix Veg'],
      ['Palak Paneer', 'Jeera Rice', 'Tawa Roti'],
      ['Aloo Gobi', 'Dal Makhani', 'Tawa Roti'],
      ['Veg Biryani', 'Gulab Jamun'],
      ['Kadhi Pakora', 'Jeera Rice', 'Tawa Roti']
    ]
  };

  for (let weekday = 0; weekday <= 6; weekday++) {
    for (const meal of meals) {
      const dishNames = mealDishPools[meal][weekday];
      const dishIds = dishNames.map(name => dishMap.get(name)._id);
      slots.push({
        weekday,
        meal,
        dishIds
      });
    }
  }

  // Clear existing demo menus for this mess and insert current menu
  await Menu.deleteMany({ messId });
  const menu = await Menu.create({
    messId,
    effectiveFrom: new Date(Date.now() - 60000), // 1 minute ago so it's current
    createdBy: adminUser._id,
    slots
  });

  // 5. Seed Votes (idempotent: delete existing demo votes for this mess, recreate)
  await Vote.deleteMany({ messId });
  const votesToInsert = [];

  for (const [name, targetApproval] of Object.entries(DISH_RATINGS_PROFILE)) {
    const dish = dishMap.get(name);
    if (!dish) continue;

    // Between 7 to 12 users vote on each dish
    const votersCount = 7 + (Math.abs(name.length * 7) % 6); // 7..12 voters
    for (let u = 0; u < votersCount; u++) {
      const user = demoUsers[u];
      // Pseudo-random deterministic choice based on user index and approval profile
      const pseudoVal = ((u * 17 + name.length * 13) % 100) / 100;
      const isUp = pseudoVal < targetApproval;
      votesToInsert.push({
        messId,
        userId: user._id,
        dishId: dish._id,
        value: isUp ? 1 : -1,
        updatedAt: new Date()
      });
    }
  }

  await Vote.insertMany(votesToInsert);

  console.log('--- Demo Mess Seeding Complete ---');
  console.log(`Mess: Demo Mess (Join Code: DEMO01, ID: ${messId})`);
  console.log(`Admin: dev@example.com (ID: ${adminUser._id})`);
  console.log(`Dishes: ${dishMap.size} upserted`);
  console.log(`Menu slots: ${slots.length} (7 days x 4 meals)`);
  console.log(`Votes: ${votesToInsert.length} votes recorded across 12 demo users`);

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Demo seed error:', err);
  process.exit(1);
});
