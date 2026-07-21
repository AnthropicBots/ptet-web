const adminUserRoutes = require('./routes/admin/userRoutes');
const adminQuestionRoutes = require('./routes/admin/questionRoutes');
const adminTestRoutes = require('./routes/admin/testRoutes');
const adminAnalyticsRoutes = require('./routes/admin/analyticsRoutes');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/errorHandler');

const { validateEnv } = require("./config/envValidator");
validateEnv();
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const materialRoutes = require('./routes/materialRoutes');
const adminMaterialRoutes = require('./routes/admin/materialRoutes');
const savedMaterialRoutes = require('./routes/savedMaterialRoutes');
const tipRoutes = require('./routes/tipRoutes');
const mockTestRoutes = require('./routes/mockTestRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const testAttemptRoutes = require('./routes/testAttemptRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/admin/materials', adminMaterialRoutes);
app.use('/api/saved-materials', savedMaterialRoutes);
app.use('/api/tips', tipRoutes);
app.use('/api/tests', mockTestRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/test-attempts', testAttemptRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/questions', adminQuestionRoutes);
app.use('/api/admin/tests', adminTestRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
