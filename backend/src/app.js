const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const env = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const contentRoutes = require('./routes/contentRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = (env.CORS_ORIGIN || '*')
        .split(',')
        .map((o) => o.trim());
      if (allowed.includes('*') || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
