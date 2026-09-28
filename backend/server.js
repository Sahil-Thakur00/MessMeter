require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const { router: adminRoutes } = require('./routes/admin');

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString()
  });
});

// Mount routes under /api
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', studentRoutes);

// Central error-handling middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Serve React SPA in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (require.main === module) {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment variables');
    process.exit(1);
  }

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      // Ensure indexes are built
      const { Mess, User, Dish, Menu, Vote } = require('./models');
      await Promise.all([
        Mess.init(),
        User.init(),
        Dish.init(),
        Menu.init(),
        Vote.init()
      ]);
      console.log('Database indexes synchronized');

      app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('Failed to connect to MongoDB:', err);
      process.exit(1);
    });
}

module.exports = app;
