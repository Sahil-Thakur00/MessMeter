require('dotenv').config();
const mongoose = require('mongoose');
const { Mess } = require('../models');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateJoinCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/seed-mess.js "<name>" <admin1,admin2> [domain]');
    process.exit(1);
  }

  const name = args[0].trim();
  const adminEmails = args[1]
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  const allowedEmailDomain = args[2] ? args[2].trim().toLowerCase() : undefined;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  let joinCode = generateJoinCode();
  // Ensure unique join code
  while (await Mess.findOne({ joinCode })) {
    joinCode = generateJoinCode();
  }

  const mess = await Mess.create({
    name,
    joinCode,
    adminEmails,
    allowedEmailDomain
  });

  console.log('Mess created successfully:');
  console.log(`ID: ${mess._id}`);
  console.log(`Name: ${mess.name}`);
  console.log(`Join Code: ${mess.joinCode}`);
  console.log(`Admins: ${mess.adminEmails.join(', ')}`);
  if (mess.allowedEmailDomain) {
    console.log(`Allowed Domain: ${mess.allowedEmailDomain}`);
  }

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Seed mess failed:', err);
  process.exit(1);
});
