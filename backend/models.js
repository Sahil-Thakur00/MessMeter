const mongoose = require('mongoose');

const messSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  joinCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  allowedEmailDomain: { type: String, lowercase: true, trim: true },
  adminEmails: [{ type: String, lowercase: true, trim: true }],
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, trim: true },
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
});

const dishSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
  name: { type: String, required: true, trim: true },
  nameKey: { type: String, required: true, lowercase: true, trim: true }
});
dishSchema.index({ messId: 1, nameKey: 1 }, { unique: true });

const menuSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
  effectiveFrom: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  slots: [
    {
      weekday: { type: Number, required: true }, // 0=Sun..6=Sat in MESS_TZ
      meal: { type: String, required: true, enum: ['breakfast', 'lunch', 'snacks', 'dinner'] },
      dishIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dish' }]
    }
  ]
});
menuSchema.index({ messId: 1, effectiveFrom: -1 });

const voteSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mess', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dish', required: true },
  value: { type: Number, required: true, enum: [1, -1] },
  updatedAt: { type: Date, default: Date.now }
});
voteSchema.index({ messId: 1, userId: 1, dishId: 1 }, { unique: true });
voteSchema.index({ messId: 1, dishId: 1 });

function normalizeNameKey(name) {
  return (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

module.exports = {
  Mess: mongoose.model('Mess', messSchema),
  User: mongoose.model('User', userSchema),
  Dish: mongoose.model('Dish', dishSchema),
  Menu: mongoose.model('Menu', menuSchema),
  Vote: mongoose.model('Vote', voteSchema),
  normalizeNameKey
};
